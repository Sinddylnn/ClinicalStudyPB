# Tabela de testes Release 2

Lista dos testes e evidências da Release 2. Os casos com execução comprovada pelas capturas estão marcados como aprovados. Classes Spring sem captura correspondente estão identificadas como "Não comprovado"; isso não significa que os testes falharam ou que não foram executados.

## 1. Testes automatizados do backend (Spring)

Cada linha identifica um caso automatizado Spring existente no projeto. As capturas comprovam a execução das classes nelas listadas, mas não necessariamente de todas as classes cadastradas nesta seção. As evidências foram organizadas por requisito: [RF12](backend/spring/rf12-testes-spring.png), [RF13](backend/spring/rf13-testes-spring.png), [RF14](backend/spring/rf14-testes-spring.png), [RF15](backend/spring/rf15-testes-spring.png), [RF16](backend/spring/rf16-testes-spring.png), [RF17](backend/spring/rf17-testes-spring.png) e [RF18](backend/spring/rf18-testes-spring.png).

| ID | Requisito | Camada | Classe de teste | Cenário | Tipo | Resultado |
|---|---|---|---|---|---|---|
| SPR-001 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Executa todas as migrações desde a V1 em um schema isolado e descartável | Sucesso | Não comprovado |
| SPR-002 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Persiste visita, resultado, correção e retirada com seus vínculos e dados de autoria | Sucesso | Não comprovado |
| SPR-003 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere no PostgreSQL a contagem de visitas por estudo e situação. Também verifica se a consulta de participantes não repete quem tem mais de uma pendência | Sucesso | Não comprovado |
| SPR-004 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Registra a retirada no PostgreSQL e confere que somente visitas AGENDADA são canceladas | Sucesso | Não comprovado |
| SPR-005 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere no PostgreSQL o filtro por conta, situação, ordenação e data de corte | Sucesso | Não comprovado |
| SPR-006 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere no PostgreSQL a ordem das visitas e o carregamento da visita prevista na mesma consulta, evitando buscas adicionais durante a montagem do histórico | Sucesso | Não comprovado |
| SPR-007 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere o filtro por participação e a ordem das correções e dos resultados | Sucesso | Não comprovado |
| SPR-008 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Confere a gravação do resultado e da autoria inicial no banco | Sucesso | Não comprovado |
| SPR-009 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Confere que a edição preserva o cadastro original e grava a atualização | Sucesso | Não comprovado |
| SPR-010 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Confere que resultados parciais são aceitos, sem exigir todas as atividades | Sucesso | Não comprovado |
| SPR-011 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Garante que a constraint única do PostgreSQL rejeita gravação duplicada mesmo quando a validação do serviço não é utilizada | Erro/negativo | Não comprovado |
| SPR-012 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Confere a consulta por resultado e visita e a unicidade independente entre visitas diferentes | Erro/negativo | Não comprovado |
| SPR-013 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere os campos de visitas, resultados, correções, retirada e responsáveis no JSON | Sucesso | Aprovado |
| SPR-014 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere se os perfis autorizados podem consultar uma participação sem eventos | Sucesso | Aprovado |
| SPR-015 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere que administrador e participante não acessam o histórico de gestão | Erro/negativo | Aprovado |
| SPR-016 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere o bloqueio de uma consulta sem sessão autenticada | Erro/negativo | Aprovado |
| SPR-017 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere o retorno 404 quando o estudo não está no vínculo do usuário | Erro/negativo | Aprovado |
| SPR-018 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere o retorno 404 para uma participação fora do estudo informado | Erro/negativo | Aprovado |
| SPR-019 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Coordenador pode listar participações | Sucesso | Não comprovado |
| SPR-020 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Verifica se o pesquisador pode consultar as participações do estudo pelo qual é responsável | Sucesso | Não comprovado |
| SPR-021 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Perfil sem permissão não pode listar | Erro/negativo | Não comprovado |
| SPR-022 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Listagem sem login é bloqueada | Erro/negativo | Não comprovado |
| SPR-023 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Estudo não encontrado retorna 404 | Erro/negativo | Não comprovado |
| SPR-024 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Participante consulta estudos sem expor campos de gestão | Sucesso | Aprovado |
| SPR-025 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Participante consulta próximas visitas sem expor motivo | Sucesso | Aprovado |
| SPR-026 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Participante consulta histórico filtrando por estudo sem expor dados internos | Sucesso | Aprovado |
| SPR-027 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Estudo sem vínculo recebe 404 | Erro/negativo | Aprovado |
| SPR-028 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Estudo ID não numérico recebe 400 | Erro/negativo | Aprovado |
| SPR-029 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Outros perfis recebem 403 | Erro/negativo | Aprovado |
| SPR-030 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Sem login recebe 401 | Erro/negativo | Aprovado |
| SPR-031 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere a listagem e o contrato JSON dos resultados da visita | Sucesso | Aprovado |
| SPR-032 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Retorna uma lista vazia quando a visita não possui resultados | Sucesso | Aprovado |
| SPR-033 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa consultas sem autenticação | Erro/negativo | Aprovado |
| SPR-034 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa consultas por perfis sem permissão | Erro/negativo | Aprovado |
| SPR-035 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Retorna HTTP 404 quando a visita não existe no vínculo informado | Erro/negativo | Aprovado |
| SPR-036 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte uma negação do serviço em HTTP 403 | Erro/negativo | Aprovado |
| SPR-037 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere status, vínculos, conteúdo da resposta e autoria inicial | Sucesso | Aprovado |
| SPR-038 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere que o texto é normalizado antes de chegar ao serviço | Sucesso | Aprovado |
| SPR-039 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Aceita os limites de tamanho definidos no contrato de cadastro | Sucesso | Aprovado |
| SPR-040 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa campos obrigatórios ausentes ou inválidos no cadastro | Erro/negativo | Aprovado |
| SPR-041 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa texto maior que o máximo no cadastro | Erro/negativo | Aprovado |
| SPR-042 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte uma regra de cadastro não atendida em erro HTTP 400 | Erro/negativo | Aprovado |
| SPR-043 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Verifica o contrato de duplicidade com HTTP 409 | Erro/negativo | Aprovado |
| SPR-044 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere erro HTTP 404 para estudo/visita sem vínculo no cadastro | Erro/negativo | Aprovado |
| SPR-045 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere status HTTP 200 e resposta de edição com campos de autoria | Sucesso | Aprovado |
| SPR-046 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere que a edição remove espaços das pontas do texto | Sucesso | Aprovado |
| SPR-047 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Aceita textos nos limites estabelecidos para edição | Sucesso | Aprovado |
| SPR-048 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa ausência, nulidade ou texto vazio na edição | Erro/negativo | Aprovado |
| SPR-049 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa texto maior que o limite na edição | Erro/negativo | Aprovado |
| SPR-050 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte regras impeditivas de edição em HTTP 400 | Erro/negativo | Aprovado |
| SPR-051 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte resultado ausente ou fora do vínculo em HTTP 404 | Erro/negativo | Aprovado |
| SPR-052 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Bloqueia cadastro para perfis que não sejam coordenadores | Erro/negativo | Aprovado |
| SPR-053 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Bloqueia edição para perfis que não sejam coordenadores | Erro/negativo | Aprovado |
| SPR-054 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Exige autenticação para o cadastro | Erro/negativo | Aprovado |
| SPR-055 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Exige autenticação para a edição | Erro/negativo | Aprovado |
| SPR-056 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa cadastro sem token CSRF | Erro/negativo | Aprovado |
| SPR-057 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa edição sem token CSRF | Erro/negativo | Aprovado |
| SPR-058 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa cadastro com token CSRF inválido | Erro/negativo | Aprovado |
| SPR-059 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa edição com token CSRF inválido | Erro/negativo | Aprovado |
| SPR-060 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte negação de acesso do serviço em HTTP 403 | Erro/negativo | Aprovado |
| SPR-061 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Coordenador registra retirada e recebe resposta | Sucesso | Aprovado |
| SPR-062 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Perfil sem permissão recebe 403 | Erro/negativo | Aprovado |
| SPR-063 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Sem login recebe 401 | Erro/negativo | Aprovado |
| SPR-064 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Sem CSRF recebe 403 | Erro/negativo | Aprovado |
| SPR-065 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo ausente ou em branco recebe 400 | Erro/negativo | Aprovado |
| SPR-066 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo acima de 500 caracteres recebe 400 | Erro/negativo | Aprovado |
| SPR-067 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo com um caractere é aceito | Sucesso | Aprovado |
| SPR-068 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo com espaços nas pontas é normalizado antes do serviço | Sucesso | Aprovado |
| SPR-069 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se coordenadores podem consultar os dados de uma visita | Sucesso | Aprovado |
| SPR-070 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede que usuários sem perfil de coordenador consultem visitas | Erro/negativo | Aprovado |
| SPR-071 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede a consulta de visitas sem autenticação | Erro/negativo | Aprovado |
| SPR-072 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Retorna HTTP 404 quando a visita não é encontrada pelo serviço | Erro/negativo | Aprovado |
| SPR-073 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se coordenadores podem agendar visitas | Sucesso | Aprovado |
| SPR-074 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se pesquisadores não podem agendar visitas | Erro/negativo | Aprovado |
| SPR-075 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o agendamento exige autenticação | Erro/negativo | Aprovado |
| SPR-076 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o agendamento exige um token CSRF válido | Erro/negativo | Aprovado |
| SPR-077 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se coordenadores podem reagendar visitas | Sucesso | Aprovado |
| SPR-078 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se usuários sem permissão não podem reagendar visitas | Erro/negativo | Aprovado |
| SPR-079 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o reagendamento exige autenticação | Erro/negativo | Aprovado |
| SPR-080 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o reagendamento exige um token CSRF válido | Erro/negativo | Aprovado |
| SPR-081 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se identificadores inválidos retornam HTTP 400 | Erro/negativo | Aprovado |
| SPR-082 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se uma data nula no agendamento retorna HTTP 400 | Erro/negativo | Aprovado |
| SPR-083 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se uma data nula no reagendamento retorna HTTP 400 | Erro/negativo | Aprovado |
| SPR-084 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se coordenadores podem registrar a situação de visitas | Sucesso | Aprovado |
| SPR-085 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede o registro de visitas por usuários sem permissão | Erro/negativo | Aprovado |
| SPR-086 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede o registro de situação sem token CSRF | Erro/negativo | Aprovado |
| SPR-087 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede o registro de situação sem autenticação | Erro/negativo | Aprovado |
| SPR-088 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede registrar uma visita sem informar a situação | Erro/negativo | Aprovado |
| SPR-089 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Rejeita um motivo com mais de 500 caracteres | Erro/negativo | Aprovado |
| SPR-090 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o coordenador pode corrigir uma visita | Sucesso | Aprovado |
| SPR-091 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede correções por usuários sem permissão | Erro/negativo | Aprovado |
| SPR-092 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede correções sem token CSRF | Erro/negativo | Aprovado |
| SPR-093 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede a correção de situação quando não há usuário autenticado | Erro/negativo | Aprovado |
| SPR-094 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Rejeita a correção quando a justificativa é nula ou vazia | Erro/negativo | Aprovado |
| SPR-095 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Rejeita a correção quando a situação de destino não é informada | Erro/negativo | Aprovado |
| SPR-096 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Confere a composição do histórico e a posição cronológica da retirada | Sucesso | Aprovado |
| SPR-097 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Uma visita agendada não possui registro de realização, resultados nem correções | Sucesso | Aprovado |
| SPR-098 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Confirma a leitura pelo coordenador vinculado, inclusive em estudo encerrado | Sucesso | Aprovado |
| SPR-099 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | A consulta vazia continua válida quando a participação está ativa | Sucesso | Aprovado |
| SPR-100 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Um pesquisador não pode descobrir dados de um estudo alheio | Erro/negativo | Aprovado |
| SPR-101 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Um coordenador não vinculado também recebe 404 | Erro/negativo | Aprovado |
| SPR-102 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | A participação precisa pertencer ao estudo indicado na URL | Sucesso | Aprovado |
| SPR-103 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Uma participação inexistente não deve iniciar buscas de dados do histórico | Erro/negativo | Aprovado |
| SPR-104 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Administradores e participantes não têm acesso ao histórico de gestão | Erro/negativo | Aprovado |
| SPR-105 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Uma identidade ausente é rejeitada antes de acessar o banco | Erro/negativo | Aprovado |
| SPR-106 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Lista estudos da conta inclusive os retirados | Sucesso | Aprovado |
| SPR-107 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Conta sem participação recebe lista vazia | Sucesso | Aprovado |
| SPR-108 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Próximas usa todas as participações e o início do dia de hoje | Sucesso | Aprovado |
| SPR-109 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Próximas com estudo ID filtra somente aquela participação | Sucesso | Aprovado |
| SPR-110 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Próximas sem participações não consulta visitas | Sucesso | Aprovado |
| SPR-111 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Próximas com estudo sem vínculo recebe 404 | Erro/negativo | Aprovado |
| SPR-112 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Histórico consulta somente situações permitidas e sem dados de gestão | Sucesso | Aprovado |
| SPR-113 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Histórico com estudo sem vínculo recebe 404 | Erro/negativo | Aprovado |
| SPR-114 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Outros perfis recebem acesso negado | Erro/negativo | Aprovado |
| SPR-115 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Autenticação ausente recebe acesso negado | Erro/negativo | Aprovado |
| SPR-116 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Verifica o cadastro de resultado para uma visita realizada | Sucesso | Aprovado |
| SPR-117 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede registrar duas vezes a mesma atividade na mesma visita | Erro/negativo | Aprovado |
| SPR-118 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite cadastrar resultados parciais de atividades diferentes | Sucesso | Aprovado |
| SPR-119 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede que um pesquisador registre resultados | Erro/negativo | Aprovado |
| SPR-120 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o registro pelos demais perfis não autorizados | Erro/negativo | Aprovado |
| SPR-121 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o registro sem uma identidade autenticada | Erro/negativo | Aprovado |
| SPR-122 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o registro por coordenador sem vínculo com o estudo | Erro/negativo | Aprovado |
| SPR-123 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede cadastrar resultado em uma visita ainda agendada | Erro/negativo | Aprovado |
| SPR-124 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultados de visitas ausentes ou canceladas | Erro/negativo | Aprovado |
| SPR-125 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede cadastrar resultados de participações retiradas | Erro/negativo | Aprovado |
| SPR-126 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultados após o encerramento do estudo | Erro/negativo | Aprovado |
| SPR-127 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede cadastrar resultados enquanto o estudo está em planejamento | Erro/negativo | Aprovado |
| SPR-128 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite cadastrar resultados em estudo em execução | Sucesso | Aprovado |
| SPR-129 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultado para atividade de outra visita prevista | Erro/negativo | Aprovado |
| SPR-130 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultado para uma visita que não existe | Erro/negativo | Aprovado |
| SPR-131 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede indicar na URL uma participação diferente da visita | Erro/negativo | Aprovado |
| SPR-132 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede acessar uma participação pertencente a outro estudo | Erro/negativo | Aprovado |
| SPR-133 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultados vinculados a protocolo de outro estudo | Erro/negativo | Aprovado |
| SPR-134 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o cadastro sem o corpo obrigatório | Erro/negativo | Aprovado |
| SPR-135 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede identificadores ausentes ou não positivos | Erro/negativo | Aprovado |
| SPR-136 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede textos nulos, vazios ou compostos só por espaços | Erro/negativo | Aprovado |
| SPR-137 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede textos acima do limite de 1.000 caracteres | Erro/negativo | Aprovado |
| SPR-138 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Aceita textos com os tamanhos mínimo e máximo permitidos | Sucesso | Aprovado |
| SPR-139 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Normaliza os espaços das extremidades antes de salvar o texto | Sucesso | Aprovado |
| SPR-140 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Verifica a edição do texto sem modificar autor e instante de criação | Sucesso | Aprovado |
| SPR-141 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite editar resultados enquanto o estudo está em execução | Sucesso | Aprovado |
| SPR-142 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Bloqueia a edição para perfis sem permissão | Erro/negativo | Aprovado |
| SPR-143 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Rejeita a edição sem usuário autenticado | Erro/negativo | Aprovado |
| SPR-144 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede coordenador sem vínculo com o estudo de editar resultado | Erro/negativo | Aprovado |
| SPR-145 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Bloqueia alterações de resultado em estudo encerrado | Erro/negativo | Aprovado |
| SPR-146 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a edição quando o estudo não saiu do planejamento | Erro/negativo | Aprovado |
| SPR-147 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultados quando a participação está retirada | Erro/negativo | Aprovado |
| SPR-148 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a edição de resultados quando a visita não está realizada | Erro/negativo | Aprovado |
| SPR-149 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultado que não existe | Erro/negativo | Aprovado |
| SPR-150 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar um resultado existente que pertence a outra visita | Erro/negativo | Aprovado |
| SPR-151 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultado passando outra participação na URL | Erro/negativo | Aprovado |
| SPR-152 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultado de participação pertencente a outro estudo | Erro/negativo | Aprovado |
| SPR-153 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar com visita prevista de protocolo de outro estudo | Erro/negativo | Aprovado |
| SPR-154 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Rejeita resultado que aponta para atividade de outra visita prevista | Erro/negativo | Aprovado |
| SPR-155 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede edição sem o corpo da requisição | Erro/negativo | Aprovado |
| SPR-156 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede texto nulo, vazio ou formado somente por espaços na edição | Erro/negativo | Aprovado |
| SPR-157 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede que a edição ultrapasse o limite de texto | Erro/negativo | Aprovado |
| SPR-158 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite atualizar textos de tamanho mínimo ou máximo | Sucesso | Aprovado |
| SPR-159 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Remove espaços das extremidades do novo texto | Sucesso | Aprovado |
| SPR-160 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Consulta resultados de uma visita, mantendo a ordem retornada pelo repositório | Sucesso | Aprovado |
| SPR-161 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Retorna lista vazia quando a visita não possui resultados registrados | Sucesso | Aprovado |
| SPR-162 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite consultar resultados antigos após o encerramento do estudo | Sucesso | Aprovado |
| SPR-163 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Mantém a consulta do histórico para participantes retirados | Sucesso | Aprovado |
| SPR-164 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite consultar uma visita ainda agendada, mesmo sem resultados | Sucesso | Aprovado |
| SPR-165 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar resultados sem um usuário autenticado | Erro/negativo | Aprovado |
| SPR-166 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a consulta de resultados por perfis diferentes de coordenador | Erro/negativo | Aprovado |
| SPR-167 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a consulta por coordenador não vinculado ao estudo | Erro/negativo | Aprovado |
| SPR-168 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar resultados de uma visita inexistente | Erro/negativo | Aprovado |
| SPR-169 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar a visita usando o ID de outra participação | Erro/negativo | Aprovado |
| SPR-170 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar a visita de uma participação de outro estudo | Erro/negativo | Aprovado |
| SPR-171 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar resultados vinculados ao protocolo de outro estudo | Erro/negativo | Aprovado |
| SPR-172 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Registra retirada em recrutamento ou execução | Sucesso | Aprovado |
| SPR-173 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Cancela visitas pendentes e preserva visita finalizada | Sucesso | Aprovado |
| SPR-174 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Aceita motivo nos limites permitidos | Sucesso | Aprovado |
| SPR-175 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Impede retirada em estado inválido | Erro/negativo | Aprovado |
| SPR-176 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Perfil sem permissão não pode registrar retirada | Erro/negativo | Aprovado |
| SPR-177 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Autenticação ausente não pode registrar retirada | Erro/negativo | Aprovado |
| SPR-178 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Coordenador não vinculado recebe 404 | Erro/negativo | Aprovado |
| SPR-179 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Participação de outro estudo recebe 404 | Erro/negativo | Aprovado |
| SPR-180 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Participação inexistente recebe 404 | Erro/negativo | Aprovado |
| SPR-181 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Retirada é irreversível e impede segundo registro | Erro/negativo | Aprovado |
| SPR-182 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Rejeita motivo vazio sem alterar participação | Erro/negativo | Aprovado |
| SPR-183 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Rejeita motivo acima do limite | Erro/negativo | Aprovado |
| SPR-184 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o cancelamento de uma visita futura com motivo | Sucesso | Aprovado |
| SPR-185 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede o cancelamento de uma visita sem motivo | Erro/negativo | Aprovado |
| SPR-186 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o registro de uma visita realizada após a data agendada | Sucesso | Aprovado |
| SPR-187 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar uma visita futura como realizada | Erro/negativo | Aprovado |
| SPR-188 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o registro de ausência sem motivo | Sucesso | Aprovado |
| SPR-189 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar ausência antes do dia agendado | Erro/negativo | Aprovado |
| SPR-190 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar novamente uma visita finalizada | Erro/negativo | Aprovado |
| SPR-191 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede o registro de visitas por usuários sem permissão | Erro/negativo | Aprovado |
| SPR-192 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar visitas de estudos de outro coordenador | Erro/negativo | Aprovado |
| SPR-193 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar uma visita de outra participação | Erro/negativo | Aprovado |
| SPR-194 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registro em estado inválido | Erro/negativo | Aprovado |
| SPR-195 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar realizada com motivo | Erro/negativo | Aprovado |
| SPR-196 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar agendada como situação final | Erro/negativo | Aprovado |
| SPR-197 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Permite registrar realizada no dia da visita | Sucesso | Aprovado |
| SPR-198 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registro de visita de participante retirado | Erro/negativo | Aprovado |
| SPR-199 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registro de visita de outro estudo | Erro/negativo | Aprovado |
| SPR-200 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar uma visita prevista de outro estudo | Erro/negativo | Aprovado |
| SPR-201 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica a correção de ausência para realização, preservando os dados anteriores no histórico | Sucesso | Aprovado |
| SPR-202 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita que possui resultados registrados | Erro/negativo | Aprovado |
| SPR-203 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede que uma correção retorne a visita para AGENDADA | Erro/negativo | Aprovado |
| SPR-204 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita para a mesma situação | Erro/negativo | Aprovado |
| SPR-205 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede correções quando o estudo está encerrado | Erro/negativo | Aprovado |
| SPR-206 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede correções para participantes retirados do estudo | Erro/negativo | Aprovado |
| SPR-207 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Exige uma justificativa preenchida para corrigir a visita | Erro/negativo | Aprovado |
| SPR-208 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Exige motivo ao corrigir uma visita para CANCELADA | Erro/negativo | Aprovado |
| SPR-209 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Rejeita motivo na correção para REALIZADA | Erro/negativo | Aprovado |
| SPR-210 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Uma visita ainda AGENDADA deve ser registrada antes de ser corrigida | Erro/negativo | Aprovado |
| SPR-211 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Não permite converter visita futura em REALIZADA ou AUSENTE | Erro/negativo | Aprovado |
| SPR-212 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Coordenadores não podem corrigir visitas de estudos não vinculados | Erro/negativo | Aprovado |
| SPR-213 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede que a URL de outra participação acesse uma visita | Erro/negativo | Aprovado |
| SPR-214 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita cuja participação pertence a outro estudo | Erro/negativo | Aprovado |
| SPR-215 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita prevista ligada ao protocolo de outro estudo | Erro/negativo | Aprovado |
| SPR-216 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede correções por perfis que não são COORDENADOR | Erro/negativo | Aprovado |
| SPR-217 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Confirma que CANCELADA para REALIZADA limpa o motivo da visita, mas conserva o motivo anterior no histórico da correção | Sucesso | Aprovado |
| SPR-218 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o agendamento de uma visita para participante ativo | Sucesso | Aprovado |
| SPR-219 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se um agendamento duplicado é impedido | Erro/negativo | Aprovado |
| SPR-220 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se participantes retirados não podem receber agendamentos | Erro/negativo | Aprovado |
| SPR-221 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se uma visita finalizada não pode ser reagendada | Erro/negativo | Aprovado |
| SPR-222 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se datas anteriores ao dia atual são rejeitadas | Erro/negativo | Aprovado |
| SPR-223 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a visita prevista deve pertencer ao estudo | Erro/negativo | Aprovado |
| SPR-224 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se pesquisadores não podem agendar visitas | Erro/negativo | Aprovado |
| SPR-225 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede o reagendamento de visitas por pesquisadores | Erro/negativo | Aprovado |
| SPR-226 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o reagendamento de uma visita pendente | Sucesso | Aprovado |
| SPR-227 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o coordenador só pode agendar visitas em seus estudos | Erro/negativo | Aprovado |
| SPR-228 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a participação deve pertencer ao estudo informado | Erro/negativo | Aprovado |
| SPR-229 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o estado do estudo permite agendamento | Erro/negativo | Aprovado |
| SPR-230 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o estado do estudo permite reagendamento | Erro/negativo | Aprovado |
| SPR-231 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se é possível agendar uma visita para o dia atual | Sucesso | Aprovado |
| SPR-232 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se uma visita não pode ser agendada para o dia anterior | Erro/negativo | Aprovado |
| SPR-233 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a data não pode anteceder o início do estudo | Erro/negativo | Aprovado |
| SPR-234 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a data não pode ultrapassar o fim do estudo | Erro/negativo | Aprovado |
| SPR-235 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se uma data inválida impede o reagendamento | Erro/negativo | Aprovado |
| SPR-236 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se participantes retirados não podem ter visitas reagendadas | Erro/negativo | Aprovado |
| SPR-237 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a visita reagendada pertence à participação informada | Erro/negativo | Aprovado |
| SPR-238 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a visita reagendada pertence ao estudo informado | Erro/negativo | Aprovado |
| SPR-239 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se dois participantes podem agendar a mesma visita prevista | Sucesso | Aprovado |
| SPR-240 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o agendamento é permitido às 23h do último dia do estudo | Sucesso | Aprovado |
| SPR-241 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Confere os dados da visita e o uso de consultas sem bloqueio ou escrita | Sucesso | Aprovado |
| SPR-242 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Permite consultar visitas finalizadas e devolve os dados de registro | Sucesso | Aprovado |
| SPR-243 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Mantém a consulta disponível após o encerramento do estudo | Sucesso | Aprovado |
| SPR-244 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Permite consultar uma visita histórica de participação retirada | Sucesso | Aprovado |
| SPR-245 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Bloqueia a consulta quando não existe usuário autenticado | Erro/negativo | Aprovado |
| SPR-246 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Recusa a consulta por perfis diferentes de coordenador | Erro/negativo | Aprovado |
| SPR-247 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Oculta visitas de estudo não vinculado ao coordenador da consulta | Erro/negativo | Aprovado |
| SPR-248 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Devolve HTTP 404 quando a visita solicitada não existe | Erro/negativo | Aprovado |
| SPR-249 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede consultar visita vinculada a outra participação da URL | Erro/negativo | Aprovado |
| SPR-250 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede consultar visita cuja participação pertence a outro estudo | Erro/negativo | Aprovado |
| SPR-251 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede consultar visita prevista ligada ao protocolo de outro estudo | Erro/negativo | Aprovado |
| SPR-252 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a listagem utiliza a consulta sem bloqueio pessimista | Sucesso | Aprovado |
| SPR-253 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se participações retiradas continuam listadas com a data de retirada | Sucesso | Aprovado |
| SPR-254 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o pesquisador responsável pode listar as participações do seu estudo | Sucesso | Aprovado |
| SPR-255 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o pesquisador não pode consultar participações de outro estudo | Erro/negativo | Aprovado |
| SPR-256 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se administradores e participantes não podem consultar a listagem | Erro/negativo | Aprovado |
| SPR-257 | RF12, RF13 | API (MockMvc) | `DocumentacaoApiTest` | Confere rotas, corpos, respostas, segurança e códigos documentados das visitas | Sucesso | Não comprovado |
| SPR-258 | RF14 | API (MockMvc) | `DocumentacaoApiTest` | Confere rotas, schemas e erros publicados para cadastro e edição de resultados | Sucesso | Não comprovado |
| SPR-259 | RF12 (apoio) | API (MockMvc) | `DocumentacaoApiTest` | Confere a consulta das participações e o schema de seus dados | Sucesso | Não comprovado |
| SPR-260 | RF16 | API (MockMvc) | `DocumentacaoApiTest` | Confere que a retirada de participantes está publicada no contrato | Sucesso | Não comprovado |
| SPR-261 | RF17, RF18 | API (MockMvc) | `DocumentacaoApiTest` | Confere que as consultas do participante estão publicadas, sem exigir CSRF | Sucesso | Não comprovado |
| SPR-262 | RF13, RF14 | API (MockMvc) | `DocumentacaoApiTest` | Confere os contratos GET da visita e de seus resultados para a web | Sucesso | Não comprovado |
| SPR-263 | RF15 | API (MockMvc) | `DocumentacaoApiTest` | Confere a publicação da consulta do histórico completo de gestão (RF15) | Sucesso | Não comprovado |

