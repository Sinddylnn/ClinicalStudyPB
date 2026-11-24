# Execução Postman da Release 2

A coleção [`docs/postman/ClinicalStudyPB.postman_collection.json`](../../../../../docs/postman/ClinicalStudyPB.postman_collection.json) cobre a API das Releases 1 e 2. Ela tem **143 requisições** e **211 testes automatizados**, organizados em 12 pastas, e roda inteira no Collection Runner, na ordem, com o ambiente `Local` ([passo a passo](../../../../../docs/postman/execucao.md)).

## Resultado

| Item | Valor |
|---|---|
| Data da execução | 23/11/2026 |
| Ambiente | `Local` (backend em `http://localhost:8080`, PostgreSQL 17.11 via Docker Compose) |
| Iterações / atraso | 1 / 0 ms |
| Requisições | 143 |
| Testes | 211 |
| Aprovados | 211 |
| Falhas | 0 |
| Erros | 0 |
| Duração | 1 min 17 s |
| Evidência | [Execução completa](runner/Release2_Postman_Execucao_Completa_211_testes_0_falhas.png) |

A execução base da Release 1, com 102 testes, continua registrada em [00-runner-base-release1.png](runner/00-runner-base-release1.png).

## Pastas da coleção

| Pasta | Conteúdo | Release / requisitos |
|---|---|---|
| 1 a 7 | Autenticação, usuários, troca de sessão, estudos, estados, protocolo, candidatos, elegibilidade, consentimento e inclusão | Release 1 (RF01 a RF11) |
| 8 | Agendamento, reagendamento e consulta de visita (Coordenador) | RF12 |
| 9 | Participante e sessão do aplicativo móvel: login, logout, estudos, próximas visitas, histórico e acessos negados | RF17, RF18 e sessão do app |
| 10 | Registro de visitas, correções e resultados (Coordenador) | RF13 e RF14 |
| 11 | Histórico, retirada e acesso por perfil | RF15 e RF16 |
| 12 | Encerrar sessão e rota protegida sem sessão | RF02 |

## Observações de execução

- **Sem identificadores fixos:** estudo, participação e visitas são criados e guardados em variáveis durante a própria execução. A coleção não depende de dados prévios no banco e pode ser executada mais de uma vez.
- **Datas calculadas:** a API só agenda visitas de hoje em diante e dentro do período do estudo, e só registra como realizada ou ausente uma visita de hoje ou anterior. Por isso o estudo da pasta 6 começa na data da execução (fuso America/Recife) e as visitas usam a hora atual.
- **Perfis e sessões:** cada pasta faz o login do perfil de que precisa (Pesquisador, Coordenador ou Participante) e encerra a sessão antes de trocar de perfil.
- **Respostas verificadas:** além do status HTTP, os testes conferem o código de erro (por exemplo `VISITA_JA_AGENDADA`, `DATA_VISITA_INVALIDA`, `CORRECAO_BLOQUEADA`, `RESULTADO_JA_REGISTRADO`, `PARTICIPACAO_JA_RETIRADA`) e o conteúdo das respostas do participante, que não pode trazer motivo nem justificativa.

## Limitações conhecidas

- A expiração real da sessão por tempo não é simulada pelo Runner. O cenário é coberto pela rota protegida sem sessão, que devolve 401.
- A coleção usa uma única conta de participante. A tentativa de consultar dados de outro participante é coberta pelo 404 ao filtrar um estudo sem vínculo.
- Cenários de acesso negado para o perfil Administrador nas rotas de histórico e retirada ainda não foram incluídos.

## Onde ver os resultados

Os resultados por cenário estão na [tabela de testes da Release 2](../../tabela-de-testes.md), e os prints de cada requisito estão nas pastas `rf12` a `rf18` desta pasta.