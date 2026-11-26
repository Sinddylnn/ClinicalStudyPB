# Contrato do painel de indicadores (RF21)

> **Estado em 26/11/2026:** contagens do painel implementadas no backend (RF21, task #4061).

## Perfis e permissões

A consulta é permitida ao pesquisador responsável pelo estudo
e ao coordenador vinculado.

A rota exige sessão autenticada pelo cookie `JSESSIONID`.
Por ser uma operação de leitura, não exige token CSRF.

## Consultar indicadores (RF21: implementado)

`GET /estudos/{estudoId}/indicadores`

Retorna as contagens de candidatos, participantes e visitas
do estudo informado.

### Regras de contagem

| Campo | Regra |
|---|---|
| `totalCandidatos` | Todos os candidatos cadastrados no estudo |
| `totalIncluidos` | Total histórico de participações, incluindo as retiradas |
| `participantesAtivos` | Participações com situação `ATIVA` |
| `participantesRetirados` | Participações com situação `RETIRADA` |
| `visitasRealizadas` | Visitas com situação `REALIZADA` |
| `visitasPendentes` | Visitas com situação `AGENDADA`, independentemente da data |

Visitas ausentes e canceladas não são contabilizadas como
realizadas ou pendentes.

Estudos sem registros retornam os indicadores com valor zero.
A consulta permanece disponível para estudos encerrados,
desde que o usuário possua vínculo autorizado.

### Exemplo de resposta (200)

```json
{
  "estudoId": 10,
  "totalCandidatos": 8,
  "totalIncluidos": 5,
  "participantesAtivos": 3,
  "participantesRetirados": 2,
  "visitasRealizadas": 7,
  "visitasPendentes": 4
}
```

### Respostas HTTP

| HTTP | Código de erro | Situação |
|---|---|---|
| `200` | — | Indicadores consultados com sucesso |
| `400` | `REQUISICAO_INVALIDA` | Identificador do estudo com formato inválido |
| `401` | `AUTENTICACAO_NECESSARIA` | Sessão ausente ou inválida |
| `403` | `ACESSO_NEGADO` | Perfil sem permissão |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo inexistente ou fora do vínculo autorizado |

## OpenAPI

A operação está documentada no grupo **Painel de indicadores**
do Swagger UI.

Consulte também a documentação geral em [OpenAPI](openapi.md).