Total: 263 casos Spring cadastrados; 239 com execução indicada pelas capturas disponíveis e 24 sem captura correspondente.

**Classes sem comprovação nas capturas Spring desta release:** `AcompanhamentoPersistenciaIT` (7 casos), `ResultadoAtividadePersistenciaIT` (5), `ParticipacaoConsultaControllerTest` (5) e `DocumentacaoApiTest` (7). Para marcar esses casos como aprovados, anexar a execução das respectivas classes e conferir os resultados. Os testes de integração `*IT` exigem o ambiente de banco de testes.

## 2. Testes manuais (Swagger)

Para cada requisito, ao menos um cenário de sucesso e um de erro, com a requisição e a resposta visíveis no print. Procedimento no [roteiro de testes](backend/roteiro-de-testes-backend.md).

| ID | Requisito | Cenário | Endpoint | Esperado | Responsável | Resultado | Evidência |
|---|---|---|---|---|---|---|---|
| SWG-001 | RF12 | Agendamento com sucesso | `POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas` | 201 Created, com o id da visita agendada | Luiz | Aprovado | [01-rf12-agendamento-sucesso.png](backend/swagger/rf12/01-rf12-agendamento-sucesso.png) |
| SWG-002 | RF12 | Agendamento duplicado | `POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas` | 409 Conflict, código VISITA_JA_AGENDADA | Luiz | Aprovado | [02-rf12-agendamento-erro-duplicado.png](backend/swagger/rf12/02-rf12-agendamento-erro-duplicado.png) |
| SWG-003 | RF12 | Reagendamento com sucesso | `PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}` | 200 OK | Luiz | Aprovado | [03-rf12-reagendamento-sucesso.png](backend/swagger/rf12/03-rf12-reagendamento-sucesso.png) |
| SWG-004 | RF12 | Reagendamento com data inválida | `PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}` | 400 Bad Request, código DATA_VISITA_INVALIDA | Luiz | Aprovado | [04-rf12-reagendamento-erro.png](backend/swagger/rf12/04-rf12-reagendamento-erro.png) |
| SWG-005 | RF13 | Registrar visita realizada | `PATCH .../visitas/{visitaAgendadaId}/situacao` | 200 OK | Luiz | Aprovado | [01-rf13-registro-realizada.png](backend/swagger/rf13/01-rf13-registro-realizada.png) |
| SWG-006 | RF13 | Registrar visita ausente | `PATCH .../visitas/{visitaAgendadaId}/situacao` | 200 OK | Luiz | Aprovado | [02-rf13-registro-ausente.png](backend/swagger/rf13/02-rf13-registro-ausente.png) |
| SWG-007 | RF13 | Registrar visita cancelada | `PATCH .../visitas/{visitaAgendadaId}/situacao` | 200 OK, com motivo informado | Luiz | Aprovado | [03-rf13-registro-cancelada.png](backend/swagger/rf13/03-rf13-registro-cancelada.png) |
| SWG-008 | RF13 | Tentar registrar novamente visita já finalizada | `PATCH .../visitas/{visitaAgendadaId}/situacao` | 400 Bad Request, código `TRANSICAO_VISITA_INVALIDA` (apenas visitas agendadas podem ser registradas) | Luiz | Aprovado | [04-rf13-registro-erro.png](backend/swagger/rf13/04-rf13-registro-erro.png) |
| SWG-009 | RF13 | Correção de visita | `POST .../visitas/{visitaAgendadaId}/correcoes` | 201 Created | Luiz | Aprovado | [05-rf13-correcao-sucesso.png](backend/swagger/rf13/05-rf13-correcao-sucesso.png) |
| SWG-010 | RF13 | Correção para a mesma situação | `POST .../visitas/{visitaAgendadaId}/correcoes` | 400 Bad Request, código TRANSICAO_VISITA_INVALIDA | Luiz | Aprovado | [06-rf13-correcao-erro.png](backend/swagger/rf13/06-rf13-correcao-erro.png) |
| SWG-011 | RF14 | Registrar resultado fictício | `POST .../visitas/{visitaAgendadaId}/resultados` | 201 Created | Luiz | Aprovado | [01-rf14-resultado-sucesso.png](backend/swagger/rf14/01-rf14-resultado-sucesso.png) |
| SWG-012 | RF14 | Resultado duplicado | `POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados` | 409 Conflict, código RESULTADO_JA_REGISTRADO | Luiz | Aprovado | [02-rf14-resultado-erro.png](backend/swagger/rf14/02-rf14-resultado-erro.png) |
| SWG-013 | RF15 | Consultar histórico completo | `GET /estudos/{estudoId}/participacoes/{participacaoId}/historico` | 200 OK | Luiz | Aprovado | [01-rf15-historico-sucesso.png](backend/swagger/rf15/01-rf15-historico-sucesso.png) |
| SWG-014 | RF15 | Participante tenta consultar histórico de gestão | `GET /estudos/{estudoId}/participacoes/{participacaoId}/historico` | 403 Forbidden, código `ACESSO_NEGADO` | Luiz | Aprovado | [02-rf15-historico-erro-acesso.png](backend/swagger/rf15/02-rf15-historico-erro-acesso.png) |
| SWG-015 | RF16 | Registrar retirada do participante | `POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada` | 200 OK | Georis | Aprovado | [01-rf16-retirada-sucesso.png](backend/swagger/rf16/01-rf16-retirada-sucesso.png) |
| SWG-016 | RF16 | Tentar retirar novamente a participação | `POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada` | 400 Bad Request, código PARTICIPACAO_JA_RETIRADA | Georis | Aprovado | [03-rf16-retirada-erro-ja-retirada.png](backend/swagger/rf16/03-rf16-retirada-erro-ja-retirada.png) |
| SWG-017 | RF17 | Participante consulta seus estudos | `GET /participante/estudos` | 200 OK | Georis | Aprovado | [01-rf17-consulta-estudos-sucesso.png](backend/swagger/rf17/01-rf17-consulta-estudos-sucesso.png) |
| SWG-018 | RF17 | Consulta sem sessão autenticada | `GET /participante/estudos` | 401 Unauthorized, código AUTENTICACAO_NECESSARIA | Georis | Aprovado | [02-rf17-estudos-erro-perfil.png](backend/swagger/rf17/02-rf17-estudos-erro-perfil.png) |
| SWG-019 | RF18 | Consultar próximas visitas | `GET /participante/visitas/proximas` | 200 OK | Georis | Aprovado | [01-rf18-proximas-sucesso.png](backend/swagger/rf18/01-rf18-proximas-sucesso.png) |
| SWG-020 | RF18 | Consultar histórico sem visitas finalizadas na resposta | `GET /participante/visitas/historico` | 200 OK, lista vazia (`[]`) | Georis | Aprovado | [02-rf18-historico-sucesso.png](backend/swagger/rf18/02-rf18-historico-sucesso.png) |
| SWG-021 | RF18 | Consultar próximas visitas de estudo sem vínculo | `GET /participante/visitas/proximas?estudoId={estudoId}` | 404 Not Found, código RECURSO_NAO_ENCONTRADO | Georis | Aprovado | [03-rf18-consulta-erro-estudo.png](backend/swagger/rf18/03-rf18-consulta-erro-estudo.png) |
| SWG-022 | RF14 | Editar resultado fictício | `PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados/{resultadoId}` | 200 OK, texto atualizado | Luiz | Aprovado | [03-rf14-resultado-edicao.png](backend/swagger/rf14/03-rf14-resultado-edicao.png) |
| SWG-023 | RF14 | Consultar resultados da visita | `GET /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados` | 200 OK, com resultado cadastrado | Luiz | Aprovado | [04-rf14-resultado-listagem.png](backend/swagger/rf14/04-rf14-resultado-listagem.png) |
| SWG-024 | RF16 | Confirmar cancelamento das visitas pendentes após retirada | `GET /estudos/{estudoId}/participacoes/{participacaoId}/historico` | 200 OK, visita antes agendada com situação `CANCELADA` e motivo da retirada | Georis | Aprovado | [02-rf16-visitas-pendentes-canceladas.png](backend/swagger/rf16/02-rf16-visitas-pendentes-canceladas.png) |

