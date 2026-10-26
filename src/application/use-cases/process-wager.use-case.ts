import { Injectable } from "@nestjs/common";
import { CreateWagerTransactionProps, WagerTransaction, WagerTransactionKind } from "../../domain/entities/wager-transaction.entity";
import { EntityManager, LockMode, UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { InboxMessage } from "../../domain/entities/inbox-message.entity";
import { Wallet } from "../../domain/entities/wallet.entity";
import { WalletLedgerEntry } from "../../domain/entities/wallet-ledger-entry.entity";
import { OutboxMessage } from "../../domain/entities/outbox-message.entity";
import { v4 as uuidv4 } from 'uuid';

export interface ProcessWagerCommand {
    messageId?: string; // Vem preenchido se a origem for SQS
    consumerName?: string;
    providerId: string;
    externalTransactionId: string;
    idempotencyKey: string;
    payloadHash: string;
    walletId: string;
    playerId: string;
    roundId: string;
    gameId: string;
    kind: WagerTransactionKind;
    money: CreateWagerTransactionProps['money'];
    referenceExternalTransactionId?: string;
}

@Injectable()
export class ProcessWagerUseCase {
    constructor(private readonly em: EntityManager) {}

    async execute(command: ProcessWagerCommand): Promise<WagerTransaction> {
        // main database transaction
        return this.em.transactional<WagerTransaction>(async (txEm): Promise<WagerTransaction> => {
            if (command.messageId && command.consumerName) {
                const inbox = InboxMessage.receive({
                messageId: command.messageId,
                consumerName: command.consumerName,
                payloadHash: command.payloadHash,
            });

            try {
                txEm.persist(inbox);
                await txEm.flush(); //try persist, if fails it is a queue replay
            } catch (error) {
                if (error instanceof UniqueConstraintViolationException) {
                    const existingTx = await txEm.findOne(WagerTransaction, {
                        providerId: command.providerId,
                        externalTransactionId: command.externalTransactionId
                    });
                    if (!existingTx) throw new Error("Inbox replay mismatch");
                    return existingTx as unknown as WagerTransaction;;
                }
                throw error
            }

            //verifies idempotency
            const existingTx = await txEm.findOne(WagerTransaction, {
                providerId: command.providerId,
                idempotencyKey: command.idempotencyKey,
            });

            if (existingTx) {
                if (!existingTx.matchesPayload(command.payloadHash)){
                    // diff payload for the same key, HTTP 409
                    throw new Error('IDEMPOTENCY_PAYLOAD_MISMATCH');
                }
                return existingTx as unknown as WagerTransaction;
            }

            //searches wallet w pessimistic look
            const wallet = await txEm.findOne(Wallet,
                { id: command.walletId, playerId: command.playerId },
                { lockMode: LockMode.PESSIMISTIC_WRITE }
            );

            if (!wallet) throw new Error('Wallet not found');

            // insantiate bussiness tx
            const wagerTx = WagerTransaction.create({id: uuidv4(), ...command,});
            txEm.persist(wagerTx);

            const balanceBefore = wallet.balance;

            try {
                if (command.kind === WagerTransactionKind.Bet) {
                    wallet.debit(command.money);
                } else if (command.kind === WagerTransactionKind.Win) {
                    wallet.credit(command.money);
                }
                // TODO Lógica de Refund/Rollback exige buscar a referência, fica para refinamento depois
                wagerTx.markProcessed(undefined, new Date());
            } catch (domainError: any) {
                // if not enough balance, marks as REJECTED and finishes
                wagerTx.reject(domainError.message); // Failure mapped to FailureCode
                // do not needs an update as nothing effectivelly changed
                return wagerTx as unknown as WagerTransaction;
            }

            txEm.persist(wallet);

            // creates ledger for later balance and history reproduction
            if (wagerTx.affectsBalance()) {
                const ledgerEntry = WalletLedgerEntry.create({
                    id : uuidv4(),
                    walletId: wallet.id,
                    transactionId: wagerTx.id,
                    direction: wagerTx.ledgerDirectionFor(),
                    money: wagerTx.money,
                    balanceBefore: balanceBefore,
                    balanceAfter: wallet.balance
                });
                txEm.persist(ledgerEntry);

                //Outbox event always ACID on the same SQL tx
                const outboxEvent = OutboxMessage.enqueue({
                    eventId: uuidv4(),
                    aggregateId: wallet.id,
                    eventType: 'WalletBalanceChanged',
                    occurredAt: new Date(),
                    version: 1,
                    correlationId: wagerTx.idempotencyKey,
                    data: {
                        walletId: wallet.id,
                        transactionId: wagerTx.id,
                        direction: ledgerEntry.direction,
                        money: ledgerEntry.money.toJSON(),
                        balanceBefore: balanceBefore.toJSON(),
                        balanceAfter: wallet.balance.toJSON(),
                        walletVersion: wallet.version,
                    }
                } as any);
                txEm.persist(outboxEvent);
            }

            return wagerTx as unknown as WagerTransaction;
        }});
    }
}