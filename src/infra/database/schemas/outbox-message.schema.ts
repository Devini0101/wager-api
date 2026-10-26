import { EntitySchema } from "@mikro-orm/core";
import { OutboxMessage } from "../../../domain/entities/outbox-message.entity";

export const OutboxMessageSchema = new EntitySchema<OutboxMessage>({
    class: OutboxMessage as any,
    tableName: 'outbox_messages',
    forceConstructor: false,
    properties: {
        id: { type: 'uuid', primary: true },
        aggregateId: { type: 'string', fieldName: 'aggregate_id' },
        eventType: { type: 'string', fieldName: 'event_type' },
        payload: { type: 'json' },
        occurredAt: { type: 'Date', fieldName: 'occurred_at' },
        _attempts: { type: 'number', fieldName: 'attempts' },
        _nextAttemptAt: { type: 'Date', fieldName: 'next_attempt_at', nullable: true },
        _publishedAt: { type: 'Date', fieldName: 'published_at', nullable: true },
    } as any,
})