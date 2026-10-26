import { Money } from '../value-objects/money.vo';
import { LedgerDirection } from './wallet-ledger-entry.entity';
import { FailureCode } from '../enums/failure-codes.enum';

export enum WagerTransactionKind {
    Opening  = "OPENING",
    Bet      = "BET",
    Win      = "WIN",
    Loss     = "LOSS",
    Refund   = "REFUND",
    Rollback = "ROLLBACK",
}

export enum WagerTransactionStatus {
    Pending          = "PENDING",
    PendingReference = "PENDING_REFERENCE",
    Processed        = "PROCESSED",
    Rejected         = "REJECTED",
    Failed           = "FAILED",
}

export interface CreateWagerTransactionProps {
    id: string;
    providerId: string;
    externalTransactionId: string;
    idempotencyKey: string;
    payloadHash: string;
    walletId: string;
    playerId: string;
    roundId: string;
    gameId: string;
    kind: WagerTransactionKind;
    money: Money;
    referenceExternalTransactionId?: string;
    createdAt?: Date;
}

export interface WagerTransactionState {
    id: string;
    providerId: string;
    externalTransactionId: string;
    idempotencyKey: string;
    payloadHash: string;
    walletId: string;
    playerId: string;
    roundId: string;
    gameId: string;
    kind: WagerTransactionKind;
    money: Money;
    referenceExternalTransactionId?: string;
    createdAt: Date;
    status: WagerTransactionStatus;
    referenceTransactionId?: string;
    failureCode?: FailureCode;
    processedAt?: Date;
}

export class WagerTransaction {
    private constructor(
        public readonly id: string,
        public readonly providerId: string,
        public readonly externalTransactionId: string,
        public readonly idempotencyKey: string,
        public readonly payloadHash: string,
        public readonly walletId: string,
        public readonly playerId: string,
        public readonly roundId: string,
        public readonly gameId: string,
        public readonly kind: WagerTransactionKind,
        public readonly money: Money,
        public readonly referenceExternalTransactionId: string | undefined,
        public readonly createdAt: Date,
        private _status: WagerTransactionStatus,
        private _referenceTransactionId?: string,
        private _failureCode?: FailureCode,
        private _processedAt?: Date,
    ) {}

    static create(props: CreateWagerTransactionProps): WagerTransaction {
        const tx = new WagerTransaction(
        props.id,
        props.providerId,
        props.externalTransactionId,
        props.idempotencyKey,
        props.payloadHash,
        props.walletId,
        props.playerId,
        props.roundId,
        props.gameId,
        props.kind,
        props.money,
        props.referenceExternalTransactionId,
        props.createdAt ?? new Date(),
        WagerTransactionStatus.Pending,
        );

        if (tx.requiresReference() && !tx.referenceExternalTransactionId) {
            throw new Error(`Transaction kind ${tx.kind} explicitly requires referenceExternalTransactionId`);
        }

        return tx;
    }

    static rehydrate(state: WagerTransactionState): WagerTransaction {
        return new WagerTransaction(
        state.id,
        state.providerId,
        state.externalTransactionId,
        state.idempotencyKey,
        state.payloadHash,
        state.walletId,
        state.playerId,
        state.roundId,
        state.gameId,
        state.kind,
        state.money,
        state.referenceExternalTransactionId,
        state.createdAt,
        state.status,
        state.referenceTransactionId,
        state.failureCode,
        state.processedAt,
        );
    }

    get status(): WagerTransactionStatus { return this._status; }
    get referenceTransactionId(): string | undefined { return this._referenceTransactionId; }
    get failureCode(): FailureCode | undefined { return this._failureCode; }
    get processedAt(): Date | undefined { return this._processedAt; }

    isTerminal(): boolean {
        return (this._status === WagerTransactionStatus.Processed || this._status === WagerTransactionStatus.Rejected || this._status === WagerTransactionStatus.Failed);
    }

    affectsBalance(): boolean {
        return this.kind !== WagerTransactionKind.Loss;
    }

    requiresReference(): boolean {
        return this.kind === WagerTransactionKind.Refund || this.kind === WagerTransactionKind.Rollback;
    }

    matchesPayload(payloadHash: string): boolean {
        return this.payloadHash === payloadHash;
    }

    ledgerDirectionFor(reference?: WagerTransaction): LedgerDirection {
        if (this.kind === WagerTransactionKind.Bet) return LedgerDirection.Debit;
        if (this.kind === WagerTransactionKind.Win || this.kind === WagerTransactionKind.Opening) return LedgerDirection.Credit;
        if (this.kind === WagerTransactionKind.Refund) return LedgerDirection.Credit;

        if (this.kind === WagerTransactionKind.Rollback) {
            if (!reference) {
                throw new Error('Rollback requires reference transaction to calculate direction');
            }
            const refDirection = reference.ledgerDirectionFor();
            return refDirection === LedgerDirection.Debit ? LedgerDirection.Credit : LedgerDirection.Debit;
        }

        throw new Error(`Kind ${this.kind} does not generate a ledger entry`);
    }

    markProcessed(referenceTransactionId: string | undefined, at: Date): void {
        this.assertNotTerminal();
        this._status = WagerTransactionStatus.Processed;
        this._referenceTransactionId = referenceTransactionId;
        this._processedAt = at;
    }

    markPendingReference(): void {
        this.assertNotTerminal();
        this._status = WagerTransactionStatus.PendingReference;
    }

    reject(code: FailureCode): void {
        this.assertNotTerminal();
        this._status = WagerTransactionStatus.Rejected;
        this._failureCode = code;
        this._processedAt = new Date();
    }

    fail(code: FailureCode): void {
        this.assertNotTerminal();
        this._status = WagerTransactionStatus.Failed;
        this._failureCode = code;
        this._processedAt = new Date();
    }

    private assertNotTerminal(): void {
        if (this.isTerminal()) {
            throw new Error(`Invalid state transition: transaction ${this.id} is already in terminal state ${this._status}`);
        }
    }
}