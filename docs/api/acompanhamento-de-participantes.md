# Contrato preliminar de acompanhamento de participantes

> **Estado: rascunho para alinhamento no início da Sprint 3.** Os caminhos e códigos abaixo são propostas de contrato. As operações ainda precisam ser confrontadas com as rotas que forem implementadas no backend. Este documento não significa que essas rotas já estejam disponíveis no Swagger.

Este documento descreve a proposta de API para agendamento e registro de visitas, resultados de avaliações, retirada de participantes e consultas do participante no aplicativo. A web e o aplicativo utilizam a mesma API e os mesmos dados persistidos.

A modelagem do domínio está em [RF12 a RF18](../modelagem/RF12-RF18.md). A documentação geral sobre Swagger e OpenAPI está em [OpenAPI](openapi.md).

## Convenções

As rotas protegidas exigem uma sessão autenticada pelo cookie `JSESSIONID`. Operações que alteram dados também exigem o token CSRF no cabeçalho `X-CSRF-TOKEN`.

Datas e horários são enviados como `Instant` no formato ISO 8601, preferencialmente em UTC, por exemplo, `2026-11-15T13:30:00Z`.

As respostas de erro usam o formato já adotado pelo projeto:

```json
{
  "codigo": "DATA_VISITA_INVALIDA",
  "mensagem": "A data da visita está fora do período permitido.",
  "errosCampos": {
    "dataHora": "Informe uma data válida."
  }
}
```

`errosCampos` é omitido quando o problema não está associado a campos específicos. No código atual, cada campo está associado a uma mensagem textual.

## Perfis e permissões propostas

| Operação | Perfil permitido |
|---|---|
| Agendar, reagendar e registrar visitas | Coordenador vinculado ao estudo |
| Registrar e editar resultados | Coordenador vinculado ao estudo |
| Registrar retirada | Coordenador vinculado ao estudo |
| Consultar histórico completo | Pesquisador responsável ou coordenador vinculado |
| Consultar estudos, próximas visitas e comparecimento no app | Participante autenticado, apenas para seus próprios dados |
| Acessar estas operações | Administrador, não permitido |

Uma sessão ausente ou inválida retorna `401`. Perfil sem permissão ou falha de CSRF retorna `403`. Recursos inexistentes ou fora do vínculo autorizado retornam `404`, evitando revelar dados de outro estudo ou participante.

## Rotas web propostas

Todos os caminhos de gestão começam com `/estudos/{estudoId}`. As operações de escrita exigem sessão, permissão e CSRF.

| Método | Caminho | Finalidade | Sucesso proposto |
|---|---|---|---|
| GET | `/estudos/{estudoId}/participacoes` | Listar participantes incluídos e suas situações | `200` |
| POST | `/estudos/{estudoId}/participacoes/{participacaoId}/visitas` | Agendar visita | `201` |
| PUT | `/estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}` | Reagendar visita ainda pendente | `200` |
| PATCH | `/estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/situacao` | Registrar realização, ausência ou cancelamento | `200` |
| POST | `/estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/correcoes` | Corrigir situação final, preservando o histórico | `201` |
| POST | `/estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados` | Registrar resultado de uma atividade prevista | `201` |
| PUT | `/estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados/{resultadoId}` | Editar resultado existente | `200` |
| POST | `/estudos/{estudoId}/participacoes/{participacaoId}/retirada` | Registrar retirada | `200` |
| GET | `/estudos/{estudoId}/participacoes/{participacaoId}/historico` | Consultar histórico completo | `200` |

### Listar participantes incluídos

`GET /estudos/{estudoId}/participacoes`

Retorna as participações do estudo, inclusive as retiradas, para que a tela possa identificá-las e impedir novos agendamentos.

Exemplo de resposta:

```json
[
  {
    "id": 120,
    "participanteId": 45,
    "participanteNome": "Ana Participante",
    "dataInclusao": "2026-11-10T12:00:00Z",
    "situacao": "ATIVA"
  },
  {
    "id": 121,
    "participanteId": 46,
    "participanteNome": "Bruno Participante",
    "dataInclusao": "2026-11-10T12:30:00Z",
    "situacao": "RETIRADA",
    "dataRetirada": "2026-11-12T14:00:00Z"
  }
]
```

### Agendar visita

`POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas`

Requisição:

```json
{
  "visitaPrevistaId": 18,
  "dataHora": "2026-11-15T13:30:00Z"
}
```

A visita prevista deve pertencer ao protocolo do estudo. A data deve estar dentro do período do estudo e não pode ser anterior ao dia atual. Só pode existir uma visita `AGENDADA` para a mesma participação e visita prevista.

Resposta `201`:

