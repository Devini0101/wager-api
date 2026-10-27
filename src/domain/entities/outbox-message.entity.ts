export interface CreateOutboxMessageProps {
  eventId: string;
  aggregateId: string;
  eventType: string;
  data: any;
  occurredAt?: Date;
}

export class OutboxMessage {
    public readonly id: string;
    public readonly aggregateId: string;
    public readonly eventType: string;
    public readonly payload: any;
    public readonly occurredAt: Date;
    
    private _attempts: number;
    private _nextAttemptAt?: Date;
    private _publishedAt?: Date;

    constructor(
        id: string,
        aggregateId: string,
        eventType: string,
        payload: any,
        occurredAt: Date,
        attempts: number = 0,
        nextAttemptAt?: Date,
        publishedAt?: Date
    ) {
        this.id = id;
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.payload = payload;
        this.occurredAt = occurredAt;
        this._attempts = attempts;
        this._nextAttemptAt = nextAttemptAt;
        this._publishedAt = publishedAt;
    }

    static enqueue(props: CreateOutboxMessageProps): OutboxMessage {
        // Passamos os dados direto no construtor para respeitar o readonly
        return new OutboxMessage(
        props.eventId,
        props.aggregateId,
        props.eventType,
        props.data,
        props.occurredAt || new Date(),
        0,
        undefined,
        undefined
        );
    }

    get attempts(): number { return this._attempts; }
    get nextAttemptAt(): Date | undefined { return this._nextAttemptAt; }
    get publishedAt(): Date | undefined { return this._publishedAt; }
}