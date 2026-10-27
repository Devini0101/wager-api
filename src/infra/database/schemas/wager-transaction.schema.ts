import { EntitySchema } from "@mikro-orm/core";
import { WagerTransaction } from "../../../domain/entities/wager-transaction.entity";
import { MoneyType } from "./wallet.schema";

export const WagerTransactionSchema = new EntitySchema<WagerTransaction>({
    class: WagerTransaction as any,
    tableName: 'wager_transactions',
    //uses rehydrate
    forceConstructor: false,
    properties: {
        id: { type: 'uuid', primary: true },
        providerId: { type: 'string', fieldName: 'provider_id' },
        externalTransactionId: { type: 'string', fieldName: 'external_transaction_id' },
        idempotencyKey: { type: 'string', fieldName: 'idempotency_key' },
        payloadHash: { type: 'string', fieldName: 'payload_hash' },
        walletId: { type: 'uuid', fieldName: 'wallet_id' },
        playerId: { type: 'string', fieldName: 'player_id' },
        roundId: { type: 'string', fieldName: 'round_id' },
        gameId: { type: 'string', fieldName: 'game_id' },
        kind: { type: 'string' },
        currency: { type: 'string' },
        money: { type: 'string', fieldName: 'amount', customType: new MoneyType() },
        referenceExternalTransactionId: { type: 'string', fieldName: 'reference_external_transaction_id', nullable: true },
        _referenceTransactionId: { type: 'uuid', fieldName: 'reference_transaction_id', nullable: true },
        _status: { type: 'string', fieldName: 'status' },
        _failureCode: { type: 'string', fieldName: 'failure_code', nullable: true },
        createdAt: { type: 'Date', fieldName: 'created_at' },
        _processedAt: { type: 'Date', fieldName: 'processed_at', nullable: true },
    } as any,
})