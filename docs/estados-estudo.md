# Mudança de estado do estudo

O backend oferece `PATCH /estudos/{id}/estado` para o pesquisador responsável alterar o estado do estudo. A operação exige sessão e token CSRF. Ela confere as condições no banco e salva o estado e a justificativa na mesma transação.

As regras seguem a seção 8.1 do Kickoff e a modelagem RF05–RF07 aprovada em 29/10/2026. A base de persistência das dependências foi incluída para que as verificações utilizem registros reais.

## Requisição e resposta

Para abrir o recrutamento, enviar:

```json
{
  "estado": "RECRUTAMENTO"
}
```

Para encerrar antes da execução, enviar também o motivo:

```json
{
  "estado": "ENCERRADO",
  "justificativaEncerramento": "Estudo cancelado antes da inclusão de participantes."
}
```

A resposta `200` contém os dados do estudo, incluindo `estado` e `justificativaEncerramento`. A listagem também devolve a justificativa. O campo fica ausente ou nulo quando não houver motivo registrado, conforme a serialização da API.

O estado é obrigatório. A justificativa tem até 500 caracteres, desconsiderando espaços nas pontas, e é obrigatória no encerramento antecipado. Texto em branco equivale a ausência. Uma justificativa informada para uma mudança que não seja encerramento é rejeitada.

## Transições

| Origem | Destino | Condições |
|---|---|---|
| Planejamento | Recrutamento | Coordenador atribuído e protocolo completo. |
| Recrutamento | Execução | Pelo menos uma participação registrada. |
| Execução | Encerrado | Na Release 1 não existem módulos de visitas agendadas e solicitações. Quando forem implementados na Release 2, suas pendências deverão ser consultadas antes de permitir esta mudança. |
| Planejamento | Encerrado | Nenhuma participação e justificativa válida. |
| Recrutamento | Encerrado | Nenhuma participação e justificativa válida. |

Retornos, saltos, repetição do estado atual e reabertura são rejeitados. Depois do encerramento, `PUT /estudos/{id}/coordenador` também fica bloqueado. Uma tentativa inválida preserva os dados anteriores.

O protocolo está completo quando possui uma inclusão, exclusões cadastradas ou a declaração de ausência, e pelo menos uma visita prevista. Todas as visitas devem ter alguma atividade. Não é permitido declarar ausência de exclusões enquanto existem critérios desse tipo.

Visita prevista é um modelo do protocolo, portanto não representa uma pendência de agendamento. As participações são contadas pelo histórico; uma retirada futura não deverá excluir a participação ou liberar outra vaga.

## Base acrescentada e integração com as próximas tasks

| Entidade | Campos e vínculos |
|---|---|
| `Protocolo` | ID, estudo único e `semCriteriosExclusao`. |
| `Criterio` | ID, protocolo, enum `TipoCriterio` e descrição de até 1.000 caracteres. |
| `VisitaPrevista` | ID, protocolo, nome de até 150 caracteres, descrição opcional de até 1.000 e ordem positiva, única no protocolo. |
| `AtividadePrevista` | ID, visita prevista e descrição de até 1.000 caracteres. |
| `Participacao` | ID, estudo, conta do participante e instante da inclusão. Uma conta tem no máximo uma participação por estudo. |

A migração V5 acrescenta a justificativa ao estudo. A V6 cria essas tabelas, com vínculos e restrições. V1 a V4 foram preservadas. As novas entidades ficam no pacote `estudos`, seguindo a organização atual.

Esta entrega não cria endpoints para cadastrar critérios, visitas, candidatos, consentimentos ou participações. O pesquisador pode encerrar um estudo sem inclusões pela API; para demonstrar o fluxo completo pela interface, ainda será necessário integrar os cadastros e a inclusão. Os testes de banco preparam esses registros diretamente como dados de cenário.

A entidade `Participacao` é a base da inclusão, não substitui candidato, avaliação ou consentimento. O futuro serviço do RF11 deverá conferir todas essas condições, o perfil e a situação da conta, o limite de vagas e o estado `RECRUTAMENTO` antes de persistir uma participação. A gestão de vínculos de participante e de retirada também deve preservar esse histórico.

