import { EntitySchema } from "@mikro-orm/core";
import { InboxMessage } from "../../../domain/entities/inbox-message.entity";

export const InboxMessageSchema = new EntitySchema<InboxMessage>({
    class: InboxMessage as any,
    tableName: 'inbox_messages',
    //uses rehydrate
    forceConstructor: false,
    //primary is the message_id and consumer name
    properties: {
        messageId: { type: 'string', fieldName: 'message_id', primary: true },
        consumerName: { type: 'string', fieldName: 'consumer_name', primary: true },
        payloadHash: { type: 'string', fieldName: 'payload_hash' },
        receivedAt: { type: 'Date', fieldName: 'received_at' },
        _processedAt: { type: 'Date', fieldName: 'processed_at', nullable: true },
    } as any,
})