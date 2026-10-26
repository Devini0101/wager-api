import { Module } from "@nestjs/common";
import { WagerController } from "./presentation/controllers/wager.controller";
import { ProcessWagerUseCase } from "./application/use-cases/process-wager.use-case";

@Module({
  imports: [],
  controllers: [WagerController],
  providers: [ProcessWagerUseCase],
})
export class WagerModule {}