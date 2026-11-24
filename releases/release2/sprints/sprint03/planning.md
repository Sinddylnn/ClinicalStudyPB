# Planning Sprint 3

| Informação | Definição |
|---|---|
| Projeto | ClinicalStudyPB - Engenharia de Software II, UEPB, 2026.2 |
| Product Owner da Sprint | Suelle Ferreira Maciel |
| Início planejado | 10/11/2026 |
| Término planejado | 23/11/2026 |
| Duração planejada | 2 semanas |
| Encerramento confirmado | 23/11/2026 |
| Esforço planejado | 150 horas: 144 h de atividades dos PBIs + 6 h de reunião de acompanhamento |

O período planejado da Sprint 3 foi de 10/11 a 23/11/2026, com encerramento confirmado em 23/11/2026. Os resultados finais estão documentados na [Review da Sprint](review.md).

As atividades, os responsáveis e as estimativas estão organizados nas tabelas a seguir, conforme o planejamento registrado no Azure DevOps.

A Sprint 3 inicia a Release 2. Web e aplicativo usam a mesma API e os mesmos dados persistidos: uma visita agendada na web (RF12) deve aparecer para o participante no app (RF18).

## Objetivo da Sprint

Permitir que a equipe acompanhe pela web os participantes incluídos em um estudo. O acompanhamento inclui:

- agendar e registrar visitas;
- registrar os resultados fictícios das avaliações;
- consultar o histórico;
- registrar a retirada.

Também faz parte do objetivo entregar o login funcional no aplicativo mobile, restrito ao perfil participante. Pelo app, o participante deve poder consultar os estudos em que está incluído, as próximas visitas e o histórico de comparecimento.

As evidências e os testes acompanham o desenvolvimento desde o início da Sprint.

## PBIs e critérios de aceite

| PBI no Azure | Escopo e resultado esperado | Horas |
|---|---|---:|
| **3931 - Agendamento e registro de visitas** | RF12 e RF13: como coordenador, agendar visitas para participantes já incluídos e registrar se cada visita foi realizada, se houve ausência ou se foi cancelada. A visita agendada fica vinculada a um participante incluído e a uma visita prevista do protocolo, e o registro fica persistido e visível na web. | 23 |
| **3933 - Resultados, histórico e retirada** | RF14 a RF16: como coordenador, registrar resultados fictícios das avaliações previstas e a retirada de um participante; como pesquisador e coordenador, consultar o histórico de visitas e avaliações do participante. Os resultados correspondem às atividades previstas da visita, e a retirada fica registrada no histórico. | 28 |
| **3934 - Acesso mobile** | RF02 e RF03 no app: como participante, entrar e sair do aplicativo com a própria conta. Login e logout integrados à API; credenciais inválidas falham; apenas o perfil participante usa o app; a forma de sessão no app é validada e registrada antes da implementação. | 14 |
| **3935 - Participante no aplicativo** | RF17 e RF18: como participante, consultar os estudos em que está incluído, as próximas visitas e o histórico de comparecimento. O app mostra apenas os dados do próprio participante, vindos da mesma API usada pela web. | 15 |
| **3936 - Integração, qualidade e documentação** | Revisar o contrato da API, integrar os fluxos, executar testes automatizados (componentes, API e E2E web e mobile), acompanhar a cobertura do backend, organizar o Azure e registrar as evidências da Sprint 3 em `releases/release2/evidencias`. | 64 |
| **3932 - Reuniões** | Realizar o acompanhamento da Sprint, com participação dos seis integrantes e previsão de 1 hora por pessoa. | 6 |
| **Total** | **5 PBIs principais e 1 PBI de reuniões.** | **150** |

O PBI 3936 é um item habilitador. Ele não representa diretamente um novo requisito funcional, mas é necessário para integrar, validar, documentar e entregar corretamente a Sprint 3.

### Regras detalhadas dos requisitos

- **RF12 (agendamento):**
  - o agendamento é feito pelo coordenador vinculado, com o estudo em Recrutamento ou Execução, a participação ativa e uma visita prevista do protocolo do estudo;
  - a data vai de hoje em diante e fica dentro do período do estudo;
  - só pode haver um agendamento AGENDADA por participação e visita prevista;
  - reagendar é editar a data enquanto a visita está AGENDADA;
  - depois de Realizada, Ausente ou Cancelada, a mesma visita prevista pode ser agendada de novo;
  - a API ganha `GET /estudos/{estudoId}/participacoes`, para listar os participantes.
