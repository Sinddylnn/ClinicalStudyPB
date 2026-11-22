# Roteiro de testes — Release 1

Este roteiro descreve como os testes da Release 1 foram executados e onde estão as evidências. Os resultados estão no [relatório de testes](postman/relatorio-execucao.md) e a lista completa de casos, na [tabela de testes](../tabela-de-testes.md).

## 1. Ambiente

| Item | Valor |
|---|---|
| Banco de desenvolvimento | `docker compose up -d db` (PostgreSQL 17.11, porta 5432) |
| Banco de testes | `docker compose --profile test up -d db-test` (porta 5433, dados descartáveis) |
| Dados | Fictícios, criados pelas migrações e pela coleção Postman |

## 2. Execução por camada

| Camada | Como executar | Resultado esperado |
|---|---|---|
| Backend (Spring) | Na pasta `backend`, com as variáveis `CLINICALSTUDYPB_TEST_DB_URL`, `CLINICALSTUDYPB_TEST_DB_USER` e `CLINICALSTUDYPB_TEST_DB_PASSWORD` definidas: `./mvnw -B verify "-Dtest=*Test,*IT"` | `BUILD SUCCESS`, 0 falhas e regra de 80% cumprida nas classes de serviço |
| Cobertura | Abrir `backend/target/site/jacoco/index.html` | Relatório JaCoCo por pacote |
| API (Postman) | Importar a coleção e o ambiente `Local` e executar no Runner ([passo a passo](../../../../docs/postman/execucao.md)) | Execução completa sem falhas |
| Web | Na pasta `web`: `npm ci` e `npm run test:coverage` | Testes aprovados e relatório de cobertura |
| Mobile | [Roteiro de teste do mobile](../mobile/teste-mobile-sprint2.md) | Teste de componentes e fluxo E2E aprovados |

## 3. Evidências

| Evidência | Local |
|---|---|
| Execução dos testes do backend | [testes-backend.png](testes-backend.png) |
| Cobertura (JaCoCo) | [cobertura-jacoco.png](jacoco/cobertura-jacoco.png) |
| Postman | [evidencias/backend/postman](postman/) |
| Swagger | [evidencias/backend/swagger](swagger/) |
| Web | [evidencias/web](../web/) |
| Mobile | [evidencias/mobile](../mobile/) |

## 4. Critérios

- Cada requisito possui testes automatizados e ao menos um cenário de sucesso e um de erro verificado na API.
- A suíte completa executa sem falhas e a cobertura das classes de serviço é de pelo menos 80%.