**Observações sobre a comprovação Swagger:** a evidência do SWG-020 retorna `200 OK` com `[]`, demonstrando a resposta válida de uma consulta sem itens. Ainda falta uma captura com visitas realizadas, ausentes ou canceladas para comprovar o histórico preenchido do RF18. No SWG-024, a captura comprova o cancelamento da visita pendente; a preservação de visitas já finalizadas deve ser verificada separadamente (a regra também é coberta por testes de serviço). Os IDs SWG-022 a SWG-024 foram acrescentados sem renumerar os registros anteriores.

## 3. Cenários da API (Postman)

Cenários da Release 2 presentes na coleção `ClinicalStudyPB API` (`../../../docs/postman/ClinicalStudyPB.postman_collection.json`, pastas `9` a `14`), executados contra a API local com capturas em `backend/postman/`.

| ID | Requisito | Cenário (Collection) | Método e Endpoint | Esperado | Resultado | Evidência |
|---|---|---|---|---|---|---|
| PMN-001 | RF12 | Listar participações do estudo - 200 | `GET /estudos/6/participacoes` | 200 OK | Aprovado | [01-rf12-listar-participacoes.png](backend/postman/rf12/01-rf12-listar-participacoes.png) |
| PMN-002 | RF12 | Agendar visita - 201 | `POST /estudos/6/participacoes/2/visitas` | 201 Created | Aprovado | [02-rf12-agendar-visita.png](backend/postman/rf12/02-rf12-agendar-visita.png) |
| PMN-003 | RF12 | Reagendar visita - 200 | `PUT /estudos/6/participacoes/2/visitas/2` | 200 OK | Aprovado | [03-rf12-reagendar-visita.png](backend/postman/rf12/03-rf12-reagendar-visita.png) |
| PMN-004 | RF12 | Reagendar visita fora do período - 400 | `PUT /estudos/6/participacoes/2/visitas/2` | 400 Bad Request | Aprovado | [04-rf12-reagendar-fora-periodo.png](backend/postman/rf12/04-rf12-reagendar-fora-periodo.png) |
| PMN-005 | RF12 | Registro realizado - 200 | `PATCH /estudos/6/participacoes/2/visitas/2/situacao` | 200 OK (`REALIZADA`) | Aprovado | [05-rf12-registro-realizada.png](backend/postman/rf12/05-rf12-registro-realizada.png) |
| PMN-006 | RF12 | Registro visita ja finalizada - 400 | `PATCH /estudos/6/participacoes/2/visitas/2/situacao` | 400 Bad Request | Aprovado | [06-rf12-visita-finalizada.png](backend/postman/rf12/06-rf12-visita-finalizada.png) |
| PMN-007 | RF12 | Registro de ausência - 200 | `PATCH /estudos/6/participacoes/2/visitas/3/situacao` | 200 OK (`AUSENTE`) | Aprovado | [07-rf12-registro-ausencia.png](backend/postman/rf12/07-rf12-registro-ausencia.png) |
| PMN-008 | RF12 | Registro de cancelamento - 200 | `PATCH /estudos/6/participacoes/2/visitas/4/situacao` | 200 OK (`CANCELADA`) | Aprovado | [08-rf12-registro-cancelamento.png](backend/postman/rf12/08-rf12-registro-cancelamento.png) |
| PMN-009 | RF14 | Correção de ausência para realizada - 201 | `POST /estudos/6/participacoes/2/visitas/3/correcoes` | 201 Created | Aprovado | [01-rf14-correcao-ausencia.png](backend/postman/rf14/01-rf14-correcao-ausencia.png) |
| PMN-010 | RF14 | Correção para a mesma situação - 400 | `POST /estudos/6/participacoes/2/visitas/3/correcoes` | 400 Bad Request | Aprovado | [02-rf14-correcao-mesma-situacao.png](backend/postman/rf14/02-rf14-correcao-mesma-situacao.png) |
| PMN-011 | RF13 | Registrar resultado atividade - 201 | `POST /estudos/6/participacoes/2/visitas/2/resultados` | 201 Created | Aprovado | [01-rf13-registrar-resultado.png](backend/postman/rf13/01-rf13-registrar-resultado.png) |
| PMN-012 | RF13 | Erro ao registrar resultado duplicado - 409 | `POST /estudos/6/participacoes/2/visitas/2/resultados` | 409 Conflict | Aprovado | [02-rf13-resultado-duplicado.png](backend/postman/rf13/02-rf13-resultado-duplicado.png) |
| PMN-013 | RF13 | Editar resultado atividade - 200 | `PUT /estudos/6/participacoes/2/visitas/2/resultados/1` | 200 OK | Aprovado | [03-rf13-editar-resultado.png](backend/postman/rf13/03-rf13-editar-resultado.png) |
| PMN-014 | RF13 | Listar resultados atividade - 200 | `GET /estudos/6/participacoes/2/visitas/2/resultados` | 200 OK | Aprovado | [04-rf13-listar-resultados.png](backend/postman/rf13/04-rf13-listar-resultados.png) |
| PMN-015 | RF15 | Consultar historico participacao - 200 | `GET /estudos/6/participacoes/2/historico` | 200 OK | Aprovado | [01-rf15-historico-sucesso.png](backend/postman/rf15/01-rf15-historico-sucesso.png) |
| PMN-016 | RF15 | Consultar historico erro - 404 | `GET /estudos/6/participacoes/999/historico` | 404 Not Found | Aprovado | [02-rf15-historico-erro.png](backend/postman/rf15/02-rf15-historico-erro.png) |
| PMN-017 | RF16 | Registrar retirada participante - 200 | `POST /estudos/6/participacoes/2/retirada` | 200 OK | Aprovado | [01-rf16-registrar-retirada.png](backend/postman/rf16/01-rf16-registrar-retirada.png) |
| PMN-018 | RF16 | Listar participacoes visitas canceladas - 200 | `GET /estudos/6/participacoes` | 200 OK | Aprovado | [02-rf16-visitas-canceladas.png](backend/postman/rf16/02-rf16-visitas-canceladas.png) |
| PMN-019 | RF16 | Registrar retirada ja retirada - 400 | `POST /estudos/6/participacoes/2/retirada` | 400 Bad Request | Aprovado | [03-rf16-ja-retirada.png](backend/postman/rf16/03-rf16-ja-retirada.png) |
| PMN-020 | RF17 | Consultar estudos participacoes - 200 | `GET /estudos/6/participacoes` | 200 OK | Aprovado | [01-rf17-consulta-participacoes.png](backend/postman/rf17/01-rf17-consulta-participacoes.png) |
| PMN-021 | RF17 | Consultar estudos erro perfil - 403 | `GET /participante/estudos` | 403 Forbidden | Aprovado | [02-rf17-erro-perfil.png](backend/postman/rf17/02-rf17-erro-perfil.png) |
| PMN-022 | RF18 | Proximas visitas participante - 200 | `GET /participante/visitas/proximas` | 200 OK | Aprovado | [01-rf18-proximas-visitas.png](backend/postman/rf18/01-rf18-proximas-visitas.png) |
| PMN-023 | RF18 | Historico visitas participante - 200 | `GET /participante/visitas/historico` | 200 OK | Aprovado | [02-rf18-historico-visitas.png](backend/postman/rf18/02-rf18-historico-visitas.png) |
| PMN-024 | RF18 | Consulta erro estudo - 404 | `GET /participante/visitas/proximas?estudoId=999` | 404 Not Found | Aprovado | [03-rf18-erro-estudo.png](backend/postman/rf18/03-rf18-erro-estudo.png) |

