import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { OutboxMessage } from '../../domain/entities/outbox-message.entity';

@Injectable()
export class OutboxRelayWorker {
    private readonly logger = new Logger(OutboxRelayWorker.name);
    private readonly sqsClient: SQSClient;
    private readonly queueUrl = process.env.SQS_WAGER_QUEUE_URL || 'http://localhost:4566/000000000000/wager-queue';

    constructor(private readonly em: EntityManager) {
        this.sqsClient = new SQSClient({
            region: 'us-east-1',
            endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
            credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        });
    }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async relayMessages() {
        const em = this.em.fork();
        
        try {
            // Busca mensagens pendentes (não publicadas) ordenadas pela criação
            const pendingMessages = await em.find(OutboxMessage, 
                { _publishedAt: { $eq: null } } as any,
                { orderBy: { occurredAt: 'ASC' }, limit: 50 }
            );

            if (pendingMessages.length === 0) return;

            for (const message of pendingMessages) {
                try {
                    await this.sqsClient.send(new SendMessageCommand({
                        QueueUrl: this.queueUrl,
                        MessageBody: JSON.stringify(message.payload),
                        MessageGroupId: message.aggregateId, // FIFO: Garante ordem para a mesma wallet
                        MessageDeduplicationId: message.id,  // Impede duplicidade no SQS
                    }));

                    message.markPublished(new Date());
                    await em.flush();
                    this.logger.log(`Mensagem SQS ${message.id} publicada com sucesso (Outbox)`);
                } catch (sqsError) {
                    this.logger.error(`Falha ao publicar no SQS: ${message.id}`, sqsError);
                    message.scheduleRetry(new Date());
                    await em.flush();
                }
            }
        } catch (error) {
            this.logger.error('Erro no Worker do Outbox', error);
        }
    }
}