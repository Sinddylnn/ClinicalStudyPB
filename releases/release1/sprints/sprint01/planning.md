# Planning  Sprint 1

| Informação | Definição |
|---|---|
| Projeto | ClinicalStudyPB - Engenharia de Software II, UEPB, 2026.2 |
| Product Owner da sprint | Georis Samuel Martins Gouveia |
| Início planejado | 13/10/2026 |
| Final planejado | 26/10/2026 |
| Duração planejada | 2 semanas |
| Encerramento confirmado | 26/10/2026 |
| Esforço planejado | 150 horas: 144 h de implementação, preparação, testes e organização + 6 h de reunião |

O período corresponde ao DOCX, ao burndown e ao encerramento confirmado pela equipe.
Os IDs e títulos abaixo seguem os prints do Azure; os vínculos dos cinco
PBIs de escopo e as estimativas foram mantidos conforme o planejamento. A reunião
foi associada ao PBI **3120 - Reuniões**, em seis tasks individuais de 1 h.

## Objetivo da sprint

Entregar a base executável do sistema, com autenticação e controle de acesso na web,
gerenciamento inicial de usuários e cadastro de estudos persistidos no banco.
Preparar o aplicativo mobile e os protótipos navegáveis, com testes e documentação
desde o início. A stack é Java com Spring Boot, React, React Native com Expo e PostgreSQL.

## PBIs e critérios de aceite

| PBI no Azure | Escopo e resultado esperado | Horas |
|---|---|---:|
| **3073 - Arquitetura e Configurações de ambiente** | Item habilitador: backend e web iniciam; banco recebe migrações; mobile abre; README orienta o ambiente; Azure contém sprint e tasks; CI executa as verificações existentes. | 36 |
| **3076 - Usuários e Acesso** | RF01 a RF03: como administrador, gerenciar usuários e perfis; cadastrar, listar, editar e desativar contas, validando e-mail único. Login e logout web funcionam; credenciais inválidas falham; API nega acesso sem sessão ou perfil autorizado. | 36 |
| **3079 - Cadastro de estudos** | RF04: como pesquisador, cadastrar estudo com título, objetivo, responsável, datas e limite de participantes. Validar campos, limite positivo e ordem das datas; persistir e mostrar o estudo na listagem web. | 30 |
| **3088 - Protótipos e Interface** | Item habilitador: protótipo web cobre login, usuários e estudos; protótipo mobile cobre acesso e navegação futura do participante. App abre no emulador com tela inicial e teste de componente. Dados simulados não representam RF17 a RF20 entregues. | 14 |
| **3090 - Integração e documentação** | Item habilitador: contrato OpenAPI acessível; fluxos web integrados; README registra escolhas, versões, execução e evidências; diagramas iniciais de arquitetura, domínio, casos de uso e sequência revisados. | 28 |
| **3120 - Reuniões** | Reunião de acompanhamento em 22/10, com participação dos seis integrantes e 1 h prevista por pessoa. | 6 |
| **Total** | **6 PBIs no Azure e 38 tasks, incluindo as seis participações na reunião.** | **150** |

Um **item habilitador** prepara a base necessária para desenvolver o sistema, sem
entregar sozinho uma funcionalidade final ao usuário. No cadastro de estudos,
datas iguais são permitidas, mas o término não pode ser anterior ao início.
Somente o pesquisador cadastra estudos; o administrador gerencia usuários.

## Tasks e responsáveis

