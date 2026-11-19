# Contrato de acompanhamento de participantes (RF12 a RF18)

> **Estado em 18/11/2026:** rotas de consulta, agendamento e reagendamento (RF12, task #3964), registro e correção da situação de visitas (RF13, task #3965), cadastro e edição de resultados de atividades (RF14, task #3958), retirada de participante (RF16, task #3957) e consultas do aplicativo (RF17 e RF18, task #3951) implementadas no backend. A consulta de histórico completo de gestão (RF15) continua proposta.

Este documento reúne os contratos implementados para RF12, RF13, RF14, RF16, RF17 e RF18, além da proposta de consulta do histórico completo (RF15). A web e o aplicativo utilizam a mesma API e os mesmos dados persistidos.

A modelagem do domínio está em [RF12 a RF18](../modelagem/RF12-RF18.md). A documentação geral sobre Swagger e OpenAPI está em [OpenAPI](openapi.md).

## Convenções

As rotas protegidas exigem uma sessão autenticada pelo cookie `JSESSIONID`. Operações que alteram dados também exigem o token CSRF no cabeçalho `X-CSRF-TOKEN`.

Datas e horários são enviados como `Instant` no formato ISO 8601, preferencialmente em UTC, por exemplo, `2026-11-15T13:30:00Z`.  
O backend compara o dia da visita no fuso `America/Recife`. Por isso, uma visita às 22h locais do último dia do estudo é aceita, mesmo sendo o dia seguinte em UTC.

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

## Perfis e permissões

| Operação | Perfil permitido |
|---|---|
| Agendar, reagendar, registrar e corrigir a situação de visitas | Coordenador vinculado ao estudo |
| Registrar e editar resultados | Coordenador vinculado ao estudo |
| Registrar retirada | Coordenador vinculado ao estudo |
| Consultar histórico completo | Pesquisador responsável ou coordenador vinculado |
| Listar as participações do estudo | Pesquisador responsável ou coordenador vinculado, somente leitura |
| Consultar estudos, próximas visitas e comparecimento no app | Participante autenticado, apenas para seus próprios dados, implementado |
| Acessar estas operações | Administrador, não permitido |


Uma sessão ausente ou inválida retorna `401`. Perfil sem permissão ou falha de CSRF retorna `403`. Recursos inexistentes ou fora do vínculo autorizado retornam `404`, evitando revelar dados de outro estudo ou participante.

## Rotas web: implementadas e propostas

Todos os caminhos de gestão começam com `/estudos/{estudoId}`. As operações de escrita exigem sessão, permissão e CSRF.

| Método | Caminho | Finalidade | Sucesso |
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

Já implementadas na task 3964 (PR #41): `GET /estudos/{estudoId}/participacoes`, `POST .../visitas` e `PUT .../visitas/{visitaAgendadaId}`.

Na task 3965 (RF13), foram implementados o registro de situação da visita (`PATCH .../situacao`) e a correção com histórico (`POST .../correcoes`). Também foi adicionada uma validação que impede o encerramento de estudos em execução enquanto existirem visitas `AGENDADA`.

Na task #3957 (RF16), foi implementado o registro de retirada: `POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada`. Na task #3958 (RF14), foram implementados o cadastro e a edição de resultados de atividades. As consultas do participante para o aplicativo (RF17 e RF18, task #3951) também estão implementadas. A consulta de histórico completo de gestão (RF15) permanece proposta.

### Listar participantes incluídos

`GET /estudos/{estudoId}/participacoes`

Leitura permitida ao coordenador vinculado e ao pesquisador responsável pelo estudo. A lista vem em ordem crescente de `id`, e `dataRetirada` aparece só nas participações retiradas. Um estudo sem participações devolve `[]`.

| HTTP | Situação |
|---|---|
| `200` | Lista devolvida |
| `401` | Sessão ausente ou inválida |
| `403` | Perfil sem permissão (administrador ou participante) |
| `404` | Estudo inexistente ou fora do vínculo (outro pesquisador ou coordenador não vinculado) |

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

Somente o coordenador vinculado agenda; o pesquisador responsável recebe `403`. O estudo deve estar em `RECRUTAMENTO` ou `EXECUCAO` e a participação deve estar `ATIVA`.

| HTTP | Código | Situação |
|---|---|---|
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo fora de recrutamento ou execução |
| `400` | `PARTICIPACAO_INVALIDA` | Participação retirada |
| `400` | `DATA_VISITA_INVALIDA` | Data anterior a hoje ou fora do período do estudo |
| `400` | `VALIDACAO_INVALIDA` | `visitaPrevistaId` ou `dataHora` ausentes, ou `visitaPrevistaId` não positivo |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo, participação ou visita prevista fora do vínculo |
| `409` | `VISITA_JA_AGENDADA` | Já existe visita `AGENDADA` para essa participação e visita prevista |

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

Somente o coordenador vinculado reagenda, com o estudo em `RECRUTAMENTO` ou `EXECUCAO` e a participação `ATIVA`. A nova data segue as mesmas regras do agendamento. O pesquisador responsável recebe `403`.

| HTTP | Código | Situação |
|---|---|---|
| `400` | `TRANSICAO_VISITA_INVALIDA` | Visita não está `AGENDADA` |
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo fora de recrutamento ou execução |
| `400` | `PARTICIPACAO_INVALIDA` | Participação retirada |
| `400` | `DATA_VISITA_INVALIDA` | Data anterior a hoje ou fora do período do estudo |
| `400` | `VALIDACAO_INVALIDA` | `dataHora` ausente |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo fora do vínculo, ou visita que não pertence à participação ou ao estudo da rota |

Não há `409` no reagendamento.


### Registrar situação da visita (RF13: implementado)

`PATCH /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/situacao`

Requisição para registrar realização:

```json
{
  "situacao": "REALIZADA"
}
```

Requisição para registrar ausência com motivo opcional:

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

Somente o **coordenador vinculado ao estudo** pode registrar a situação. O estudo precisa estar em `RECRUTAMENTO` ou `EXECUCAO`, a participação precisa estar `ATIVA` e a visita deve pertencer à participação e ao estudo informados na rota. A visita deve estar `AGENDADA`.

`REALIZADA` e `AUSENTE` são permitidas a partir do **dia agendado**, incluindo o próprio dia, considerando o fuso `America/Recife`. `CANCELADA` é permitida mesmo antes da data da visita, desde que tenha `motivo`. O motivo é opcional em `AUSENTE`, proibido em `REALIZADA` e tem limite de 500 caracteres quando informado. Uma situação final não pode ser registrada novamente pelo `PATCH`; para alterar uma situação final, utiliza-se a rota de correções.

A resposta é `200 OK`, com a representação atualizada da visita, incluindo `situacao`, `motivo`, `registradoPorId` e `registradoEm`.

| HTTP | Código / retorno | Quando ocorre |
|---|---|---|
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo em `PLANEJAMENTO` ou `ENCERRADO` |
| `400` | `PARTICIPACAO_INVALIDA` | Participação `RETIRADA` |
| `400` | `TRANSICAO_VISITA_INVALIDA` | Visita já finalizada, alvo `AGENDADA` ou realização/ausência antes do dia previsto |
| `400` | `VALIDACAO_INVALIDA` | Situação ausente ou motivo ausente, excessivo ou incompatível com a situação |
| `401` | Não autenticado | Sessão ausente ou inválida |
| `403` | Acesso negado | Perfil sem permissão ou CSRF ausente/inválido |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo, participação ou visita inexistente ou fora do vínculo da rota |

### Corrigir situação da visita (RF13: implementado)

`POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/correcoes`

Requisição para corrigir `CANCELADA` para `REALIZADA`:

```json
{
  "situacao": "REALIZADA",
  "justificativa": "A visita ocorreu, mas havia sido registrada como cancelada",
  "motivo": null
}
```

Requisição para corrigir uma situação final para `CANCELADA`:

```json
{
  "situacao": "CANCELADA",
  "justificativa": "O registro anterior estava incorreto",
  "motivo": "Participante solicitou o cancelamento"
}
```

A correção exige **`situacao` e `justificativa`**, que deve ter de 1 a 500 caracteres após remover os espaços das pontas. O campo **`motivo` faz parte da requisição**: é obrigatório para nova situação `CANCELADA`, opcional para `AUSENTE` e deve ficar vazio para `REALIZADA` (limite de 500 caracteres quando informado).

Somente o **coordenador vinculado** pode corrigir, com o estudo em `RECRUTAMENTO` ou `EXECUCAO` e a participação `ATIVA`. É permitido trocar apenas **uma situação final por outra situação final diferente**; não se pode corrigir uma visita ainda `AGENDADA` nem retornar para `AGENDADA`. Uma correção para `REALIZADA` ou `AUSENTE` só pode ocorrer a partir do dia agendado, no fuso `America/Recife`.

Se já houver resultados vinculados à visita, a correção é bloqueada. Caso contrário, o backend atualiza a situação e registra um histórico com a situação anterior, a nova situação, a justificativa, o motivo anterior, o motivo novo, quem corrigiu e quando. Ao corrigir `CANCELADA` para `REALIZADA`, o motivo do cancelamento permanece em `motivoAnterior` no histórico, enquanto o `motivo` atual da visita passa a ser `null`.

Resposta `201 Created`, contendo os dados do registro de correção (exemplo ilustrativo):

```json
{
  "id": 901,
  "visitaAgendadaId": 501,
  "situacaoAnterior": "CANCELADA",
  "situacaoNova": "REALIZADA",
  "justificativa": "A visita ocorreu, mas havia sido registrada como cancelada",
  "corrigidaPorId": 12,
  "corrigidaEm": "2026-11-16T15:00:00Z"
}
```

A resposta não inclui `motivoAnterior` e `motivoNovo`; ambos ficam guardados no histórico da correção.

| HTTP | Código / retorno | Quando ocorre |
|---|---|---|
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo fora de `RECRUTAMENTO` ou `EXECUCAO` |
| `400` | `PARTICIPACAO_INVALIDA` | Participação `RETIRADA` |
| `400` | `TRANSICAO_VISITA_INVALIDA` | Visita ainda `AGENDADA`, destino `AGENDADA`, destino igual à situação atual ou realização/ausência de visita futura |
| `400` | `VALIDACAO_INVALIDA` | `situacao` ou `justificativa` inválidas, ou motivo incompatível com a nova situação |
| `400` | `CORRECAO_BLOQUEADA` | Visita com resultado de atividade já registrado |
| `401` | Não autenticado | Sessão ausente ou inválida |
| `403` | Acesso negado | Perfil sem permissão ou CSRF ausente/inválido |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo, participação ou visita inexistente ou fora do vínculo da rota |

### Encerramento de estudo com visitas pendentes (regra RF13)

Na transição `EXECUCAO` → `ENCERRADO`, o backend verifica as visitas do estudo com situação `AGENDADA`. Se houver pendências, bloqueia o encerramento com **HTTP `400` e código `VISITAS_PENDENTES`**. Visitas previstas no protocolo que ainda não foram agendadas não entram nessa contagem.

A mensagem informa a quantidade de visitas pendentes e os IDs dos participantes envolvidos, sem repetir participantes que tenham mais de uma visita pendente.

### Registrar resultado de atividade (RF14)

`POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados`

Requisição:

```json
{
  "atividadePrevistaId": 31,
  "texto": "Resultado fictício da avaliação"
}
```

O cadastro é exclusivo do coordenador vinculado ao estudo. O estudo deve estar em `RECRUTAMENTO` ou `EXECUCAO`, a participação deve estar `ATIVA` e a visita deve estar `REALIZADA`. A atividade precisa pertencer à visita prevista associada à visita agendada. O resultado deve ter de 1 a 1.000 caracteres após remover os espaços das pontas. O preenchimento pode ser parcial, com no máximo um resultado por atividade prevista em cada visita. Depois do primeiro resultado, a correção da situação da visita é bloqueada.

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

### Editar resultado (RF14)

`PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados/{resultadoId}`

Requisição:

```json
{
  "texto": "Resultado fictício corrigido"
}
```

A edição altera apenas o campo `texto`, sem trocar a atividade prevista ou excluir o resultado. Exige coordenador vinculado, estudo em `RECRUTAMENTO` ou `EXECUCAO`, participação `ATIVA` e visita `REALIZADA`. O resultado precisa pertencer à visita informada na URL. O texto continua obrigatório, com 1 a 1.000 caracteres depois de remover os espaços das pontas.

Os campos `registradoPorId` e `registradoEm` permanecem com os valores do cadastro. Os campos `atualizadoPorId` e `atualizadoEm` identificam a última edição. **A entidade atual não guarda versões anteriores do texto:** ao editar, o campo `texto` passa a conter o valor atualizado.

Resposta `200`:

```json
{
  "id": 701,
  "visitaAgendadaId": 501,
  "atividadePrevistaId": 31,
  "descricaoAtividade": "Avaliação inicial",
  "texto": "Resultado fictício corrigido",
  "registradoPorId": 12,
  "registradoEm": "2026-11-16T15:10:00Z",
  "atualizadoPorId": 12,
  "atualizadoEm": "2026-11-17T20:05:00Z"
}
```

**Erros das operações de resultados (RF14)**

| HTTP | Código / retorno | Quando ocorre |
|---|---|---|
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo fora de `RECRUTAMENTO` ou `EXECUCAO` |
| `400` | `PARTICIPACAO_INVALIDA` | Participação `RETIRADA` |
| `400` | `RESULTADO_INVALIDO` | Visita não realizada ou atividade sem vínculo com a visita prevista |
| `400` | `VALIDACAO_INVALIDA` | Atividade ausente/não positiva no cadastro ou texto ausente, vazio ou com mais de 1.000 caracteres |
| `401` | Não autenticado | Sessão ausente ou inválida |
| `403` | Acesso negado | Perfil sem permissão ou CSRF ausente/inválido |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo, visita ou resultado inexistente ou fora dos vínculos da URL |
| `409` | `RESULTADO_JA_REGISTRADO` | Cadastro de resultado duplicado para a mesma visita e atividade |

### Registrar retirada (RF16, implementado)

`POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada`

Requisição:

```json
{
  "motivo": "Participante solicitou a retirada do estudo"
}
```

Somente o **coordenador vinculado ao estudo** registra a retirada, com o estudo em `RECRUTAMENTO` ou `EXECUCAO` e a participação `ATIVA`. O motivo é obrigatório, de 1 a 500 caracteres após remover os espaços das pontas. A participação deve pertencer ao estudo da rota.

A retirada é **irreversível**. Na mesma transação, o backend marca a participação como `RETIRADA` (com data, motivo e responsável) e cancela as visitas `AGENDADA` da participação, com o motivo automático "Retirada do participante". Visitas já finalizadas e seus resultados são preservados. A participação continua contando como inclusão histórica, portanto **a vaga não é liberada**. A conta do participante e seus outros estudos não são afetados.

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

| HTTP | Código / retorno | Quando ocorre |
|---|---|---|
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo fora de `RECRUTAMENTO` ou `EXECUCAO` |
| `400` | `PARTICIPACAO_JA_RETIRADA` | Participação já está `RETIRADA` |
| `400` | `VALIDACAO_INVALIDA` | `motivo` ausente, em branco ou acima de 500 caracteres, com erro de campo em `errosCampos` |
| `401` | Não autenticado | Sessão ausente ou inválida |
| `403` | Acesso negado | Perfil sem permissão ou CSRF ausente ou inválido |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo ou participação inexistente ou fora do vínculo da rota |

Os pedidos pendentes de reagendamento ligados às visitas canceladas serão cancelados quando o RF19 existir, na Sprint 4. A solicitação de retirada pelo app (RF20) não processa a retirada; o coordenador a conclui por esta operação.

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

## Rotas do aplicativo (RF17 e RF18: implementadas)

Estas consultas se baseiam na sessão e não recebem identificador de participante na URL: a conta vem do cookie de sessão. Exigem perfil `PARTICIPANTE`, são somente leitura e não exigem CSRF. O participante só acessa os próprios dados.

| Método | Caminho | Conteúdo |
|---|---|---|
| GET | `/participante/estudos` | Estudos em que está incluído, inclusive os retirados, em ordem crescente do id da participação |
| GET | `/participante/visitas/proximas` | Visitas `AGENDADA` com dia de hoje em diante (fuso `America/Recife`), em ordem crescente de data |
| GET | `/participante/visitas/historico` | Visitas `REALIZADA`, `AUSENTE` e `CANCELADA`, da mais recente para a mais antiga |

Nas duas consultas de visitas, `estudoId` é um parâmetro de consulta opcional (`?estudoId=30`). Se o estudo não estiver entre as participações da conta, a resposta é `404`, sem revelar se ele existe. Um valor não numérico retorna `400`.

Uma visita `AGENDADA` cuja data já passou continua pendente: não aparece nas próximas nem no histórico até o coordenador registrá-la.

O app não recebe resultados, motivos, justificativas, correções nem dados de quem registrou. Participante retirado continua vendo o estudo com `situacaoParticipacao` igual a `RETIRADA`; suas visitas pendentes foram canceladas na retirada e aparecem no histórico como `CANCELADA`.

| HTTP | Situação |
|---|---|
| `200` | Consulta concluída; lista vazia quando não há dados |
| `400` | `estudoId` com formato inválido |
| `401` | Sessão ausente, expirada ou conta desativada |
| `403` | Perfil diferente de participante |
| `404` | `estudoId` sem participação da conta autenticada |

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
    "dataHora": "2027-02-20T13:30:00Z"
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

## Códigos de erro

Os códigos das operações implementadas de RF12, RF13, RF14, RF16, RF17 e RF18 foram conferidos com os cenários de teste e a modelagem. Os códigos da RF15 continuam propostos e precisam ser confirmados quando sua rota for implementada.

| HTTP | Código / retorno | Situação |
|---|---|---|
| `400` | `PARTICIPACAO_INVALIDA` | Participação retirada ou incompatível com a operação |
| `400` | `PARTICIPACAO_JA_RETIRADA` | Tentativa de retirar novamente uma participação já retirada |
| `400` | `ESTADO_ESTUDO_INVALIDO` | Estudo fora de recrutamento ou execução para escrita |
| `400` | `DATA_VISITA_INVALIDA` | Data anterior ao permitido ou fora do período do estudo |
| `400` | `TRANSICAO_VISITA_INVALIDA` | Registro/reagendamento fora de `AGENDADA`, correção entre situações finais inválida ou realização/ausência antes do dia agendado |
| `400` | `CORRECAO_BLOQUEADA` | Correção impedida por resultados já vinculados à visita |
| `400` | `RESULTADO_INVALIDO` | Visita não realizada ou atividade não pertence à visita prevista |
| `400` | `VALIDACAO_INVALIDA` | Campo obrigatório ausente/vazio, acima do limite ou motivo incompatível com a situação |
| `400` | `VISITAS_PENDENTES` | Estudo em execução não pode ser encerrado enquanto houver visita `AGENDADA` |
| `401` | Conforme autenticação existente | Sessão ausente, inválida ou expirada |
| `403` | Conforme segurança existente | Perfil sem permissão ou CSRF ausente/inválido |
| `404` | `RECURSO_NAO_ENCONTRADO` | Estudo, participação, visita ou resultado não existe ou está fora do vínculo autorizado |
| `409` | `VISITA_JA_AGENDADA` | Já existe visita agendada para a mesma participação e visita prevista |
| `409` | `RESULTADO_JA_REGISTRADO` | Já existe resultado para a mesma visita e atividade |


## Conferência ao concluir os requisitos restantes

Para novas rotas e ajustes de contrato:

1. Conferir cada caminho, método, corpo, resposta e status HTTP com controllers e DTOs.
2. Conferir perfis, sessão, CSRF e ocultação de recursos fora do vínculo autorizado.
3. Conferir no `/v3/api-docs` que o OpenAPI gerado descreve as operações implementadas, sem rotas apenas planejadas.
4. Atualizar a seção da RF15 quando sua rota for implementada.
5. Atualizar [OpenAPI](openapi.md) e os testes do contrato, se necessário.

As rotas de RF12, RF13, RF14, RF16, RF17 e RF18 estão implementadas no backend. A integração da web com a RF14 é uma etapa independente; a consulta de histórico completo de gestão (RF15) permanece proposta.
