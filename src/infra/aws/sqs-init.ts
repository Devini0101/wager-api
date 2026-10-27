import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';

export async function ensureSqsQueueExists() {
    const sqsClient = new SQSClient({
        region: 'us-east-1',
        endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
        credentials: { 
        accessKeyId: 'test', 
        secretAccessKey: 'test' 
        },
    });

    const queueUrl = process.env.SQS_WAGER_QUEUE_URL || 'http://localhost:4566/000000000000/wager-queue';
    const queueName = 'wager-queue';

    try {
        await sqsClient.send(new CreateQueueCommand({ QueueName: queueName }));
        console.log(`[SQS] Fila '${queueName}' criada ou já existente com sucesso no LocalStack!`);
    } catch (error) {
        console.error('[SQS] Erro ao garantir criação da fila no LocalStack:', error);
    }
}