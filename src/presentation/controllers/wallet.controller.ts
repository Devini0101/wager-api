import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { MoneyDto } from "../dtos/create-wager-transaction.dto";
import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { EntityManager } from "@mikro-orm/postgresql";
import { BADFLAGS } from "dns";
import { Wallet } from "../../domain/entities/wallet.entity";
import { WalletLedgerEntry } from "../../domain/entities/wallet-ledger-entry.entity";

export class CreateWalletDto {
    @IsString()
    @IsNotEmpty()
    playerId: string;

    @ValidateNested()
    @Type(() => MoneyDto)
    initialBalance: MoneyDto;
}

@Controller('wallets')
export class WalletController {

    constructor(
        private readonly createWalletUseCase: CreateWalletUseCase,
        private readonly em: EntityManager, //reading data right from entity
    ) {}

    @Post()
    async create(@Body() dto : CreateWalletDto) {
        const wallet = await this.createWalletUseCase.execute(dto.playerId, dto.initialBalance);

        return {
            id: wallet.id,
            playerId : wallet.playerId,
            balance: wallet.balance,
            version : wallet.version
        };
    }

    @Get(':walletId')
    async getWallet (@Param('walletId') walletId : string) {
        const wallet = await this.em.findOne(Wallet, {id : walletId});
        if (!wallet) throw new NotFoundException('Wallet not found');
        return {
            id: wallet.id,
            playerId: wallet.playerId,
            balance: wallet.balance.toJSON(),
            version: wallet.version,
        }
    }


    @Get(':walletId/ledger')
    async getLedger(@Param('walletId') walledId : string, @Query('cursor') cursor?: string, @Query('limit') limitQuery?: string,) {
        const limit = limitQuery ? parseInt(limitQuery, 10) : 50;
        let cursorDate: Date | null = null;

        if (cursor) {
            const decoded = Buffer.from(cursor, 'base64').toString('ascii');
            cursorDate = new Date(decoded);
        }

        const qb = this.em.createQueryBuilder(WalletLedgerEntry, 'wle')
            .where({walletId : walledId})
            .orderBy({createdAt : 'DESC'})
            .limit(limit);

        if (cursorDate) {
            qb.andWhere({createdAt : {$lt : cursorDate}})
        }

        const entries = await qb.getResultList();

        //generates next cursor by next the last returned register created at field
        const nextCursor = entries.length > 0 ? Buffer.from(entries[entries.length - 1].createdAt.toISOString()).toString('base64') : null;

        return {
            data : entries.map((entry) => ({
                id: entry.id,
                transactionId: entry.transactionId,
                direction: entry.direction,
                money: entry.money.toJSON(),
                balanceBefore: entry.balanceBefore.toJSON(),
                balanceAfter: entry.balanceAfter.toJSON(),
                createdAt: entry.createdAt.toISOString(),
            })),
            nextCursor
        };
    }
}