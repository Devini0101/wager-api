import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Wallet } from '../../domain/entities/wallet.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { WagerTransaction, WagerTransactionKind } from '../../domain/entities/wager-transaction.entity';
import { WalletLedgerEntry } from '../../domain/entities/wallet-ledger-entry.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CreateWalletUseCase {
    constructor(private readonly em: EntityManager) {}

    async execute(playerId: string, initialBalanceDto: { amount: string; currency: string }): Promise<Wallet> {
        try {
            return await this.em.transactional<Wallet>(async (txEm) => {
                const money = Money.from(initialBalanceDto);
                const walletId = uuidv4();
                const wallet = Wallet.open({ id: walletId, playerId, initialBalance: money });
                txEm.persist(wallet);

                // balance > 0, creates history of the opening deposit (OPENING)
                if (money.isPositive()) {
                    const txId = uuidv4();
                    const wagerTx = WagerTransaction.create({
                        id: txId,
                        providerId: 'INTERNAL',
                        externalTransactionId: `OPEN-${walletId}`,
                        idempotencyKey: `OPEN-${walletId}`,
                        payloadHash: 'OPENING',
                        walletId: wallet.id,
                        playerId: wallet.playerId,
                        roundId: 'NONE',
                        gameId: 'NONE',
                        kind: WagerTransactionKind.Opening,
                        money: money,
                    });
                    wagerTx.markProcessed(undefined, new Date());
                    txEm.persist(wagerTx);

                    const ledgerEntry = WalletLedgerEntry.create({
                        id: uuidv4(),
                        walletId: wallet.id,
                        transactionId: wagerTx.id,
                        direction: wagerTx.ledgerDirectionFor(),
                        money: money,
                        balanceBefore: Money.zero(money.currency),
                        balanceAfter: wallet.balance,
                    });
                    txEm.persist(ledgerEntry);
                }

                return wallet as unknown as Wallet;
            });
        } catch (error) {
            // O escudo do banco interceptando duplicidade de playerId + currency
            if (error instanceof UniqueConstraintViolationException) {
                throw new ConflictException(`Wallet already exists for player ${playerId} with this currency`);
            }
            throw error;
        }
    }
}