As horas são estimativas de planejamento, não um registro de horas efetivamente gastas.

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3163 | 3073 | Georis | Definir arquitetura, divisão dos módulos e diagrama inicial | 4 |
| 3166 | 3073 | Georis | Criar base Spring Boot e padrão de erros e validação | 4 |
| 3170 | 3076 | Georis | Implementar sessão, login, logout e autorização por perfil | 8 |
| 3171 | 3090 | Georis | Integrar fluxos, revisar contrato e corrigir inconsistências | 4 |
| 3191 | 3090 | Georis | Publicar OpenAPI e documentar decisões e versões | 4 |
| 3239 | 3073 | Luiz | Modelar usuário e estudo e criar migrações PostgreSQL | 4 |
| 3240 | 3076 | Luiz | Implementar serviço e endpoints de gestão de usuários | 6 |
| 3241 | 3079 | Luiz | Implementar cadastro e listagem de estudos | 6 |
| 3242 | 3076 | Luiz | Testar validações e regras de usuários | 3 |
| 3243 | 3079 | Luiz | Testar regras de cadastro de estudos | 3 |
| 3244 | 3079 | Luiz | Preparar dados fictícios para demonstração | 2 |
| 3226 | 3073 | Suelle | Criar base React, rotas e cliente HTTP | 4 |
| 3227 | 3076 | Suelle | Implementar login e logout web integrados | 4 |
| 3230 | 3076 | Suelle | Implementar listagem, cadastro, edição e desativação de usuários | 8 |
| 3228 | 3076 | Suelle | Testar componentes de login e usuários | 4 |
| 3229 | 3090 | Suelle | Documentar execução web e evidências de sucesso e erro | 4 |
| 3124 | 3079 | Sinddy | Implementar formulário e lista de estudos integrados | 8 |
| 3117 | 3088 | Sinddy | Criar protótipo navegável web da Sprint 1 | 4 |
| 3129 | 3079 | Sinddy | Testar componentes e validações de estudos | 4 |
| 3130 | 3090 | Sinddy | Documentar domínio e casos de uso iniciais | 4 |
| 3131 | 3090 | Sinddy | Revisar integração web e sequência do cadastro | 4 |
| 3231 | 3073 | Horlan | Criar app Expo com navegação e execução no Android | 6 |
| 3232 | 3088 | Horlan | Criar protótipo mobile do participante | 6 |
| 3233 | 3088 | Horlan | Automatizar teste da tela inicial e navegação básica | 4 |
| 3234 | 3090 | Horlan | Documentar ambiente mobile e evidência no emulador | 4 |
| 3235 | 3090 | Horlan | Revisar exemplos da API e preparar coleção Postman | 4 |
| 3246 | 3073 | Gabriela | Configurar Actions, verificações e relatórios de cobertura | 6 |
| 3247 | 3073 | Gabriela | Configurar Compose do banco e ambiente de testes | 4 |
| 3248 | 3076 | Gabriela | Testar API de usuários, sessão e acesso negado | 3 |
| 3249 | 3079 | Gabriela | Testar integração de estudos com PostgreSQL | 3 |
| 3250 | 3079 | Gabriela | Automatizar E2E web de login e cadastro de estudo | 4 |
| 3333 | 3073 | Georis | Organizar Azure, capacidade, tasks e consulta do burndown | 4 |

### Reunião de acompanhamento

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3127 | 3120 | Georis | Participar da Reunião da Sprint (22/10) | 1 |
| 3245 | 3120 | Luiz | Participar da Reunião da Sprint (22/10) | 1 |
| 3147 | 3120 | Suelle | Participar da Reunião da Sprint (22/10) | 1 |
| 3158 | 3120 | Sinddy | Participar da Reunião da Sprint (22/10) | 1 |
| 3156 | 3120 | Horlan | Participar da Reunião da Sprint (22/10) | 1 |
| 3159 | 3120 | Gabriela | Participar da Reunião da Sprint (22/10) | 1 |

### Distribuição das horas

| Integrante | Tasks específicas, incluindo organização | Reunião | Total |
|---|---:|---:|---:|
| Georis | 28 h | 1 h | 29 h |
| Luiz | 24 h | 1 h | 25 h |
| Suelle | 24 h | 1 h | 25 h |
| Sinddy | 24 h | 1 h | 25 h |
| Horlan | 24 h | 1 h | 25 h |
| Gabriela | 20 h | 1 h | 21 h |



## Dependências principais

- **3124 - Formulário e lista de estudos** integra com **3241 - Cadastro e listagem de estudos**.
- **3248 - Testes de usuários, sessão e acesso negado** depende dos endpoints de autenticação e gestão de usuários.
- **3249 - Integração com PostgreSQL** e **3250 - E2E web** precisam do cadastro persistido; o E2E também precisa das telas integradas.
- **3171 - Integrar fluxos**, **3131 - Revisar integração web** e as evidências fecham a validação do conjunto.
- Protótipos e configuração mobile podem avançar em paralelo, sem esperar o backend.

## Critérios de conclusão

Um item está pronto quando seus critérios de aceite foram demonstrados, o código
foi revisado por outra pessoa e integrado, o pipeline foi aprovado, validações e
erros foram testados, os dados foram persistidos quando aplicável e o README e as
evidências foram atualizados.

## Demonstração prevista para a Review

Entrar com usuário fictício; cadastrar e editar usuário como administrador; encerrar
a sessão; entrar como pesquisador e cadastrar estudo; mostrar erro de validação,
acesso negado e persistência no banco. Abrir o mobile e os protótipos e apresentar
testes, cobertura, Swagger UI e o burndown.

O resultado e o gráfico de acompanhamento estão na [Review da Sprint 1](review.md).