- **RF13 (registro):**
  - a visita passa de AGENDADA para REALIZADA, AUSENTE ou CANCELADA;
  - Realizada e Ausente só a partir do dia da visita;
  - Cancelada a qualquer momento, com motivo obrigatório (até 500 caracteres);
  - a correção exige justificativa e guarda o motivo anterior;
  - a visita nunca volta para AGENDADA;
  - a correção fica bloqueada se houver resultados, se o estudo estiver encerrado ou se a participação estiver retirada.
- **RF14 (resultados):**
  - um resultado por atividade prevista, com texto de 1 a 1.000 caracteres, só em visita Realizada;
  - o registro pode ser parcial;
  - depois do primeiro resultado, a situação da visita não pode mais ser corrigida.
- **RF15 (histórico):**
  - mostra, em ordem cronológica, as visitas com situação, data, motivo, quem registrou, resultados e correções, e a retirada;
  - é consultado pelo coordenador vinculado e pelo pesquisador responsável, este só para leitura.
- **RF16 (retirada):**
  - motivo obrigatório (1 a 500 caracteres) e irreversível;
  - cancela as visitas AGENDADA com o motivo "Retirada do participante" e preserva o histórico;
  - a vaga não é liberada.
- **Impacto no RF07:** o encerramento do estudo passa a ser bloqueado quando houver visita AGENDADA.
- **App (RF02 e RF03):**
  - a sessão é a do Spring Security, validada no dispositivo antes da implementação;
  - um perfil diferente de participante recebe logout e um aviso.
- **App (RF17 e RF18):**
  - as rotas são baseadas na sessão: `/participante/estudos`, `/participante/visitas/proximas` e `/participante/visitas/historico`;
  - o app não mostra resultados, motivos, justificativas nem quem registrou.
- **Permissões:**
  - o coordenador vinculado agenda, registra, lança resultados e retira;
  - o pesquisador responsável só consulta;
  - o administrador fica de fora;
  - o participante vê apenas os próprios dados no app.
- **Auditoria (D12 do Kickoff):** fora do escopo, conforme combinado com a professora.

## Tasks e responsáveis

As horas representam as estimativas definidas no planejamento da Sprint 3, não o tempo efetivamente gasto.

### Backend e Web 1

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3963 (T67) | 3931 | Georis | Modelar visita agendada, resultados das avaliações e retirada, criar as migrações e registrar o modelo de domínio | 4 |
| 3954 (T68) | 3934 | Georis | Validar a sessão no aplicativo e ajustar a autenticação para o login mobile | 5 |
| 3957 (T69) | 3933 | Georis | Implementar o registro de retirada de participante no backend | 4 |
| 3951 (T70) | 3935 | Georis | Implementar as consultas do participante: estudos incluídos, próximas visitas e histórico de comparecimento | 5 |
| 3942 (T71) | 3936 | Georis | Revisar contrato da API e OpenAPI do acompanhamento | 5 |
| 3964 (T72) | 3931 | Luiz | Implementar agendamento de visitas para participantes incluídos e a listagem de participações do estudo | 5 |
| 3965 (T73) | 3931 | Luiz | Implementar registro de realização, ausência e cancelamento de visitas e o bloqueio do encerramento com visita agendada (RF07) | 4 |
| 3958 (T74) | 3933 | Luiz | Implementar registro de resultados fictícios das avaliações previstas | 5 |
| 3959 (T75) | 3933 | Luiz | Implementar consulta do histórico de visitas e avaliações do participante | 4 |
| 3941 (T76) | 3936 | Luiz | Testar regras de agendamento, registro de visitas, resultados, histórico e retirada | 5 |
| 3966 (T77) | 3931 | Suelle | Implementar a lista de participantes incluídos e a tela de agendamento de visitas | 5 |
| 3967 (T78) | 3931 | Suelle | Implementar o registro de realização, ausência e cancelamento de visitas | 5 |
| 3940 (T79) | 3936 | Suelle | Testar componentes das telas de agendamento e registro de visitas | 4 |
| 3939 (T80) | 3936 | Suelle | Produzir evidências e documentar os fluxos web da Sprint 3 | 3 |
| 3938 (T81) | 3936 | Suelle | Atualizar o guia de execução web e a documentação da integração com a API | 3 |
| 3937 (T82) | 3936 | Suelle | Organizar Azure, capacidade, tasks, burndown e Review da Sprint 3 | 3 |

**Subtotal: 69 horas planejadas.**