## 4. Testes da web e do mobile

### 4.1 Web (automatizados)

Testes de serviços, regras e telas com Vitest e Testing Library, em `web/src`. Por causa do volume, a web tem uma linha por arquivo de teste, e não uma por teste.

| ID | Requisito | Arquivo | O que cobre | Nº de testes | Resultado |
|---|---|---|---|---|---|
| WEB-001 | RF12 a RF16 | `web/src/api/acompanhamento.test.ts` | Serviço real do acompanhamento: rotas e métodos da lista, do histórico, do registro e da correção de visitas, dos resultados e da retirada, com token CSRF e repasse dos erros do backend | 17 | Aprovado |
| WEB-002 | RF12 a RF16 | `web/src/api/acompanhamentoSimulado.test.ts` | Serviço simulado do acompanhamento: agendamento, registro e correção das visitas, resultados, histórico e retirada, com as mesmas regras e códigos de erro do backend | 52 | Aprovado |
| WEB-003 | RF02 | `web/src/api/autenticacao.test.ts` | Login, logout com token CSRF e consulta da sessão atual | 6 | Aprovado |
| WEB-004 | RF08 a RF11 | `web/src/api/candidatos.test.ts` | Serviço real dos candidatos: cadastro, elegibilidade, consentimento e inclusão, com repasse das recusas do backend | 13 | Aprovado |
| WEB-005 | RF08 a RF11 | `web/src/api/candidatosSimulado.test.ts` | Serviço simulado dos candidatos: cadastro, elegibilidade, consentimento e inclusão | 24 | Aprovado |
| WEB-006 | Geral | `web/src/api/cliente.test.ts` | Cliente HTTP: conversão dos erros da API, token CSRF e tratadores de sessão (401 e 403) | 12 | Aprovado |
| WEB-007 | RF04, RF07 | `web/src/api/estudos.test.ts` | Serviço real dos estudos: listagem, cadastro, mudança de estado e atribuição de coordenador | 10 | Aprovado |
| WEB-008 | RF04, RF07 | `web/src/api/estudosSimulado.test.ts` | Serviço simulado dos estudos: cadastro, mudança de estado com as pendências do backend e atribuição de coordenador | 18 | Aprovado |
| WEB-009 | RF05, RF06 | `web/src/api/protocolo.test.ts` | Serviço real do protocolo: critérios de inclusão e exclusão, visitas previstas e atividades | 14 | Aprovado |
| WEB-010 | RF05, RF06 | `web/src/api/protocoloSimulado.test.ts` | Serviço simulado do protocolo: critérios, visitas e atividades, com as validações do backend | 33 | Aprovado |
| WEB-011 | RF12, RF15, RF16 | `web/src/api/recursosAcompanhamento.test.ts` | Recursos do acompanhamento ligados no modo real e no simulado | 2 | Aprovado |
| WEB-012 | RF01 | `web/src/api/usuarios.test.ts` | Serviço de usuários: listagem, cadastro, edição, desativação e reativação | 6 | Aprovado |
| WEB-013 | RF02, RF03 | `web/src/autenticacao/autenticacao.test.tsx` | Rota protegida, sessão expirada, acesso negado, revalidação da sessão e saída | 18 | Aprovado |
| WEB-014 | RF12 | `web/src/pages/acompanhamento/agendamento.test.ts` | Regras do agendamento: datas no fuso de Recife, limites do período e validação dos campos | 9 | Aprovado |
| WEB-015 | RF12, RF13 | `web/src/pages/acompanhamento/agendamentoVisitas.test.tsx` | Tela de agendamento: agendar e reagendar visitas, registrar realização, ausência e cancelamento, e corrigir com justificativa | 42 | Aprovado |
| WEB-016 | RF16 | `web/src/pages/acompanhamento/dialogoRetirada.test.tsx` | Diálogo de retirada: consequências, motivo obrigatório e contador de caracteres | 8 | Aprovado |
| WEB-017 | RF15 | `web/src/pages/acompanhamento/historico.test.ts` | Ordem cronológica do histórico e nome de quem registrou | 4 | Aprovado |
| WEB-018 | RF15, RF16 | `web/src/pages/acompanhamento/historicoParticipante.test.tsx` | Tela do histórico: visitas, motivos, correções, resultados e retirada pelo histórico | 25 | Aprovado |
| WEB-019 | RF12, RF16 | `web/src/pages/acompanhamento/participantesEstudo.test.tsx` | Lista de participantes: ações por perfil e estado do estudo, consulta do pesquisador e retirada | 14 | Aprovado |
| WEB-020 | RF13 | `web/src/pages/acompanhamento/registroVisita.test.ts` | Regras do registro: motivo, justificativa, dia da visita e situações registráveis e corrigíveis | 11 | Aprovado |
| WEB-021 | RF14 | `web/src/pages/acompanhamento/resultados.test.ts` | Regras dos resultados: limite de 1.000 caracteres e o que registrar ou editar | 4 | Aprovado |
| WEB-022 | RF14 | `web/src/pages/acompanhamento/resultadosVisita.test.tsx` | Tela de resultados: um campo por atividade, registro, edição e bloqueio em visita não realizada | 14 | Aprovado |
| WEB-023 | RF16 | `web/src/pages/acompanhamento/retirada.test.ts` | Regras da retirada: motivo obrigatório até 500 caracteres e quando a retirada é permitida | 2 | Aprovado |
| WEB-024 | RF04 | `web/src/pages/estudos/estudos.test.tsx` | Lista e cadastro de estudos | 19 | Aprovado |
| WEB-025 | RF07 | `web/src/pages/estudos/transicoes.test.ts` | Transições de estado, justificativa de encerramento e pendências do recrutamento | 31 | Aprovado |
| WEB-026 | RF04 | `web/src/pages/estudos/validacao.test.ts` | Validação dos campos do estudo e formatação de datas | 14 | Aprovado |
| WEB-027 | RF03 | `web/src/pages/Inicio.test.tsx` | Tela inicial com os atalhos de cada perfil | 6 | Aprovado |
| WEB-028 | RF02 | `web/src/pages/login/Login.test.tsx` | Tela de login: campos vazios, credenciais inválidas e falha de conexão | 7 | Aprovado |
| WEB-029 | Geral | `web/src/pages/protocolo/coordenador.test.tsx` | Atribuição e troca do coordenador na aba Resumo | 8 | Aprovado |
| WEB-030 | RF07 | `web/src/pages/protocolo/mudancaEstado.test.tsx` | Mudança de estado do estudo pela tela, com confirmação e recusas do backend | 11 | Aprovado |
| WEB-031 | RF05 a RF07 | `web/src/pages/protocolo/protocolo.test.tsx` | Tela do protocolo: abas, critérios e acesso aos participantes incluídos | 22 | Aprovado |
| WEB-032 | RF06 | `web/src/pages/protocolo/visitas.test.tsx` | Aba Visitas: visitas previstas, atividades e pendências do recrutamento | 15 | Aprovado |
| WEB-033 | RF10 | `web/src/pages/recrutamento/consentimentoCandidato.test.tsx` | Tela de consentimento: resposta obrigatória, observação e correção | 13 | Aprovado |
| WEB-034 | RF09 | `web/src/pages/recrutamento/elegibilidade.test.ts` | Cálculo da elegibilidade e resumo da avaliação | 7 | Aprovado |
| WEB-035 | RF09 | `web/src/pages/recrutamento/elegibilidadeCandidato.test.tsx` | Tela de elegibilidade: respostas por critério e resultado da avaliação | 13 | Aprovado |
| WEB-036 | RF10, RF11 | `web/src/pages/recrutamento/inclusao.test.ts` | Condições da inclusão, validação do consentimento e próxima etapa do candidato | 12 | Aprovado |
| WEB-037 | RF11 | `web/src/pages/recrutamento/inclusaoCandidato.test.tsx` | Tela de inclusão: seis condições, conta com o mesmo e-mail e bloqueios | 12 | Aprovado |
| WEB-038 | RF08 | `web/src/pages/recrutamento/recrutamento.test.tsx` | Tela de recrutamento e cadastro de candidato | 17 | Aprovado |
| WEB-039 | RF08 | `web/src/pages/recrutamento/validacao.test.ts` | Validação do nome e do e-mail do candidato | 11 | Aprovado |
| WEB-040 | RF01 | `web/src/pages/usuarios/usuarios.test.tsx` | Telas de usuários: lista, cadastro, edição, desativação, reativação e a própria conta do administrador | 35 | Aprovado |
| WEB-041 | RF01 | `web/src/pages/usuarios/validacao.test.ts` | Validação dos campos do usuário e erros do servidor por campo | 12 | Aprovado |
| WEB-042 | RF03 | `web/src/routes/AppRoutes.test.tsx` | Rotas da aplicação, página não encontrada e acesso por perfil | 19 | Aprovado |

