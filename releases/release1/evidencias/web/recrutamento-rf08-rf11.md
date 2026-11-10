# Evidências da web: recrutamento (RF08 a RF11)

| Item | Valor |
|---|---|
| Data | 03/11/2026 |
| Branch e commit | `web`, `c8a71b0` |
| Executado por | Sinddy Nóbrega |
| Perfil usado | Coordenador (Carlos Coordenador), vinculado ao estudo "Acompanhamento de hábitos", em Recrutamento |
| Navegador | Microsoft Edge, janela de 1920 × 940 |
| Task | 3394 (T54) |

## Ambiente

As capturas usam os **serviços simulados** da web (`VITE_ESTUDOS_API`, `VITE_CANDIDATOS_API` e
`VITE_PROTOCOLO_API` com o valor `simulado`). Na data da execução, o backend ainda não tinha as rotas
de candidatos, elegibilidade, consentimento e inclusão (T41, T42 e T36).
A numeração começa em 28 porque de 19 a 27 ficam as evidências de RF05 a RF07. Os serviços simulados seguem
as mesmas regras e mensagens previstas para a API, e os dados são fictícios.

Como o login depende do backend, a sessão de coordenador foi respondida por um servidor local de teste.
Estas evidências mostram o comportamento das telas.

Em 09/11/2026, com as rotas já na main, os mesmos fluxos foram conferidos com a API real (backend no
Docker e `VITE_CANDIDATOS_API=real`): cadastro, e-mail repetido (409), avaliação elegível, inelegível
e incompleta, consentimento, inclusão, inclusão repetida (409) e os bloqueios depois da inclusão
funcionaram sem mudança nas telas. A conferência corrigiu a exibição dos horários vindos da API, que
aparecia em UTC.

## Cenários de sucesso

| # | Requisito | Cenário | Evidência |
|---|---|---|---|
| 28 | RF08 | Lista de candidatos do estudo, com elegibilidade, consentimento, situação e próxima etapa | [28-recrutamento-lista-candidatos.png](28-recrutamento-lista-candidatos.png) |
| 29 | RF08 | Candidato cadastrado: aviso de sucesso e candidato novo destacado na lista, sem avaliação | [29-candidato-cadastrado.png](29-candidato-cadastrado.png) |
| 30 | RF09 | Avaliação com o critério de inclusão atendido e o de exclusão ausente: resultado Elegível | [30-elegibilidade-elegivel.png](30-elegibilidade-elegivel.png) |
| 31 | RF10 | Consentimento "Aceitou" registrado: aviso de sucesso e próxima etapa "Incluir" | [31-consentimento-registrado.png](31-consentimento-registrado.png) |
| 32 | RF11 | Inclusão com as seis condições atendidas e a conta com o mesmo e-mail do candidato | [32-inclusao-condicoes-atendidas.png](32-inclusao-condicoes-atendidas.png) |
| 33 | RF11 | Participante incluído: aviso de sucesso, data da inclusão e vagas atualizadas (2 de 30) | [33-participante-incluido.png](33-participante-incluido.png) |

## Cenários de erro e bloqueio

| # | Requisito | Regra que impede a operação | Evidência |
|---|---|---|---|
| 34 | RF08 | Nome vazio e e-mail fora do formato: os campos ficam destacados e nada é enviado | [34-candidato-campos-invalidos.png](34-candidato-campos-invalidos.png) |
| 35 | RF08 | E-mail já cadastrado como candidato no mesmo estudo (409) | [35-candidato-email-repetido.png](35-candidato-email-repetido.png) |
| 36 | RF08 | Estudo fora de Recrutamento: o formulário de cadastro não aparece | [36-candidato-estudo-fora-recrutamento.png](36-candidato-estudo-fora-recrutamento.png) |
| 37 | RF09 | Avaliação sem nenhuma resposta não pode ser salva | [37-elegibilidade-sem-resposta.png](37-elegibilidade-sem-resposta.png) |
| 38 | RF09 | Critério de exclusão presente: candidato Inelegível e inclusão bloqueada | [38-elegibilidade-inelegivel.png](38-elegibilidade-inelegivel.png) |
| 39 | RF10 | Consentimento sem resposta não pode ser registrado | [39-consentimento-sem-resposta.png](39-consentimento-sem-resposta.png) |
| 40 | RF10 | Candidato sem avaliação de elegibilidade: o consentimento fica bloqueado | [40-consentimento-sem-avaliacao.png](40-consentimento-sem-avaliacao.png) |
| 41 | RF11 | Consentimento recusado: inclusão bloqueada | [41-inclusao-consentimento-recusado.png](41-inclusao-consentimento-recusado.png) |
| 42 | RF11 | Candidato inelegível, sem consentimento e sem conta escolhida: inclusão bloqueada | [42-inclusao-candidato-inelegivel.png](42-inclusao-candidato-inelegivel.png) |
| 43 | RF11 | Conta de participante com e-mail diferente do candidato: inclusão bloqueada | [43-inclusao-email-diferente.png](43-inclusao-email-diferente.png) |

## Ainda falta registrar

- **Prints com a API real** de RF08 a RF11: os fluxos já foram conferidos (ver Ambiente), mas os prints
  acima são do serviço simulado.
- **Limite de participantes atingido** (409 `LIMITE_ATINGIDO`): os dados simulados não têm estudo com as
  vagas esgotadas. O cenário está coberto pelos testes automatizados da tela de inclusão.

## Como repetir

1. No `web/.env`, deixe os três serviços como `simulado` (ou apague as linhas, já que esse é o padrão).
2. Inicie o banco e o backend pelo [guia Docker](../../../../docs/execucao-docker.md), que tem o login,
   e a web com `npm run dev` (no Windows PowerShell, `npm.cmd run dev`).
3. Entre com a conta fictícia de coordenador do guia. Os estudos simulados estão vinculados ao
   coordenador de id 3; se a conta tiver outro id, eles aparecem como "não encontrado".
4. Abra o estudo "Acompanhamento de hábitos" e siga os cenários na ordem da tabela. Os dados voltam ao
   estado inicial ao recarregar a página.