```json
{
  "id": 501,
  "participacaoId": 120,
  "visitaPrevistaId": 18,
  "nomeVisita": "Visita inicial",
  "dataHora": "2026-11-15T13:30:00Z",
  "situacao": "AGENDADA",
  "motivo": null,
  "registradoPorId": null,
  "registradoEm": null
}
```

### Reagendar visita

`PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}`

Requisição:

```json
{
  "dataHora": "2026-11-16T13:30:00Z"
}
```

Só é permitido alterar a data enquanto a visita estiver `AGENDADA`. O ID da visita e a visita prevista permanecem os mesmos. Resposta `200` com a representação atualizada da visita.

### Registrar situação da visita

`PATCH /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/situacao`

Requisição para registrar realização ou ausência:

```json
{
  "situacao": "REALIZADA"
}
```

Requisição para registrar ausência com motivo:

```json
{
  "situacao": "AUSENTE",
  "motivo": "Participante não compareceu"
}
```

Requisição para cancelar:

```json
{
  "situacao": "CANCELADA",
  "motivo": "Unidade de atendimento indisponível"
}
```

A visita precisa estar `AGENDADA`. `REALIZADA` e `AUSENTE` só podem ser registradas a partir do dia agendado. `CANCELADA` pode ser registrada antes desse dia e exige motivo. Resposta `200` com a visita atualizada e os dados de quem registrou e quando.

### Corrigir situação da visita

`POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/correcoes`

Requisição:

```json
{
  "situacao": "REALIZADA",
  "justificativa": "Registro anterior foi feito incorretamente"
}
```

A correção troca uma situação final por outra e não pode voltar para `AGENDADA`. A justificativa é obrigatória, de 1 a 500 caracteres após remover espaços das pontas. A proposta é bloquear a correção se a visita já tiver resultados, se o estudo estiver encerrado ou se a participação estiver retirada.

Resposta `201`:

```json
{
  "id": 901,
  "visitaAgendadaId": 501,
  "situacaoAnterior": "AUSENTE",
  "situacaoNova": "REALIZADA",
  "justificativa": "Registro anterior foi feito incorretamente",
  "corrigidaPorId": 12,
  "corrigidaEm": "2026-11-16T15:00:00Z"
}
```

### Registrar resultado de atividade

`POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados`

Requisição:

```json
{
  "atividadePrevistaId": 31,
  "texto": "Resultado fictício da avaliação"
}
```

Só é permitido registrar resultado em visita `REALIZADA`. A atividade precisa pertencer à visita prevista associada à visita agendada. O resultado deve ter de 1 a 1.000 caracteres após remover espaços das pontas. O preenchimento pode ser parcial, com no máximo um resultado por atividade prevista em cada visita.

Resposta `201`:

```json
{
  "id": 701,
  "visitaAgendadaId": 501,
  "atividadePrevistaId": 31,
  "descricaoAtividade": "Avaliação inicial",
  "texto": "Resultado fictício da avaliação",
  "registradoPorId": 12,
  "registradoEm": "2026-11-16T15:10:00Z",
  "atualizadoPorId": null,
  "atualizadoEm": null
}
```

### Editar resultado

`PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados/{resultadoId}`

Requisição:

```json
{
  "texto": "Resultado fictício corrigido"
}
```

A edição não remove o resultado original do histórico de auditoria definido para a entidade. A proposta permite editar enquanto o estudo não estiver encerrado. Resposta `200` com os dados atualizados.

### Registrar retirada

`POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada`

Requisição:

```json
{
  "motivo": "Participante solicitou a retirada do estudo"
}
```

A retirada é irreversível, exige motivo de 1 a 500 caracteres e registra data e usuário no backend. A participação permanece no histórico e continua contando como inclusão histórica. A proposta cancela as visitas `AGENDADA`, preservando visitas já realizadas e seus resultados.

Resposta `200`:

```json
{
  "participacaoId": 120,
  "situacao": "RETIRADA",
  "dataRetirada": "2026-11-16T16:00:00Z",
  "motivoRetirada": "Participante solicitou a retirada do estudo",
  "retiradaPorId": 12
}
```

### Consultar histórico completo

`GET /estudos/{estudoId}/participacoes/{participacaoId}/historico`

Disponível para pesquisador responsável e coordenador vinculado, inclusive quando o estudo está encerrado ou a participação está retirada. A proposta retorna visitas e retirada em ordem cronológica, da mais antiga para a mais recente.

Exemplo de resposta:

```json
{
  "participacaoId": 120,
  "itens": [
    {
      "tipo": "VISITA",
      "visitaAgendadaId": 501,
      "nomeVisita": "Visita inicial",
      "dataHora": "2026-11-15T13:30:00Z",
      "situacao": "REALIZADA",
      "motivo": null,
      "registradoPorId": 12,
      "registradoEm": "2026-11-15T14:00:00Z",
      "resultados": [
        {
          "atividadePrevistaId": 31,
          "descricaoAtividade": "Avaliação inicial",
          "texto": "Resultado fictício"
        }
      ],
      "correcoes": []
    },
    {
      "tipo": "RETIRADA",
      "dataRetirada": "2026-11-20T14:00:00Z",
      "motivo": "Retirada solicitada",
      "retiradaPorId": 12
    }
  ]
}
```

## Rotas propostas para o aplicativo

Estas consultas se baseiam na sessão e não recebem identificador de participante na URL. O participante só acessa os próprios dados.

| Método | Caminho | Conteúdo |
|---|---|---|
| GET | `/participante/estudos` | Estudos em que está incluído, inclusive os retirados |
| GET | `/participante/visitas/proximas` | Visitas `AGENDADA` de hoje em diante, em ordem crescente |
| GET | `/participante/visitas/historico` | Visitas realizadas, ausências e cancelamentos, da mais recente para a mais antiga |

Nas duas consultas de visitas, `estudoId` pode ser usado como parâmetro opcional. Se informado para estudo sem participação do usuário autenticado, a resposta proposta é `404`.

Exemplo de `GET /participante/estudos`:

```json
[
  {
    "estudoId": 30,
    "titulo": "Estudo de acompanhamento",
    "objetivo": "Objetivo fictício",
    "estado": "EXECUCAO",
    "dataInicio": "2026-11-01",
    "dataFim": "2026-12-01",
    "situacaoParticipacao": "ATIVA"
  }
]
```

Exemplo de `GET /participante/visitas/proximas`:

```json
[
  {
    "visitaAgendadaId": 501,
    "estudoId": 30,
    "tituloEstudo": "Estudo de acompanhamento",
    "nomeVisita": "Visita inicial",
    "dataHora": "2026-11-15T13:30:00Z"
  }
]
```

Exemplo de `GET /participante/visitas/historico`:

```json
[
  {
    "visitaAgendadaId": 499,
    "estudoId": 30,
    "tituloEstudo": "Estudo de acompanhamento",
    "nomeVisita": "Visita anterior",
    "dataHora": "2026-11-10T13:30:00Z",
    "situacao": "REALIZADA"
  }
]
```

O app não recebe resultados, motivos, justificativas ou dados de quem registrou. Participante retirado continua vendo o estudo marcado como `RETIRADA`, mas não deve ter próximas visitas pendentes.

## Erros propostos

Os códigos abaixo são sugestões para o rascunho. Antes da conclusão da sprint, devem ser comparados com os códigos lançados pelos serviços e pelo tratador global de erros.

| HTTP | Código sugerido | Situação |
|---|---|---|
| `400` | `PARTICIPACAO_INVALIDA` | Participação retirada ou incompatível com a operação |
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo fora de recrutamento ou execução para escrita |
| `400` | `DATA_VISITA_INVALIDA` | Data anterior ao permitido ou fora do período do estudo |
| `400` | `TRANSICAO_VISITA_INVALIDA` | Visita não está agendada ou a data não permite o registro |
| `400` | `CORRECAO_BLOQUEADA` | Correção vedada por resultados, retirada ou encerramento |
| `400` | `RESULTADO_INVALIDO` | Visita não realizada ou atividade não pertence à visita prevista |
| `400` | `VALIDACAO_INVALIDA` | Campo obrigatório vazio ou acima do limite |
| `401` | Conforme autenticação existente | Sessão ausente, inválida ou expirada |
| `403` | Conforme segurança existente | Perfil sem permissão ou CSRF ausente/inválido |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo, participação ou visita não existe ou está fora do vínculo autorizado |
| `409` | `VISITA_JA_AGENDADA` | Já existe visita agendada para a mesma participação e visita prevista |
| `409` | `RESULTADO_JA_REGISTRADO` | Já existe resultado para a mesma visita e atividade |

## Conferência no fim da sprint

Quando os endpoints forem implementados:

1. Conferir cada caminho, método, corpo, resposta e status HTTP com controllers e DTOs.
2. Conferir perfis, sessão, CSRF e ocultação de recursos fora do vínculo autorizado.
3. Conferir no `/v3/api-docs` que o OpenAPI gerado descreve as operações implementadas, sem rotas apenas planejadas.
4. Atualizar este documento para remover o rótulo de rascunho e corrigir diferenças entre proposta e implementação.
5. Atualizar [OpenAPI](openapi.md) e os testes do contrato, se necessário.

A publicação do rascunho não significa que a integração da web ou do aplicativo já esteja concluída.