### Web 2, Mobile e Qualidade

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3960 (T83) | 3933 | Sinddy | Implementar o registro de resultados fictícios das avaliações | 5 |
| 3961 (T84) | 3933 | Sinddy | Implementar a tela de histórico de visitas e avaliações do participante | 5 |
| 3962 (T85) | 3933 | Sinddy | Implementar o registro de retirada do participante | 5 |
| 3943 (T86) | 3936 | Sinddy | Testar componentes e validação de resultados, histórico e retirada | 3 |
| 3944 (T87) | 3936 | Sinddy | Registrar evidências dos RF14 a RF16 e construir os diagramas de sequência dos principais fluxos | 5 |
| 3955 (T88) | 3934 | Horlan | Implementar login e logout mobile integrados à API | 6 |
| 3956 (T89) | 3934 | Horlan | Restringir o aplicativo ao perfil participante e tratar sessão encerrada | 3 |
| 3952 (T90) | 3935 | Horlan | Implementar a tela de estudos do participante (RF17) | 5 |
| 3953 (T91) | 3935 | Horlan | Implementar próximas visitas e histórico de comparecimento (RF18) | 5 |
| 3945 (T92) | 3936 | Horlan | Testar componentes e automatizar E2E do login mobile com Maestro | 4 |
| 3946 (T93) | 3936 | Gabriela | Testar API de agendamento, registro de visitas e resultados | 5 |
| 3947 (T94) | 3936 | Gabriela | Testar API de histórico, retirada e acesso negado | 4 |
| 3948 (T95) | 3936 | Gabriela | Testar API das consultas do participante e da sessão mobile | 4 |
| 3949 (T96) | 3936 | Gabriela | Atualizar E2E web para cobrir agendamento e registro de visitas | 5 |
| 3950 (T97) | 3936 | Gabriela | Verificar cobertura do backend e manter CI com relatórios de testes | 5 |

**Subtotal: 69 horas planejadas.**

### Evidências coletivas da Sprint 3

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3974 (T98) | 3936 | Suelle | Registrar as evidências da Sprint 3 em `releases/release2/evidencias/` | 1 |
| 3975 (T98) | 3936 | Horlan | Registrar as evidências da Sprint 3 em `releases/release2/evidencias/` | 1 |
| 3976 (T98) | 3936 | Gabriela | Registrar as evidências da Sprint 3 em `releases/release2/evidencias/` | 1 |
| 3977 (T98) | 3936 | Luiz | Registrar as evidências da Sprint 3 em `releases/release2/evidencias/` | 1 |
| 3978 (T98) | 3936 | Georis | Registrar as evidências da Sprint 3 em `releases/release2/evidencias/` | 1 |
| 3979 (T98) | 3936 | Sinddy | Registrar as evidências da Sprint 3 em `releases/release2/evidencias/` | 1 |

**Subtotal: 6 horas planejadas.**

### Reunião de acompanhamento

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3968 (T99) | 3932 | Suelle | Participar da reunião de acompanhamento da Sprint | 1 |
| 3969 (T99) | 3932 | Georis | Participar da reunião de acompanhamento da Sprint | 1 |
| 3970 (T99) | 3932 | Horlan | Participar da reunião de acompanhamento da Sprint | 1 |
| 3971 (T99) | 3932 | Sinddy | Participar da reunião de acompanhamento da Sprint | 1 |
| 3972 (T99) | 3932 | Gabriela | Participar da reunião de acompanhamento da Sprint | 1 |
| 3973 (T99) | 3932 | Luiz | Participar da reunião de acompanhamento da Sprint | 1 |

**Subtotal: 6 horas planejadas.**

### Resumo do esforço planejado

| Grupo de atividades | Horas |
|---|---:|
| Backend e Web 1 | 69 |
| Web 2, Mobile e Qualidade | 69 |
| Evidências coletivas | 6 |
| Reunião de acompanhamento | 6 |
| **Total da Sprint 3** | **150** |

### Distribuição das horas

| Integrante | Tasks específicas | Evidências coletivas | Reunião | Total |
|---|---:|---:|---:|---:|
| Georis | 23 h | 1 h | 1 h | 25 h |
| Luiz | 23 h | 1 h | 1 h | 25 h |
| Suelle | 23 h | 1 h | 1 h | 25 h |
| Sinddy | 23 h | 1 h | 1 h | 25 h |
| Horlan | 23 h | 1 h | 1 h | 25 h |
| Gabriela | 23 h | 1 h | 1 h | 25 h |
| **Total** | **138 h** | **6 h** | **6 h** | **150 h** |

A Sprint 3 possui 150 horas planejadas, distribuídas igualmente entre os seis integrantes. A task de PO (T82) está incluída nas 23 horas específicas de Suelle.

Essa distribuição representa as estimativas iniciais da Sprint, não as horas efetivamente trabalhadas.

## Cronograma

Para que web e mobile não dependessem do ritmo do backend, a Sprint foi organizada com prazo por task e dependências explícitas. As telas avançaram com serviços simulados e passaram para a API real assim que cada endpoint ficou pronto.

