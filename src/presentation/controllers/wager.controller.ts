import { BadRequestException, Body, ConflictException, Controller, Get, Headers, HttpCode, NotFoundException, Param, Post, UnprocessableEntityException } from "@nestjs/common";
import { ProcessWagerUseCase } from "../../application/use-cases/process-wager.use-case";
import { CreateWagerTransactionDto } from "../dtos/create-wager-transaction.dto";
import { generateCanonicalHash } from "../../application/utils/hash.util";
import { WagerTransaction, WagerTransactionKind, WagerTransactionStatus } from "../../domain/entities/wager-transaction.entity";
import { Money } from '../../domain/value-objects/money.vo';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { EntityManager } from "@mikro-orm/postgresql";

export class MoneyDto {
    @IsString()
    @IsNotEmpty()
    amount: string;
    
    @IsString() 
    @IsNotEmpty() 
    currency: string;
}

export class CreateWagerDto {
    @IsString()
    @IsNotEmpty() 
    providerId: string;
    
    @IsString()
    @IsNotEmpty()
    externalTransactionId: string;
    
    @IsString()
    @IsNotEmpty()
    playerId: string;
    
    @IsString()
    @IsNotEmpty()
    walletId: string;
    
    @IsString()
    @IsNotEmpty()
    roundId: string;
    
    @IsString()
    @IsNotEmpty()
    gameId: string;
    
    @IsEnum(WagerTransactionKind) 
    kind: WagerTransactionKind;
  
    @ValidateNested()
    @Type(() => MoneyDto)
    money: MoneyDto;
  
    @IsString()
    @IsOptional()
    messageId?: string;
  
    @IsString()
    @IsOptional()
    consumerName?: string;
}

@Controller()
export class WagerController {
    constructor(
        private readonly processWagerUseCase: ProcessWagerUseCase,
        private readonly em: EntityManager,
    ) {}

    @Post('wagering/transactions')
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

        // verifies idempotency by SQL RAW without relying on cache
        const checkReplayQuery = await this.em.getConnection().execute(
            `SELECT id FROM wager_transactions WHERE provider_id = ? AND idempotency_key = ?`,
            [dto.providerId, idempotencyKey]
        );
        const isReplay = checkReplayQuery.length > 0;

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

            const walletQuery = await this.em.getConnection().execute(
                `SELECT balance FROM wallets WHERE id = ?`,
                [dto.walletId]
            );
            
            let finalBalanceMoney = Money.zero(dto.money.currency);
            
            if (walletQuery.length > 0) {
                // Instancia o objeto Money com o retorno cru do banco
                finalBalanceMoney = Money.from({ 
                    amount: walletQuery[0].balance, 
                    currency: dto.money.currency 
                });
            }

            return {
                transactionId: transaction.id,
                status: transaction.status,
                balance: finalBalanceMoney.toJSON(),
                idempotentReplay: isReplay
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

    @Get('wagering/transactions/:transactionId')
    async getTransactionById(@Param('transactionId') transactionId: string) {
        const tx = await this.em.findOne(WagerTransaction, { id: transactionId });

        if (!tx) throw new NotFoundException('Transaction not found');

        return {
            transactionId: tx.id,
            providerId: tx.providerId,
            externalTransactionId: tx.externalTransactionId,
            status: tx.status,
            kind: tx.kind,
            money: tx.money.toJSON(),
            createdAt: tx.createdAt,
        };
    }

    @Get('providers/:providerId/wagering/transactions/:externalTransactionId')
    async getTransactionByExternal(
        @Param('providerId') providerId: string,
        @Param('externalTransactionId') externalTransactionId: string,
    ) {
        const tx = await this.em.findOne(WagerTransaction, { providerId, externalTransactionId });
        if (!tx) throw new NotFoundException('Transaction not found');
        return {
            transactionId: tx.id,
            providerId: tx.providerId,
            externalTransactionId: tx.externalTransactionId,
            status: tx.status,
            kind: tx.kind,
            money: tx.money.toJSON(),
            createdAt: tx.createdAt,
        };
    }
}