#!/bin/bash
echo "Criando filas SQS..."

awslocal sqs create-queue \
    --queue-name wager-transactions-dlq.fifo \
    --attributes FifoQueue=true

awslocal sqs create-queue \
    --queue-name wager-transactions.fifo \
    --attributes FifoQueue=true,RedrivePolicy="{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:wager-transactions-dlq.fifo\",\"maxReceiveCount\":\"3\"}"

echo "Filas criadas!!"