**Total:** 42 arquivos e 642 testes passando (`npm test`). Cobertura de linhas: **99,4%** (`npm run test:coverage`).
Evidências: [execução dos testes](web/16-rf12-13-testes.png) e [relatório de cobertura](web/17-rf12-13-cobertura.png).

### 4.2 Web (manuais)

Cada linha é um print da web no modo real. O cenário vem da seção "Evidências da Sprint 3" do [guia de execução da web](../../../docs/execucao/guia-execucao-web.md).

| ID | Requisito | Cenário | Esperado | Resultado | Evidência |
|---|---|---|---|---|---|
| WEBM-001 | RF12 | Lista de participantes do coordenador | Participantes incluídos com data de inclusão, situação e as ações "Ver histórico", "Agendar visitas" e "Retirar" | Aprovado | [01-rf12-lista-participantes.png](web/01-rf12-lista-participantes.png) |
| WEBM-002 | RF12 | Agendamento com campos vazios | Erros em visita prevista, data e hora, sem enviar ao backend | Aprovado | [02-rf12-agendamento-erro-campos-vazios.png](web/02-rf12-agendamento-erro-campos-vazios.png) |
| WEBM-003 | RF12 | Agendamento com data anterior a hoje | Mensagem "A data da visita não pode ser anterior a hoje." | Aprovado | [03-rf12-agendamento-erro-data.png](web/03-rf12-agendamento-erro-data.png) |
| WEBM-004 | RF12 | Agendamento com sucesso | Notificação da visita agendada; a mesma visita prevista pode ser agendada depois de uma situação final | Aprovado | [04-rf12-agendamento-sucesso.png](web/04-rf12-agendamento-sucesso.png) |
| WEBM-005 | RF12 | Visita prevista já agendada | Mensagem no campo da visita (`VISITA_JA_AGENDADA`) | Aprovado | [05-rf12-agendamento-erro-duplicado.png](web/05-rf12-agendamento-erro-duplicado.png) |
| WEBM-006 | RF12 | Reagendamento com sucesso | Notificação com a nova data, sem criar outra visita | Aprovado | [06-rf12-reagendamento-sucesso.png](web/06-rf12-reagendamento-sucesso.png) |
| WEBM-007 | RF13 | Ações conforme a situação e a data | Visita futura só com "Reagendar" e "Cancelar visita"; visita registrada só com "Corrigir"; correção bloqueada na visita com resultados | Aprovado | [07-rf13-acoes-por-data.png](web/07-rf13-acoes-por-data.png) |
| WEBM-008 | RF13 | Cancelamento sem motivo | Mensagem "Informe o motivo do cancelamento." | Aprovado | [08-rf13-cancelamento-erro-motivo.png](web/08-rf13-cancelamento-erro-motivo.png) |
| WEBM-009 | RF13 | Cancelamento com motivo | Visita "Cancelada", com o motivo na lista | Aprovado | [09-rf13-cancelamento-sucesso.png](web/09-rf13-cancelamento-sucesso.png) |
| WEBM-010 | RF13 | Correção de cancelada para ausente | Notificação da correção e visita "Ausente" | Aprovado | [10-rf13-correcao-cancelada-ausente.png](web/10-rf13-correcao-cancelada-ausente.png) |
| WEBM-011 | RF13 | Correção sem justificativa | Mensagem "Informe a justificativa da correção." | Aprovado | [11-rf13-correcao-erro-justificativa.png](web/11-rf13-correcao-erro-justificativa.png) |
| WEBM-012 | RF13 | Correção de ausente para realizada | Notificação da correção e visita "Realizada", com a mesma data | Aprovado | [12-rf13-correcao-sucesso.png](web/12-rf13-correcao-sucesso.png) |
| WEBM-013 | RF13, RF15 | Histórico com correções | Correções listadas com autor, data e justificativa, sem apagar o registro anterior | Aprovado | [13-rf13-historico-correcao.png](web/13-rf13-historico-correcao.png) |
| WEBM-014 | RF12, RF15 | Lista do pesquisador somente para consulta | Aviso "Somente consulta" e só a ação "Ver histórico" | Aprovado | [15-rf12-pesquisador-somente-consulta.png](web/15-rf12-pesquisador-somente-consulta.png) |
| WEBM-015 | RF16 | Lista com a ação Retirar | Participante ativo com as ações "Agendar visitas" e "Retirar" | Aprovado | [18-rf16-retirada-lista-participantes.png](web/18-rf16-retirada-lista-participantes.png) |
| WEBM-016 | RF16 | Diálogo de confirmação da retirada | Diálogo explica que a retirada é irreversível e o que é cancelado ou mantido | Aprovado | [19-rf16-retirada-dialogo-confirmacao.png](web/19-rf16-retirada-dialogo-confirmacao.png) |
| WEBM-017 | RF16 | Retirada sem motivo | Mensagem "Informe o motivo da retirada.", sem enviar ao backend | Aprovado | [20-rf16-retirada-erro-motivo-obrigatorio.png](web/20-rf16-retirada-erro-motivo-obrigatorio.png) |
| WEBM-018 | RF16 | Motivo da retirada preenchido | Motivo aceito, com contador de até 500 caracteres | Aprovado | [21-rf16-retirada-motivo-preenchido.png](web/21-rf16-retirada-motivo-preenchido.png) |
| WEBM-019 | RF16 | Retirada registrada | Notificação da retirada e participante "Retirado", sem ações, ainda na lista | Aprovado | [22-rf16-retirada-sucesso.png](web/22-rf16-retirada-sucesso.png) |
| WEBM-020 | RF16 | Agendamento bloqueado para o retirado | Aviso de que não é possível agendar, reagendar nem registrar visitas, sem o formulário | Aprovado | [23-rf16-retirada-agendamento-bloqueado.png](web/23-rf16-retirada-agendamento-bloqueado.png) |
| WEBM-021 | RF14 | Histórico com a ação Registrar resultados | Visita realizada sem resultado mostra o botão "Registrar resultados" | Aprovado | [24-rf14-historico-registrar-resultados.png](web/24-rf14-historico-registrar-resultados.png) |
| WEBM-022 | RF14 | Formulário de resultados | Um campo por atividade prevista e aviso de dados fictícios | Aprovado | [25-rf14-resultados-formulario.png](web/25-rf14-resultados-formulario.png) |
| WEBM-023 | RF14 | Resultado acima de 1.000 caracteres | Mensagem "O resultado pode ter até 1000 caracteres.", sem enviar | Aprovado | [26-rf14-resultados-erro-texto-longo.png](web/26-rf14-resultados-erro-texto-longo.png) |
| WEBM-024 | RF14 | Resultados salvos | Notificação e resultado exibido no histórico, com o botão "Editar resultados" | Aprovado | [27-rf14-resultados-sucesso.png](web/27-rf14-resultados-sucesso.png) |
| WEBM-025 | RF14 | Edição do resultado | Texto salvo alterado, com quem registrou e quando | Aprovado | [28-rf14-resultados-edicao.png](web/28-rf14-resultados-edicao.png) |
| WEBM-026 | RF14 | Resultados em visita não realizada | Aviso "Visita não realizada", sem o formulário | Aprovado | [29-rf14-resultados-visita-nao-realizada.png](web/29-rf14-resultados-visita-nao-realizada.png) |
| WEBM-027 | RF15 | Histórico visto pelo pesquisador | Histórico completo em ordem cronológica, somente para consulta | Aprovado | [30-rf15-historico-pesquisador.png](web/30-rf15-historico-pesquisador.png) |
| WEBM-028 | RF15 | Histórico de participante inexistente | Mensagem "Participante não encontrado" (404 `RECURSO_NAO_ENCONTRADO`), sem expor dados | Aprovado | [31-rf15-historico-nao-encontrado.png](web/31-rf15-historico-nao-encontrado.png) |
| WEBM-029 | RF16 | Diálogo de retirada aberto pelo histórico | Mesmo diálogo da lista, com motivo obrigatório e aviso da visita que será cancelada | Aprovado | [32-rf16-retirada-pelo-historico-dialogo.png](web/32-rf16-retirada-pelo-historico-dialogo.png) |
| WEBM-030 | RF16 | Retirada registrada pelo histórico | Participante "Retirado", visita agendada cancelada e visitas realizadas e resultados preservados | Aprovado | [33-rf16-retirada-pelo-historico-sucesso.png](web/33-rf16-retirada-pelo-historico-sucesso.png) |

