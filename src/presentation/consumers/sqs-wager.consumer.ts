import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ProcessWagerUseCase } from "../../application/use-cases/process-wager.use-case";
import { generateCanonicalHash } from "../../application/utils/hash.util";
import { Money } from "../../domain/value-objects/money.vo";

@Injectable()
export class SqsWagerConsumer implements OnModuleInit {
    private readonly logger = new Logger(SqsWagerConsumer.name);
    private readonly sqsClient: SQSClient;
  
    // localStack (Docker) by default if theres no wager aws queue
    private readonly queueUrl = process.env.SQS_WAGER_QUEUE_URL || 'http://localhost:4566/000000000000/wager-queue';

    constructor(private readonly processWagerUseCase: ProcessWagerUseCase) {
        this.sqsClient = new SQSClient({
            region: process.env.AWS_REGION || 'us-east-1',
            endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
            credentials: { 
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test', 
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test' 
            },
        });
    }

    onModuleInit() {
        this.logger.log(`Iniciando consumo da SQS: ${this.queueUrl}`);
        this.poll();
    }

    private async poll() {
        while (true) {
            try {
                const { Messages } = await this.sqsClient.send(new ReceiveMessageCommand({
                    QueueUrl: this.queueUrl,
                    MaxNumberOfMessages: 10,
                    WaitTimeSeconds: 20, // Long polling, dont overload cpu
                }));

                if (Messages && Messages.length > 0) {
                    for (const message of Messages) {
                        await this.processMessage(message);
                    }
                }
            } catch (error) {
                //if theres no queue, warn about it, but do not turns the api down
                this.logger.error('Erro ao ler fila SQS. Tentando novamente em 5s...', error);
                await new Promise(resolve => setTimeout(resolve, 5000)); 
            }
        }
    }

    private async processMessage(message: any) {
        try {
            const body = JSON.parse(message.Body);
            const payloadHash = generateCanonicalHash(body);

            await this.processWagerUseCase.execute({
                messageId: message.MessageId,
                consumerName: 'wager-sqs-consumer',
                providerId: body.providerId,
                externalTransactionId: body.externalTransactionId,
                idempotencyKey: body.idempotencyKey || message.MessageId, //fallback
                payloadHash: payloadHash,
                walletId: body.walletId,
                playerId: body.playerId,
                roundId: body.roundId,
                gameId: body.gameId,
                kind: body.kind,
                money: Money.from({ amount: body.money.amount, currency: body.money.currency }),
            });

            // only deleted from queue if UseCase successful or hit by idempotency by a safe way
            await this.sqsClient.send(new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: message.ReceiptHandle,
            }));

            this.logger.log(`Mensagem SQS ${message.MessageId} processada com sucesso.`);
        
        } catch (error: any) {
            this.logger.error(`Falha ao processar mensagem ${message.MessageId}: ${error.message}`);
        }
    }
}