| Data | Marco |
|---|---|
| 10/11 | Azure organizado |
| 12/11 | Contrato da API publicado e modelo de dados com migrações pronto |
| 13/11 | Sessão do aplicativo validada no dispositivo |
| 18/11 | Backend completo |
| 19/11 | Telas integradas à API, testes de componentes prontos e reunião de acompanhamento |
| 21/11 | Código congelado: todos os PRs integrados |
| 22/11 | Evidências e burndown final |
| 23/11 | Encerramento da Sprint |
| 24/11 | Review |

## Dependências principais

As principais dependências entre as tarefas da Sprint 3 são:

- **Modelo de dados:** a T67 estrutura os dados do acompanhamento e precede as T69, T70 e T72 a T75.
- **Agendamento e registro na web:** as T77 e T78 dependem das T72 e T73. A T77 usa a listagem de participações criada na T72.
- **Resultados e histórico na web:** as T83 e T84 dependem das T74 e T75. A T84 também usa a listagem da T72.
- **Retirada na web:** a T85 depende da T69.
- **Login mobile:** as T88 e T89 dependem da T68, que valida a sessão no app antes do login.
- **Participante no app:** as T90 e T91 dependem da T70. A T91 só mostra visitas agendadas depois da T72.
- **Testes:** as T93 a T96 precisam dos fluxos integrados. A T92 depende do login mobile.
- **Fechamento:** a T71 e as tasks de evidências e documentação fecham a Sprint.
- **Base da Sprint 2:** a inclusão da Sprint 2 (RF11) já grava a participação ligada ao candidato e à conta do participante (migração V9). Essa é a base para o agendamento (RF12) e para as consultas do participante no app (RF17 e RF18).
- **Diagramas:** o diagrama do recrutamento (T87) pode começar de imediato. Os de visitas, resultados e retirada dependem das T67 e T72 a T75.

## Critérios de conclusão

Uma tarefa será considerada concluída quando atender aos seguintes critérios:

- Os critérios de aceite foram atendidos e o comportamento pode ser demonstrado.
- O código foi revisado por outro integrante e integrado à branch principal.
- O pipeline do GitHub Actions foi aprovado ou, enquanto estiver indisponível, os testes foram executados localmente, com evidência registrada.
- As validações e situações de erro foram testadas.
- Os dados foram persistidos corretamente, quando necessário.
- Os testes automatizados relacionados à funcionalidade foram executados.
- As evidências de sucesso e erro foram registradas.

A conclusão das tarefas deve ser registrada no Azure DevOps, mantendo o acompanhamento da Sprint atualizado.

## Demonstração prevista para a Review

| # | Demonstração | Responsável |
|---|---|---|
| 1 | Entrar na web como coordenador vinculado a um estudo com participantes incluídos | Suelle |
| 2 | Agendar uma visita para um participante incluído | Suelle |
| 3 | Demonstrar o impedimento de agendar para quem não está incluído | Suelle |
| 4 | Registrar uma visita realizada, uma ausência e um cancelamento | Suelle |
| 5 | Registrar resultados fictícios das avaliações de uma visita realizada | Sinddy |
| 6 | Consultar o histórico do participante como coordenador e como pesquisador (só leitura) | Sinddy |
| 7 | Registrar a retirada de um participante | Sinddy |
| 8 | Mostrar validações e mensagens de erro, cada uma nas suas telas | Suelle e Sinddy |
| 9 | Abrir o aplicativo e entrar com uma conta de participante | Horlan |
| 10 | Demonstrar que um usuário de outro perfil não usa o app | Horlan |
| 11 | Mostrar no app os estudos em que o participante está incluído | Horlan |
| 12 | Mostrar no app a visita agendada na web e o histórico de comparecimento | Horlan |
| 13 | Encerrar a sessão no app | Horlan |
| 14 | Conferir a persistência dos dados | Luiz e Georis |
| 15 | Confirmar que os fluxos da Release 1 continuam funcionando | Gabriela |
| 16 | Exibir o Swagger UI | Georis |
| 17 | Exibir a execução dos testes automatizados, a cobertura do backend e o pipeline do GitHub Actions | Gabriela |
| 18 | Exibir o burndown da Sprint 3 | Suelle |
| 19 | Apresentar os diagramas de sequência dos principais fluxos | Sinddy |
| 20 | Mostrar que o encerramento do estudo é bloqueado com visita agendada | Suelle |

A Sprint 3 não fecha release. As evidências ficam em `releases/release2/evidencias/`, e o README da Release 2, com a tag `release2` e a GitHub Release, será feito na Sprint 4.

Os resultados da Sprint e o gráfico de acompanhamento estão disponíveis na [Review da Sprint 3](review.md).