### Bloqueio compartilhado

A mudança de estado e a atribuição de coordenador bloqueiam as contas envolvidas, em ordem de ID, e depois bloqueiam a linha do estudo com `PESSIMISTIC_WRITE`. Os bloqueios duram até o commit ou rollback. Dessa forma, uma troca de coordenador concorrente não pode sobrescrever o efeito de um encerramento.

Os futuros serviços de edição de protocolo e inclusão precisam seguir a mesma ordem: contas, quando necessárias, depois estudo. Devem obter o bloqueio antes de ler o estado e mantê-lo até salvar seus registros. Para um coordenador, a consulta deverá verificar seu próprio vínculo; a consulta atual `bloquearPorIdEResponsavelId` atende ao pesquisador.

O bloqueio no endpoint de estado, sozinho, não protege operações futuras que ignorem esse acordo. A integração dessas tasks deve incluir testes de edição versus abertura de recrutamento e inclusão versus início da execução.

## Erros

O formato continua sendo `codigo`, `mensagem` e, quando aplicável, `errosCampos`.

| HTTP | Exemplos |
|---|---|
| `400` | `TRANSICAO_ESTADO_INVALIDA`, `PROTOCOLO_INCOMPLETO`, `COORDENADOR_OBRIGATORIO`, `CRITERIOS_EXCLUSAO_INCONSISTENTES`, `ESTUDO_SEM_PARTICIPANTES`, `ESTUDO_COM_PARTICIPANTES`, `JUSTIFICATIVA_OBRIGATORIA`, `JUSTIFICATIVA_INVALIDA` ou `ESTUDO_ENCERRADO`. |
| `401` | Sessão ausente, expirada ou conta desativada. |
| `403` | Perfil não autorizado ou CSRF inválido. |
| `404` | Estudo inexistente ou pertencente a outro pesquisador. |

Por exemplo, a falta de inclusão no protocolo retorna `PROTOCOLO_INCOMPLETO` com a mensagem “Cadastre pelo menos um critério de inclusão para iniciar o recrutamento.” Quando uma visita não tem atividade, a mensagem identifica a visita.

## Como conferir

Os testes de domínio cobrem as dezesseis combinações de estados, incluindo as cinco permitidas. Os testes de API conferem as condições de negócio, entrada, perfil, vínculo, sessão e CSRF. Os testes de documentação verificam o contrato publicado no Swagger.

Na pasta `backend`, com JDK 21:

```bash
./mvnw -B verify
```

Os testes PostgreSQL exigem um banco exclusivo de testes e as variáveis `CLINICALSTUDYPB_TEST_DB_URL`, `CLINICALSTUDYPB_TEST_DB_USER` e `CLINICALSTUDYPB_TEST_DB_PASSWORD`. Com elas configuradas:

```bash
./mvnw -B -Dtest=EstudoPersistenciaIT,EstudoEstadoPersistenciaIT test
```

O novo `EstudoEstadoPersistenciaIT` confere commits e rollbacks por novas consultas, transições com configurações reais, atualização de um banco V4 e bloqueio entre transações concorrentes. Como prepara registros com commit, deve ser executado apenas no banco de testes. Os testes `*IT` não entram automaticamente no comando padrão `verify` desta branch.

A [coleção Postman](postman/ClinicalStudyPB.postman_collection.json) inclui exemplos de estado antes do logout do pesquisador. Eles usam o estudo recém-criado pela coleção e terminam encerrando esse estudo, com verificações de reabertura e atribuição de coordenador bloqueadas. A coleção não inventa um protocolo completo para contornar os cadastros ainda pendentes.

### Validação realizada em 29/10/2026

Executado `./mvnw -o -B '-Dtest=*Test,*IT' verify` com Microsoft JDK 21.0.12.1 e PostgreSQL 17.11 em contêiner descartável: **148 testes, zero falhas, zero erros e zero testes ignorados; BUILD SUCCESS**. O total inclui os dez casos das duas classes de integração PostgreSQL. O banco de desenvolvimento não foi usado.

O JSON e os scripts da coleção Postman foram conferidos estruturalmente. Os cenários de API foram executados pelos testes automatizados; não foi executado o Runner do Postman nesta validação.
