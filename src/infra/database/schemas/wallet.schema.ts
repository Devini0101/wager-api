// src/infra/database/schemas/wallet.schema.ts
import { EntitySchema, Type } from '@mikro-orm/core';
import { Wallet } from '../../../domain/entities/wallet.entity';
import { Money } from '../../../domain/value-objects/money.vo';

// Custom Type para converter entre Money (Domínio) e NUMERIC(14,2) (Postgres)
export class MoneyType extends Type<Money, string> {
    convertToDatabaseValue(value: Money | undefined): string {
        if (!value) return '0.00';
        return value.amount;
    }

    convertToJSValue(value: string | undefined, platform: any, context?: any): Money {
        // Pegamos a moeda do contexto da linha inteira (ou assumimos a da wallet)
        const currency = context?.currency || 'BRL';
        return Money.from({ amount: value || '0.00', currency });
    }

    getColumnType() {
        return 'NUMERIC(14, 2)';
    }
}

export const WalletSchema = new EntitySchema<Wallet>({
    class: Wallet as any,
    tableName: 'wallets',
    //uses rehydrate
    forceConstructor: false,
    properties: {
        id: { type: 'uuid', primary: true },
        playerId: { type: 'string', fieldName: 'player_id' },
        currency: { type: 'string' },
        _balance: {
            type: MoneyType,
            fieldName: 'balance',
            //sends line into context, so the moneyType know the currency
            customType: new MoneyType()
        },
        _version: { type: 'number', fieldName: 'version', version: true }, // optimistic lock support (mesmo usando pessimistic, é bom manter a version syncada)
        createdAt: { type: 'Date', fieldName: 'created_at' },
        _updatedAt: { type: 'Date', fieldName: 'updated_at', onUpdate: () => new Date() },
    } as any,
});