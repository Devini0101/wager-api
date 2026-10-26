// src/migrations/Migration20261026000001.ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20261026000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
        CREATE TABLE wallets (
            id UUID PRIMARY KEY,
            player_id VARCHAR(255) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            balance NUMERIC(14, 2) NOT NULL,
            version INT NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL,
            CONSTRAINT chk_wallet_balance_not_negative CHECK (balance >= 0),
            CONSTRAINT uq_player_currency UNIQUE (player_id, currency)
        );
    `);

    // wager Transactions
    // provider_id + idempotency_key
    this.addSql(`
        CREATE TABLE wager_transactions (
            id UUID PRIMARY KEY,
            provider_id VARCHAR(100) NOT NULL,
            external_transaction_id VARCHAR(255) NOT NULL,
            idempotency_key VARCHAR(255) NOT NULL,
            payload_hash VARCHAR(255) NOT NULL,
            wallet_id UUID NOT NULL REFERENCES wallets(id),
            player_id VARCHAR(255) NOT NULL,
            round_id VARCHAR(255) NOT NULL,
            game_id VARCHAR(255) NOT NULL,
            kind VARCHAR(20) NOT NULL,
            amount NUMERIC(14, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            reference_external_transaction_id VARCHAR(255),
            reference_transaction_id UUID,
            status VARCHAR(20) NOT NULL,
            failure_code VARCHAR(50),
            created_at TIMESTAMPTZ NOT NULL,
            processed_at TIMESTAMPTZ,
            CONSTRAINT uq_provider_idempotency UNIQUE (provider_id, idempotency_key)
        );
        -- busca de referências e resolver pendências
        CREATE INDEX idx_wager_tx_provider_ext_ref ON wager_transactions (provider_id, external_transaction_id);
        CREATE INDEX idx_wager_tx_status ON wager_transactions (status) WHERE status = 'PENDING_REFERENCE';
    `);

    //ledger
    this.addSql(`
        CREATE TABLE wallet_ledger_entries (
            id UUID PRIMARY KEY,
            wallet_id UUID NOT NULL REFERENCES wallets(id),
            transaction_id UUID NOT NULL REFERENCES wager_transactions(id),
            direction VARCHAR(10) NOT NULL,
            amount NUMERIC(14, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            balance_before_amount NUMERIC(14, 2) NOT NULL,
            balance_after_amount NUMERIC(14, 2) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX idx_ledger_wallet_id ON wallet_ledger_entries(wallet_id);
    `);

    // inbox sqs
    this.addSql(`
        CREATE TABLE inbox_messages (
            message_id VARCHAR(255) NOT NULL,
            consumer_name VARCHAR(100) NOT NULL,
            payload_hash VARCHAR(255) NOT NULL,
            received_at TIMESTAMPTZ NOT NULL,
            processed_at TIMESTAMPTZ,
            PRIMARY KEY (message_id, consumer_name)
        );
    `);

    // outbox para os eventos
    this.addSql(`
        CREATE TABLE outbox_messages (
            id UUID PRIMARY KEY,
            aggregate_id VARCHAR(255) NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            payload JSONB NOT NULL,
            occurred_at TIMESTAMPTZ NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            next_attempt_at TIMESTAMPTZ,
            published_at TIMESTAMPTZ
        );
        CREATE INDEX idx_outbox_pending ON outbox_messages (next_attempt_at) WHERE published_at IS NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS outbox_messages;');
    this.addSql('DROP TABLE IF EXISTS inbox_messages;');
    this.addSql('DROP TABLE IF EXISTS wallet_ledger_entries;');
    this.addSql('DROP TABLE IF EXISTS wager_transactions;');
    this.addSql('DROP TABLE IF EXISTS wallets;');
  }
}