### 4.3 Mobile (automatizados)

Testes de serviços, contexto de autenticação e telas com Jest, em `mobile/__tests__`, e fluxo E2E com Maestro. Por causa do volume, uma linha por arquivo de teste.

| ID | Requisito | Arquivo | O que cobre | Nº de testes | Resultado |
|---|---|---|---|---|---|
| MOB-001 | RF02 | `mobile/__tests__/authContext.test.tsx` | Sessão do participante (AuthProvider): guarda a sessão, recusa outro perfil, credenciais inválidas e saída mesmo com falha do servidor | 4 | Aprovado |
| MOB-002 | RF02 | `mobile/__tests__/authRestricao.test.tsx` | Restrição ao participante com o AuthProvider real e só o serviço mockado: perfil recusado com logout, participante aceito e recusa na restauração da sessão | 3 | Aprovado |
| MOB-003 | RF02 | `mobile/__tests__/login.test.tsx` | Tela de login: campos, credenciais inválidas, e-mail sem espaços, falha de conexão, outro perfil e sessão expirada | 7 | Aprovado |
| MOB-004 | RF02 | `mobile/__tests__/loginRestricao.test.tsx` | Mensagem de perfil não participante, aviso de sessão expirada e envio de e-mail e senha | 5 | Aprovado |
| MOB-005 | RF17 | `mobile/__tests__/estudos.test.tsx` | Tela de estudos | 6 | Aprovado |
| MOB-006 | RF18 | `mobile/__tests__/visitas.test.tsx` | Tela de visitas | 8 | Aprovado |
| MOB-007 | Geral | `mobile/__tests__/navegacao.test.tsx` | Navegação do aplicativo | 6 | Aprovado |
| MOB-008 | RF02 | `mobile/.maestro/login-navegacao-logout.yaml` | E2E no emulador: login, navegação por Estudos, Visitas e Perfil e logout | 1 fluxo | Aprovado |

