import { BadRequestException, Body, ConflictException, Controller, Headers, HttpCode, Post, UnprocessableEntityException } from "@nestjs/common";
import { ProcessWagerUseCase } from "../../application/use-cases/process-wager.use-case";
import { CreateWagerTransactionDto } from "../dtos/create-wager-transaction.dto";
import { generateCanonicalHash } from "../../application/utils/hash.util";
import { WagerTransactionStatus } from "../../domain/entities/wager-transaction.entity";
import { Money } from '../../domain/value-objects/money.vo';

@Controller('wagering')
export class WagerController {
    constructor(private readonly processWagerUseCase: ProcessWagerUseCase) {}

    @Post('transactions')
    @HttpCode(200)
    async createTransaction(
        @Headers('idempotency-key') idempotencyKey: string,
        @Body() dto: CreateWagerTransactionDto,
    ) {
        if (!idempotencyKey) {
            throw new BadRequestException('Header Idempotency-Key is required');
        }

        //gets dto and generates hash
        const payloadHash = generateCanonicalHash(dto);

        try {
            //repass the command into use case
            const transaction = await this.processWagerUseCase.execute({
                ...dto,
                idempotencyKey,
                payloadHash,
                money: Money.from({ amount: dto.money.amount, currency: dto.money.currency }), // Cast simples pro Value Object
            });

            if (transaction.status === WagerTransactionStatus.Rejected) {
                throw new UnprocessableEntityException({ transactionId: transaction.id, status: transaction.status, failureCode: transaction.failureCode});
            }

            // success, returns the contract
            return {
                transactionId: transaction.id,
                status: transaction.status,
                // alterar o UseCase para devolver a Wallet e a Transação juntas
                idempotentReplay: transaction.createdAt.getTime() < new Date().getTime() - 1000 //identify if was a replay
            };
        } catch (error: any) {
            if (error.message === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
                throw new ConflictException('Same idempotency key with different payload');
            }
            if (error.message === 'Wallet not found') {
                throw new BadRequestException('Wallet not found');
            }
            // another err gets an HTTP 500
            throw error;
        }
    }
}