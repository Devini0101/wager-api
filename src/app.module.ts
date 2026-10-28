import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './mikro-orm.config';
import { WagerModule } from './wager.module';
import { ProcessWagerUseCase } from './application/use-cases/process-wager.use-case';
import { CreateWalletUseCase } from './application/use-cases/create-wallet.use-case';
import { SqsWagerConsumer } from './presentation/consumers/sqs-wager.consumer';
import { ScheduleModule } from '@nestjs/schedule';

export const { ObserveModule, ObserveInstrument } = createObserveModule();
@Module({
  imports: [

    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'wager-api',
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    WagerModule,
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [AppService, ProcessWagerUseCase, CreateWalletUseCase, SqsWagerConsumer],
})
export class AppModule {}