**Total:** 7 suítes e 39 testes Jest passando (`npm test`), mais 1 fluxo E2E com Maestro.
Evidências: [login (Jest)](mobile/13-rf02-jest-login.png), [suíte completa (Jest)](mobile/14-geral-jest-suite-completa.png) e [E2E (Maestro)](mobile/15-rf02-e2e-maestro-login-navegacao-logout.png).

### 4.4 Mobile (manuais)

Cada linha é um print do aplicativo no emulador Android, com o backend real. O procedimento está no [roteiro de testes do mobile](mobile/roteiro-testes-mobile.md).

| ID | Requisito | Cenário | Esperado | Resultado | Evidência |
|---|---|---|---|---|---|
| MOBM-001 | RF02 | Validação de autenticação e sessão no Android | Login, reutilização de sessão por cookie, proteção CSRF, logout e persistência após reabrir o Expo Go, conforme roteiro | Aprovado | [Roteiro e evidências](mobile/roteiro-rf02-validacao-sessao.md) |
| MOBM-002 | RF02 | Tela de login vazia | Campos de e-mail e senha e botão Entrar | Aprovado | [01-rf02-login-tela-vazia.jpeg](mobile/01-rf02-login-tela-vazia.jpeg) |
| MOBM-003 | RF02 | Credenciais inválidas | Aviso "E-mail ou senha inválidos. Confira os dados e tente novamente." | Aprovado | [02-rf02-login-erro-credenciais.jpeg](mobile/02-rf02-login-erro-credenciais.jpeg) |
| MOBM-004 | RF02 | Login com sucesso | Abre a tela inicial do participante | Aprovado | [03-rf02-login-sucesso.jpeg](mobile/03-rf02-login-sucesso.jpeg) |
| MOBM-005 | RF02 | Sair pela aba Perfil | Retorno à tela de login | Aprovado | [04-rf02-login-aba-perfil-sair.jpeg](mobile/04-rf02-login-aba-perfil-sair.jpeg) |
| MOBM-006 | RF02 | Acesso de pesquisador bloqueado | Sessão encerrada e aviso "Este aplicativo é para participantes. Use o sistema web." | Aprovado | [05-rf02-acesso-pesquisador-bloqueado.jpeg](mobile/05-rf02-acesso-pesquisador-bloqueado.jpeg) |
| MOBM-007 | RF02 | Acesso de coordenador bloqueado | Mesmo comportamento do pesquisador | Aprovado | [06-rf02-acesso-coordenador-bloqueado.jpeg](mobile/06-rf02-acesso-coordenador-bloqueado.jpeg) |
| MOBM-008 | RF02 | Falha de conexão no login | Aviso "Não foi possível entrar agora. Tente novamente." | Aprovado | [19-rf02-login-erro-conexao.jpeg](mobile/19-rf02-login-erro-conexao.jpeg) |
| MOBM-009 | RF17 | Lista de estudos vazia | Mensagem de que não há estudos | Aprovado | [07-rf17-estudos-lista-vazia.jpeg](mobile/07-rf17-estudos-lista-vazia.jpeg) |
| MOBM-010 | RF17 | Participação ativa | Estudo listado com a situação ativa | Aprovado | [08-rf17-estudos-participacao-ativa.jpeg](mobile/08-rf17-estudos-participacao-ativa.jpeg) |
| MOBM-011 | RF17 | Participação retirada | Estudo listado com a situação "Retirada" | Aprovado | [09-rf17-estudos-participacao-retirada.jpeg](mobile/09-rf17-estudos-participacao-retirada.jpeg) |
| MOBM-012 | RF17 | Falha ao carregar estudos | Aviso "Não foi possível carregar seus estudos. Tente novamente." | Aprovado | [20-rf17-estudos-erro-carregamento.jpeg](mobile/20-rf17-estudos-erro-carregamento.jpeg) |
| MOBM-013 | RF18 | Lista de visitas vazia | Mensagem de que não há visitas | Aprovado | [10-rf18-visitas-lista-vazia.jpeg](mobile/10-rf18-visitas-lista-vazia.jpeg) |
| MOBM-014 | RF18 | Visita agendada | Visita futura na aba Próximas | Aprovado | [11-rf18-visitas-visita-agendada.jpeg](mobile/11-rf18-visitas-visita-agendada.jpeg) |
| MOBM-015 | RF18 | Histórico com visitas canceladas | Aba Histórico com contadores e visitas "Cancelada" | Aprovado | [12-rf18-visitas-historico-visitas-canceladas.jpeg](mobile/12-rf18-visitas-historico-visitas-canceladas.jpeg) |
| MOBM-016 | RF18 | Falha ao carregar, aba Próximas | Aviso "Não foi possível carregar suas visitas. Tente novamente." | Aprovado | [21-rf18-visitas-proximas-erro-carregamento.jpeg](mobile/21-rf18-visitas-proximas-erro-carregamento.jpeg) |
| MOBM-017 | RF18 | Falha ao carregar, aba Histórico | Mesmo aviso, com os dados da última carga mantidos | Aprovado | [22-rf18-visitas-historico-erro-carregamento.jpeg](mobile/22-rf18-visitas-historico-erro-carregamento.jpeg) |
