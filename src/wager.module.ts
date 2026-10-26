import { Module } from "@nestjs/common";
import { WagerController } from "./presentation/controllers/wager.controller";
import { ProcessWagerUseCase } from "./application/use-cases/process-wager.use-case";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { WalletController } from "./presentation/controllers/wallet.controller";

@Module({
  imports: [],
  controllers: [WagerController, WalletController],
  providers: [ProcessWagerUseCase, CreateWalletUseCase],
})
export class WagerModule {}