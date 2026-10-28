# Jungle Gaming — Distributed Wagering Processor

Serviço financeiro distribuído desenvolvido para o desafio da Jungle Gaming. Focado em consistência transacional, concorrência e arquitetura resiliente.

## Tecnologias Principais
- Bun 1.x (Runtime e Testes nativos rápidos)
- NestJS (Framework)
- MikroORM (Data Mapper / Unit of Work)
- PostgreSQL (ACID & Pessimistic Locks)
- LocalStack (AWS SQS) (Mensageria e Outbox Pattern)

## Pré-requisitos
- [Docker](https://www.docker.com/) e Docker Compose
- [Bun](https://bun.sh/) instalado na máquina

## Instruções de Setup

1. Subir a Infraestrutura (Postgres e LocalStack):
  ```bash
  docker compose up -d

2. Instalar dependências:
  ```bash
  bun install
  ```

3. Rodar migrations do banco:
  ```bash
  bun run db:migrate
  ```

4. Iniciar aplicação:
  ```bash
  bun run start:dev
  ```

## Testes
A suíte de testes de integração roda diretamente contra o banco PostgreSQL real (sem mocks), validando criação de carteiras, débitos e idempotência.

  ```bash
  bun run test:integration
  ```

## Como funciona o Fluxo?

- Ao receber um POST em /wagering/transactions:

- Verifica se a transação é replay.

- Adquire um Lock Pessimista na carteira do jogador.

- Debita ou credita usando aritmética de strings via Value Object.

- Salva a transação e grava a auditoria de partidas no Ledger.

- Grava o evento na tabela Outbox (tudo de forma atômica).

- Um Worker background envia as mensagens pendentes para a fila SQS.