import { Money } from '../value-objects/money.vo';

export enum LedgerDirection {
    Debit = "DEBIT",
    Credit = "CREDIT",
}

export interface CreateLedgerEntryProps {
    id: string;
    walletId: string;
    transactionId: string;
    direction: LedgerDirection;
    money: Money;
    balanceBefore: Money;
    balanceAfter: Money;
    createdAt?: Date;
}

export interface LedgerEntryState {
    id: string;
    walletId: string;
    transactionId: string;
    direction: LedgerDirection;
    money: Money;
    balanceBefore: Money;
    balanceAfter: Money;
    createdAt: Date;
}

export class WalletLedgerEntry {
    private constructor(
        public readonly id: string,
        public readonly walletId: string,
        public readonly transactionId: string,
        public readonly direction: LedgerDirection,
        public readonly money: Money,
        public readonly balanceBefore: Money,
        public readonly balanceAfter: Money,
        public readonly createdAt: Date,
    ) {}

    get currency(): string {
        return this.money.currency;
    }

    static create(props: CreateLedgerEntryProps): WalletLedgerEntry {
        const entry = new WalletLedgerEntry(
        props.id,
        props.walletId,
        props.transactionId,
        props.direction,
        props.money,
        props.balanceBefore,
        props.balanceAfter,
        props.createdAt ?? new Date(),
        );

        if (!entry.isBalanced()) {
        throw new Error(
            `Unbalanced ledger entry: balanceBefore (${props.balanceBefore.amount}) ${
            props.direction === LedgerDirection.Credit ? '+' : '-'
            } money (${props.money.amount}) != balanceAfter (${props.balanceAfter.amount})`
        );
        }

        return entry;
    }

    static rehydrate(state: LedgerEntryState): WalletLedgerEntry {
        return new WalletLedgerEntry(
        state.id,
        state.walletId,
        state.transactionId,
        state.direction,
        state.money,
        state.balanceBefore,
        state.balanceAfter,
        state.createdAt,
        );
    }

    isBalanced(): boolean {
        const expectedAfter = this.direction === LedgerDirection.Credit ? this.balanceBefore.add(this.money): this.balanceBefore.subtract(this.money);

        return this.balanceAfter.equals(expectedAfter);
    }
}