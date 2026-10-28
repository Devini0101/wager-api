import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Wager API - Integration Tests (Postgres)', () => {
    let app: INestApplication;
    let createdWalletId: string;
    
    // Cria identificadores únicos para ESTA execução do teste
    const uniqueSuffix = Date.now().toString();
    const playerId = `player-${uniqueSuffix}`;
    const extTxId = `txn-${uniqueSuffix}`;
    const idempotencyKey = `provider-test:${extTxId}`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('1. Should create a Wallet with the initial balance of 1000.00 BRL', async () => {
        const response = await request(app.getHttpServer())
            .post('/wallets')
            .send({
                playerId: playerId, // Usando ID único
                initialBalance: { amount: '1000.00', currency: 'BRL' },
            });

        expect(response.status).toBe(201);
        expect(response.body.balance.amount).toBe('1000.00');
        
        createdWalletId = response.body.id;
        expect(createdWalletId).toBeDefined();
    });

    it('2. Should process a BET with success and debit wallet balance', async () => {
        const response = await request(app.getHttpServer())
            .post('/wagering/transactions')
            .set('idempotency-key', idempotencyKey) // Usando chave única
            .send({
                providerId: 'provider-test',
                externalTransactionId: extTxId,
                playerId: playerId,
                walletId: createdWalletId,
                roundId: 'round-01',
                gameId: 'slot-game',
                kind: 'BET',
                money: { amount: '100.00', currency: 'BRL' },
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('PROCESSED');
        expect(response.body.balance.amount).toBe('900.00');
        expect(response.body.idempotentReplay).toBe(false);
    });

    it('3. Should respect Idempotency (Replay) returning idempotentReplay: true without debiting again', async () => {
        const response = await request(app.getHttpServer())
            .post('/wagering/transactions')
            .set('idempotency-key', idempotencyKey) // MESMA CHAVE do teste anterior
            .send({
                providerId: 'provider-test',
                externalTransactionId: extTxId,
                playerId: playerId,
                walletId: createdWalletId,
                roundId: 'round-01',
                gameId: 'slot-game',
                kind: 'BET',
                money: { amount: '100.00', currency: 'BRL' },
            });

        expect(response.status).toBe(200);
        expect(response.body.idempotentReplay).toBe(true);
        expect(response.body.balance.amount).toBe('900.00'); // Saldo permanece inalterado
    });
});