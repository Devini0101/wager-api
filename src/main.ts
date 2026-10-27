import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ensureSqsQueueExists } from './infra/aws/sqs-init';

async function bootstrap() {
  await ensureSqsQueueExists();
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, //removes whats not explicit on the dto
    forbidNonWhitelisted: true,
  }));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
