# Evidência de testes: coleção Postman (Release 2)

| Item | Valor |
|---|---|
| Data e hora da execução | [preencher] |
| Commit testado | [preencher] |
| Branch | [preencher] |
| Executado por | Gabriela Andrade |
| Ferramenta | Postman, Collection Runner |
| Ambiente | Local (`http://localhost:8080`) |
| Iterações | 1 |
| Duração | [preencher] |
| Resultado geral | [N] requisições, [M] testes aprovados, 0 falhas, 0 erros |

## Execução completa

[Runner completo](runner/01-runner-completo.png)

## Cenários e resultados

| # | Requisito | Cenário | Esperado | Resultado | Evidência |
|---|---|---|---|---|---|
| 1 | RF12 | Agendar visita | 201 | | [print](rf12/01-rf12-agendamento-sucesso.png) |
| 2 | RF12 | Agendamento duplicado | 409 | | [print](rf12/02-rf12-agendamento-duplicado.png) |
