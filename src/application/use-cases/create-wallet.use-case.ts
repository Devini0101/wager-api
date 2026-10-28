import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager, LockMode, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Wallet } from '../../domain/entities/wallet.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { WagerTransaction, WagerTransactionKind } from '../../domain/entities/wager-transaction.entity';
import { LedgerDirection, WalletLedgerEntry } from '../../domain/entities/wallet-ledger-entry.entity';
import { v4 as uuidv4 } from 'uuid';
import { ProcessWagerCommand } from './process-wager.use-case';
import { InboxMessage } from '../../domain/entities/inbox-message.entity';
import { OutboxMessage } from '../../domain/entities/outbox-message.entity';

@Injectable()
export class CreateWalletUseCase {
    constructor(private readonly em: EntityManager) {}

        async execute(playerId: string, initialBalanceDto: { amount: string; currency: string }): Promise<Wallet> {
            // Main database transaction
            try {
                return await this.em.transactional<Wallet>(async (txEm) => {
                    const money = Money.from(initialBalanceDto);
                    const walletId = uuidv4();

                    //instantiate wallet
                    const wallet = Wallet.open({ id: walletId, playerId, initialBalance: money });
                    txEm.persist(wallet);
                    
                    //persists wallet
                    await txEm.flush(); 

                    //if theres inital balance, stores it in wager entrie and on ledger
                    if (money.isPositive()) {
                        const openingTransactionId = uuidv4(); 

                        const wagerTx = WagerTransaction.create({
                            id: openingTransactionId,
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

                        await txEm.flush();

                        const ledgerEntry = WalletLedgerEntry.create({
                            id: uuidv4(),
                            walletId: wallet.id,
                            transactionId: openingTransactionId, 
                            direction: LedgerDirection.Credit,
                            money: money,
                            balanceBefore: Money.zero(money.currency),
                            balanceAfter: wallet.balance,
                            createdAt: new Date(),
                        });
                        txEm.persist(ledgerEntry);
                    }

                    return wallet;
                });
            } catch (error) {
                if (error instanceof UniqueConstraintViolationException) {
                    throw new ConflictException(`Wallet already exists for player ${playerId} with this currency`);
                }
                throw error;
            }
        }
}