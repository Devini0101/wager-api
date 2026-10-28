import { Module } from "@nestjs/common";
import { WagerController } from "./presentation/controllers/wager.controller";
import { ProcessWagerUseCase } from "./application/use-cases/process-wager.use-case";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { WalletController } from "./presentation/controllers/wallet.controller";
import { HealthController } from "./presentation/controllers/health.controller";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { WalletLedgerEntry } from "./domain/entities/wallet-ledger-entry.entity";
import { Wallet } from "./domain/entities/wallet.entity";
import { OutboxRelayWorker } from "./application/workers/outbox-relay.worker";

@Module({
  imports: [MikroOrmModule.forFeature([Wallet, WalletLedgerEntry]),],
  controllers: [WagerController, WalletController, HealthController],
  providers: [ProcessWagerUseCase, CreateWalletUseCase, OutboxRelayWorker],
})
export class WagerModule {}