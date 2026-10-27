# Arquitetura do Serviço Wager API
Este documento detalha as decisões arquiteturais, padrões de design e trade-offs adotados no desenvolvimento da API de Transações de Apostas (Wager API).

------

## Visão Geral e Princípios
A aplicação foi construída seguindo os princípios de Domain-Driven Design (DDD) e Clean Architecture, garantindo que as regras de negócio essenciais fiquem completamente isoladas de detalhes de infraestrutura (como frameworks HTTP, ORMs ou provedores de mensageria).

### Camadas do Sistema:
- Domain (`src/domain`)**: Contém as Entidades ricas, Value Objects (`Money`) e regras invariantes (ex: saldo não poder ser negativo e validação de hashes de payload).
- Application (`src/application`)**: Contém os Casos de Uso (`ProcessWagerUseCase`, `CreateWalletUseCase`) que orquestram as transações.
- Infrastructure (`src/infra`)**: Configuração do MikroORM, Mapeamentos (`EntitySchema`), Migrations SQL e adaptadores de banco de dados.
- Presentation (`src/presentation`)**: Controladores HTTP e Consumers SQS.

------

## Decisões de Concorrência e Consistência (Hot Wallet)
Em plataformas de apostas de alto volume, múltiplos eventos ocorrem simultaneamente para a mesma carteira (ex: apostas rápidas em slots, ganhos e bônus concorrentes).

    - Estratégia Escolhida: Pessimistic Locking (`SELECT ... FOR UPDATE` via `LockMode.PESSIMISTIC_WRITE`).
    - Por quê?: O uso de locks otimistas (`version` checking) gerava conflitos excessivos e retries desnecessários sob alta carga. O bloqueio pessimista na linha da carteira (`wallets`) serializa operações na mesma conta de forma segura, prevenindo updates perdidos e garantindo que o saldo nunca fique negativo por uma Race Condition.

---

## Idempotência e Prevenção de Duplicidade
A idempotência é garantida em duas camadas complementares:
    1. Camada de API (HTTP): Exigência do header `Idempotency-Key` associado ao par providerId e externalTransactionId. O payload é transformado em um Hash Canônico (chaves ordenadas). Caso uma requisição idêntica chegue, a API retorna o mesmo resultado com a flag `idempotentReplay: true`. Caso a chave seja repetida com um payload diferente, a API retorna `HTTP 409 (Conflict)`.
    2. Camada de Mensageria (SQS): Padrão Inbox persistente. Cada mensagem recebida da fila AWS SQS grava um registro único de rastreio por consumerName e messageId. Se houver uma redelivery da fila, a mensagem é ignorada com segurança, evitando duplicação de efeitos.

---

## Consistência Eventual e Padrão Outbox
Para garantir que eventos de integração como o `WalletBalanceChanged` sejam despachados sem risco de perda em caso de queda do broker:
    - Transactional Outbox Pattern: O evento de alteração de saldo é gravado na tabela `outbox_messages` dentro da mesma transação ACID que atualiza a carteira e gera o registro no Ledger, isso garante que nenhum evento é publicado antes do commit no banco de dados. Um worker em background consome a outbox de forma concorrente e segura.

---

## Auditoria Imutável (Ledger)
Qualquer alteração efetiva de saldo gera obrigatoriamente um registro na tabela `wallet_ledger_entries`. 
    - O ledger armazena o estado `balanceBefore` e `balanceAfter`, além da direção (`CREDIT` / `DEBIT`), garantindo uma trilha de auditoria financeira completa, um histórico, passível de reconciliação a qualquer momento via endpoint dedicado (`POST /wallets/:walletId/reconciliation`).

---

## Trade-offs e Limitações Conhecidas
    - Complexidade de Mapeamento: O uso de DDD puro com propriedades privadas em TypeScript exigiu o uso de `EntitySchema` no MikroORM em vez de decorators nas entidades de domínio. O trade-off valeu a pena para manter o domínio livre de acoplamentos com o ORM.
    - Latência sob Lock Pessimista: Embora garanta 100% de precisão financeira, o `FOR UPDATE` serializa transações da mesma carteira, limitando o throughput individual daquela conta específica à velocidade de execução do banco de dados (mitigado pelo particionamento lógico por jogador).