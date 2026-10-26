import { EntitySchema } from "@mikro-orm/core";
import { WalletLedgerEntry } from "../../../domain/entities/wallet-ledger-entry.entity";
import { MoneyType } from "./wallet.schema";

export const WalletLedgerSchema = new EntitySchema<WalletLedgerEntry>({
    class: WalletLedgerEntry as any,
    tableName: 'wallet_ledger_entries',
    //uses rehydrate
    forceConstructor: false,
    properties: {
        id: { type: 'uuid', primary: true },
        walletId: { type: 'uuid', fieldName: 'wallet_id' },
        transactionId: { type: 'uuid', fieldName: 'transaction_id' },
        direction: { type: 'string' },
        money: { type: MoneyType, fieldName: 'amount', customType: new MoneyType() },
        balanceBefore: { type: MoneyType, fieldName: 'balance_before_amount', customType: new MoneyType() },
        balanceAfter: { type: MoneyType, fieldName: 'balance_after_amount', customType: new MoneyType() },
        createdAt: { type: 'Date', fieldName: 'created_at' }
    } as any,
})