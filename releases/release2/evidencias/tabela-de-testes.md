# Tabela de testes — Release 2

Lista de todos os testes da Release 2, por ferramenta, cobrindo o backend (seções 1 a 3), a web e o mobile (seção 4). Atualize a coluna Resultado conforme os testes forem executados (Pendente, Aprovado ou Reprovado) e preencha a coluna Evidência com o link do print.

## 1. Testes automatizados do backend (Spring)

Cada linha é um método de teste. O cenário vem do comentário do próprio teste. A coluna Tipo foi sugerida pelo nome do teste e deve ser revisada. Depois de executar a suíte, atualize o resultado com `python docs/relatorios/gerar_tabela_spring.py 2` (use o terceiro argumento `Aprovado` quando não houver falhas).

| ID | Requisito | Camada | Classe de teste | Cenário | Tipo (sugerido) | Resultado |
|---|---|---|---|---|---|---|
| SPR-001 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere o mapeamento JPA e as migrações do acompanhamento em PostgreSQL exclusivo de testes | Sucesso | Pendente |
| SPR-002 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Persiste visita, resultado, correção e retirada com seus vínculos e dados de auditoria | Sucesso | Pendente |
| SPR-003 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere no PostgreSQL a contagem de visitas por estudo e situação | Sucesso | Pendente |
| SPR-004 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Registra a retirada no PostgreSQL e confere que somente visitas AGENDADA são canceladas | Sucesso | Pendente |
| SPR-005 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere no PostgreSQL o filtro por conta, situação, ordenação e data de corte | Sucesso | Pendente |
| SPR-006 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere no PostgreSQL a ordem das visitas e o carregamento da visita prevista na mesma consulta, evitando buscas adicionais durante a montagem do histórico | Sucesso | Pendente |
| SPR-007 | RF12 a RF16 | Integração (PostgreSQL) | `AcompanhamentoPersistenciaIT` | Confere o filtro por participação e a ordem das correções e dos resultados | Sucesso | Pendente |
| SPR-008 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Verifica o cadastro, a edição e a integridade de resultados fictícios no PostgreSQL exclusivo de testes da equipe | Sucesso | Pendente |
| SPR-009 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Confere que a edição preserva o cadastro original e grava a atualização | Sucesso | Pendente |
| SPR-010 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Confere que resultados parciais são aceitos, sem exigir todas as atividades | Sucesso | Pendente |
| SPR-011 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Garante que a constraint única do PostgreSQL rejeita gravação duplicada mesmo quando a validação do serviço não é utilizada | Erro/negativo | Pendente |
| SPR-012 | RF14 | Integração (PostgreSQL) | `ResultadoAtividadePersistenciaIT` | Confere a consulta por resultado e visita e a unicidade independente entre visitas diferentes | Erro/negativo | Pendente |
| SPR-013 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Testa a segurança e o contrato HTTP do histórico completo da participação | Sucesso | Pendente |
| SPR-014 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere se os perfis autorizados podem consultar uma participação sem eventos | Erro/negativo | Pendente |
| SPR-015 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere que administrador e participante não acessam o histórico de gestão | Erro/negativo | Pendente |
| SPR-016 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere o bloqueio de uma consulta sem sessão autenticada | Erro/negativo | Pendente |
| SPR-017 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere o retorno 404 quando o estudo não está no vínculo do usuário | Erro/negativo | Pendente |
| SPR-018 | RF15 | API (MockMvc) | `HistoricoParticipacaoControllerTest` | Confere o retorno 404 para uma participação fora do estudo informado | Erro/negativo | Pendente |
| SPR-019 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Coordenador pode listar participacoes | Sucesso | Pendente |
| SPR-020 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Verifica se o pesquisador pode consultar as participações do estudo pelo qual é responsável | Sucesso | Pendente |
| SPR-021 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Perfil sem permissao nao pode listar | Sucesso | Pendente |
| SPR-022 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Listagem sem login eh bloqueada | Sucesso | Pendente |
| SPR-023 | RF12 (apoio) | API (MockMvc) | `ParticipacaoConsultaControllerTest` | Estudo nao encontrado retorna404 | Sucesso | Pendente |
| SPR-024 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Participante consulta estudos sem expor campos de gestao | Sucesso | Pendente |
| SPR-025 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Participante consulta proximas visitas sem expor motivo | Sucesso | Pendente |
| SPR-026 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Participante consulta historico filtrando por estudo sem expor dados internos | Sucesso | Pendente |
| SPR-027 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Estudo sem vinculo recebe404 | Sucesso | Pendente |
| SPR-028 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Estudo id nao numerico recebe400 | Sucesso | Pendente |
| SPR-029 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Outros perfis recebem403 | Sucesso | Pendente |
| SPR-030 | RF17, RF18 | API (MockMvc) | `ParticipanteConsultaControllerTest` | Sem login recebe401 | Sucesso | Pendente |
| SPR-031 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Testa os endpoints HTTP de consulta, cadastro e edição de resultados fictícios, incluindo contrato JSON, validações, autenticação, permissões e CSRF | Sucesso | Pendente |
| SPR-032 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Retorna uma lista vazia quando a visita não possui resultados | Erro/negativo | Pendente |
| SPR-033 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa consultas sem autenticação | Erro/negativo | Pendente |
| SPR-034 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa consultas por perfis sem permissão | Erro/negativo | Pendente |
| SPR-035 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Retorna HTTP 404 quando a visita não existe no vínculo informado | Erro/negativo | Pendente |
| SPR-036 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte uma negação do serviço em HTTP 403 | Erro/negativo | Pendente |
| SPR-037 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere status, vínculos, conteúdo da resposta e auditoria inicial | Sucesso | Pendente |
| SPR-038 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere que o texto é normalizado antes de chegar ao serviço | Sucesso | Pendente |
| SPR-039 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Aceita os limites de tamanho definidos no contrato de cadastro | Sucesso | Pendente |
| SPR-040 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa campos obrigatórios ausentes ou inválidos no cadastro | Erro/negativo | Pendente |
| SPR-041 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa texto maior que o máximo no cadastro | Erro/negativo | Pendente |
| SPR-042 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte uma regra de cadastro não atendida em erro HTTP 400 | Erro/negativo | Pendente |
| SPR-043 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Verifica o contrato de duplicidade com HTTP 409 | Erro/negativo | Pendente |
| SPR-044 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere erro HTTP 404 para estudo/visita sem vínculo no cadastro | Erro/negativo | Pendente |
| SPR-045 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere status HTTP 200 e resposta de edição com campos de auditoria | Sucesso | Pendente |
| SPR-046 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Confere que a edição remove espaços das pontas do texto | Sucesso | Pendente |
| SPR-047 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Aceita textos nos limites estabelecidos para edição | Sucesso | Pendente |
| SPR-048 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa ausência, nulidade ou texto vazio na edição | Erro/negativo | Pendente |
| SPR-049 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa texto maior que o limite na edição | Erro/negativo | Pendente |
| SPR-050 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte regras impeditivas de edição em HTTP 400 | Erro/negativo | Pendente |
| SPR-051 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte resultado ausente ou fora do vínculo em HTTP 404 | Erro/negativo | Pendente |
| SPR-052 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Bloqueia cadastro para perfis que não sejam coordenadores | Erro/negativo | Pendente |
| SPR-053 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Bloqueia edição para perfis que não sejam coordenadores | Erro/negativo | Pendente |
| SPR-054 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Exige autenticação para o cadastro | Sucesso | Pendente |
| SPR-055 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Exige autenticação para a edição | Sucesso | Pendente |
| SPR-056 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa cadastro sem token CSRF | Erro/negativo | Pendente |
| SPR-057 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa edição sem token CSRF | Erro/negativo | Pendente |
| SPR-058 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa cadastro com token CSRF inválido | Erro/negativo | Pendente |
| SPR-059 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Recusa edição com token CSRF inválido | Erro/negativo | Pendente |
| SPR-060 | RF14 | API (MockMvc) | `ResultadoAtividadeControllerTest` | Converte negação de acesso do serviço em HTTP 403 | Erro/negativo | Pendente |
| SPR-061 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Coordenador registra retirada e recebe resposta | Sucesso | Pendente |
| SPR-062 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Perfil sem permissao recebe403 | Sucesso | Pendente |
| SPR-063 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Sem login recebe401 | Sucesso | Pendente |
| SPR-064 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Sem csrf recebe403 | Erro/negativo | Pendente |
| SPR-065 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo ausente ou em branco recebe400 | Sucesso | Pendente |
| SPR-066 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo acima de500 caracteres recebe400 | Sucesso | Pendente |
| SPR-067 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo com um caractere eh aceito | Sucesso | Pendente |
| SPR-068 | RF16 | API (MockMvc) | `RetiradaParticipanteControllerTest` | Motivo com espacos nas pontas eh normalizado antes do servico | Sucesso | Pendente |
| SPR-069 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Testa os endpoints de consulta, agendamento, reagendamento, registro e correção de visitas, incluindo validações e permissões | Sucesso | Pendente |
| SPR-070 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede que usuários sem perfil de coordenador consultem visitas | Erro/negativo | Pendente |
| SPR-071 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede a consulta de visitas sem autenticação | Erro/negativo | Pendente |
| SPR-072 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Retorna HTTP 404 quando a visita não é encontrada pelo serviço | Erro/negativo | Pendente |
| SPR-073 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se coordenadores podem agendar visitas | Sucesso | Pendente |
| SPR-074 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se pesquisadores não podem agendar visitas | Erro/negativo | Pendente |
| SPR-075 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o agendamento exige autenticação | Sucesso | Pendente |
| SPR-076 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o agendamento exige um token CSRF válido | Erro/negativo | Pendente |
| SPR-077 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se coordenadores podem reagendar visitas | Sucesso | Pendente |
| SPR-078 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se usuários sem permissão não podem reagendar visitas | Erro/negativo | Pendente |
| SPR-079 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o reagendamento exige autenticação | Sucesso | Pendente |
| SPR-080 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o reagendamento exige um token CSRF válido | Erro/negativo | Pendente |
| SPR-081 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se identificadores inválidos retornam HTTP 400 | Erro/negativo | Pendente |
| SPR-082 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se uma data nula no agendamento retorna HTTP 400 | Erro/negativo | Pendente |
| SPR-083 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se uma data nula no reagendamento retorna HTTP 400 | Erro/negativo | Pendente |
| SPR-084 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se coordenadores podem registrar a situação de visitas | Sucesso | Pendente |
| SPR-085 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede o registro de visitas por usuários sem permissão | Erro/negativo | Pendente |
| SPR-086 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede o registro de situação sem token CSRF | Erro/negativo | Pendente |
| SPR-087 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede o registro de situação sem autenticação | Erro/negativo | Pendente |
| SPR-088 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede registrar uma visita sem informar a situação | Erro/negativo | Pendente |
| SPR-089 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Rejeita um motivo com mais de 500 caracteres | Erro/negativo | Pendente |
| SPR-090 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Verifica se o coordenador pode corrigir uma visita | Sucesso | Pendente |
| SPR-091 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede correções por usuários sem permissão | Erro/negativo | Pendente |
| SPR-092 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede correções sem token CSRF | Erro/negativo | Pendente |
| SPR-093 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Impede a correção de situação quando não há usuário autenticado | Erro/negativo | Pendente |
| SPR-094 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Rejeita a correção quando a justificativa é nula ou vazia | Erro/negativo | Pendente |
| SPR-095 | RF12, RF13 | API (MockMvc) | `VisitaAgendadaControllerTest` | Rejeita a correção quando a situação de destino não é informada | Erro/negativo | Pendente |
| SPR-096 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Testa o histórico completo de uma participação e as permissões de consulta | Sucesso | Pendente |
| SPR-097 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Uma visita agendada não possui registro de realização, resultados nem correções | Erro/negativo | Pendente |
| SPR-098 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Confirma a leitura pelo coordenador vinculado, inclusive em estudo encerrado | Sucesso | Pendente |
| SPR-099 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | A consulta vazia continua válida quando a participação está ativa | Erro/negativo | Pendente |
| SPR-100 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Um pesquisador não pode descobrir dados de um estudo alheio | Erro/negativo | Pendente |
| SPR-101 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Um coordenador não vinculado também recebe 404 | Erro/negativo | Pendente |
| SPR-102 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | A participação precisa pertencer ao estudo indicado na URL | Sucesso | Pendente |
| SPR-103 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Uma participação inexistente não deve iniciar buscas de dados do histórico | Erro/negativo | Pendente |
| SPR-104 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Administradores e participantes não têm acesso ao histórico de gestão | Erro/negativo | Pendente |
| SPR-105 | RF15 | Regras de negócio | `HistoricoParticipacaoServiceTest` | Uma identidade ausente é rejeitada antes de acessar o banco | Erro/negativo | Pendente |
| SPR-106 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Lista estudos da conta inclusive os retirados | Sucesso | Pendente |
| SPR-107 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Conta sem participacao recebe lista vazia | Sucesso | Pendente |
| SPR-108 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Proximas usa todas as participacoes eo inicio do dia de hoje | Sucesso | Pendente |
| SPR-109 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Proximas com estudo id filtra somente aquela participacao | Sucesso | Pendente |
| SPR-110 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Proximas sem participacoes nao consulta visitas | Sucesso | Pendente |
| SPR-111 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Proximas com estudo sem vinculo recebe404 | Sucesso | Pendente |
| SPR-112 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Historico consulta somente situacoes permitidas e sem dados de gestao | Sucesso | Pendente |
| SPR-113 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Historico com estudo sem vinculo recebe404 | Sucesso | Pendente |
| SPR-114 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Outros perfis recebem acesso negado | Erro/negativo | Pendente |
| SPR-115 | RF17, RF18 | Regras de negócio | `ParticipanteConsultaServiceTest` | Autenticacao ausente recebe acesso negado | Erro/negativo | Pendente |
| SPR-116 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Testa as regras de consulta, cadastro e edição dos resultados fictícios das atividades | Sucesso | Pendente |
| SPR-117 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede registrar duas vezes a mesma atividade na mesma visita | Erro/negativo | Pendente |
| SPR-118 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite cadastrar resultados parciais de atividades diferentes | Sucesso | Pendente |
| SPR-119 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede que um pesquisador registre resultados | Erro/negativo | Pendente |
| SPR-120 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o registro pelos demais perfis não autorizados | Erro/negativo | Pendente |
| SPR-121 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o registro sem uma identidade autenticada | Erro/negativo | Pendente |
| SPR-122 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o registro por coordenador sem vínculo com o estudo | Erro/negativo | Pendente |
| SPR-123 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede cadastrar resultado em uma visita ainda agendada | Erro/negativo | Pendente |
| SPR-124 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultados de visitas ausentes ou canceladas | Erro/negativo | Pendente |
| SPR-125 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede cadastrar resultados de participações retiradas | Erro/negativo | Pendente |
| SPR-126 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultados após o encerramento do estudo | Erro/negativo | Pendente |
| SPR-127 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede cadastrar resultados enquanto o estudo está em planejamento | Erro/negativo | Pendente |
| SPR-128 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite cadastrar resultados em estudo em execução | Sucesso | Pendente |
| SPR-129 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultado para atividade de outra visita prevista | Erro/negativo | Pendente |
| SPR-130 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultado para uma visita que não existe | Erro/negativo | Pendente |
| SPR-131 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede indicar na URL uma participação diferente da visita | Erro/negativo | Pendente |
| SPR-132 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede acessar uma participação pertencente a outro estudo | Erro/negativo | Pendente |
| SPR-133 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede resultados vinculados a protocolo de outro estudo | Erro/negativo | Pendente |
| SPR-134 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede o cadastro sem o corpo obrigatório | Erro/negativo | Pendente |
| SPR-135 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede identificadores ausentes ou não positivos | Erro/negativo | Pendente |
| SPR-136 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede textos nulos, vazios ou compostos só por espaços | Erro/negativo | Pendente |
| SPR-137 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede textos acima do limite de 1.000 caracteres | Erro/negativo | Pendente |
| SPR-138 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Aceita textos com os tamanhos mínimo e máximo permitidos | Sucesso | Pendente |
| SPR-139 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Normaliza os espaços das extremidades antes de salvar o texto | Sucesso | Pendente |
| SPR-140 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Cria um resultado existente para os testes de edição | Sucesso | Pendente |
| SPR-141 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite editar resultados enquanto o estudo está em execução | Sucesso | Pendente |
| SPR-142 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Bloqueia a edição para perfis sem permissão | Erro/negativo | Pendente |
| SPR-143 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Rejeita a edição sem usuário autenticado | Erro/negativo | Pendente |
| SPR-144 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede coordenador sem vínculo com o estudo de editar resultado | Erro/negativo | Pendente |
| SPR-145 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Bloqueia alterações de resultado em estudo encerrado | Erro/negativo | Pendente |
| SPR-146 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a edição quando o estudo não saiu do planejamento | Erro/negativo | Pendente |
| SPR-147 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultados quando a participação está retirada | Erro/negativo | Pendente |
| SPR-148 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a edição de resultados quando a visita não está realizada | Erro/negativo | Pendente |
| SPR-149 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultado que não existe | Erro/negativo | Pendente |
| SPR-150 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar um resultado existente que pertence a outra visita | Erro/negativo | Pendente |
| SPR-151 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultado passando outra participação na URL | Erro/negativo | Pendente |
| SPR-152 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar resultado de participação pertencente a outro estudo | Erro/negativo | Pendente |
| SPR-153 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede editar com visita prevista de protocolo de outro estudo | Erro/negativo | Pendente |
| SPR-154 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Rejeita resultado que aponta para atividade de outra visita prevista | Erro/negativo | Pendente |
| SPR-155 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede edição sem o corpo da requisição | Erro/negativo | Pendente |
| SPR-156 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede texto nulo, vazio ou formado somente por espaços na edição | Erro/negativo | Pendente |
| SPR-157 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede que a edição ultrapasse o limite de texto | Erro/negativo | Pendente |
| SPR-158 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite atualizar textos de tamanho mínimo ou máximo | Sucesso | Pendente |
| SPR-159 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Remove espaços das extremidades do novo texto | Sucesso | Pendente |
| SPR-160 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Prepara o vínculo do coordenador com o estudo e a visita consultada | Sucesso | Pendente |
| SPR-161 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Retorna lista vazia quando a visita não possui resultados registrados | Erro/negativo | Pendente |
| SPR-162 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite consultar resultados antigos após o encerramento do estudo | Sucesso | Pendente |
| SPR-163 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Mantém a consulta do histórico para participantes retirados | Sucesso | Pendente |
| SPR-164 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Permite consultar uma visita ainda agendada, mesmo sem resultados | Sucesso | Pendente |
| SPR-165 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar resultados sem um usuário autenticado | Erro/negativo | Pendente |
| SPR-166 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a consulta de resultados por perfis diferentes de coordenador | Erro/negativo | Pendente |
| SPR-167 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede a consulta por coordenador não vinculado ao estudo | Erro/negativo | Pendente |
| SPR-168 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar resultados de uma visita inexistente | Erro/negativo | Pendente |
| SPR-169 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar a visita usando o ID de outra participação | Erro/negativo | Pendente |
| SPR-170 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar a visita de uma participação de outro estudo | Erro/negativo | Pendente |
| SPR-171 | RF14 | Regras de negócio | `ResultadoAtividadeServiceTest` | Impede consultar resultados vinculados ao protocolo de outro estudo | Erro/negativo | Pendente |
| SPR-172 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Registra retirada em recrutamento ou execucao | Sucesso | Pendente |
| SPR-173 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Cancela visitas pendentes e preserva visita finalizada | Sucesso | Pendente |
| SPR-174 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Aceita motivo nos limites permitidos | Sucesso | Pendente |
| SPR-175 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Impede retirada em estado invalido | Erro/negativo | Pendente |
| SPR-176 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Perfil sem permissao nao pode registrar retirada | Sucesso | Pendente |
| SPR-177 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Autenticacao ausente nao pode registrar retirada | Sucesso | Pendente |
| SPR-178 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Coordenador nao vinculado recebe404 | Sucesso | Pendente |
| SPR-179 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Participacao de outro estudo recebe404 | Sucesso | Pendente |
| SPR-180 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Participacao inexistente recebe404 | Erro/negativo | Pendente |
| SPR-181 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Retirada eh irreversivel e impede segundo registro | Erro/negativo | Pendente |
| SPR-182 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Rejeita motivo vazio sem alterar participacao | Erro/negativo | Pendente |
| SPR-183 | RF16 | Regras de negócio | `RetiradaParticipanteServiceTest` | Rejeita motivo acima do limite | Erro/negativo | Pendente |
| SPR-184 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Testa as regras de agendamento, reagendamento, registro, correção e consulta de visitas dos participantes | Sucesso | Pendente |
| SPR-185 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede o cancelamento de uma visita sem motivo | Erro/negativo | Pendente |
| SPR-186 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o registro de uma visita realizada após a data agendada | Sucesso | Pendente |
| SPR-187 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar uma visita futura como realizada | Erro/negativo | Pendente |
| SPR-188 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o registro de ausência sem motivo | Sucesso | Pendente |
| SPR-189 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar ausência antes do dia agendado | Erro/negativo | Pendente |
| SPR-190 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar novamente uma visita finalizada | Erro/negativo | Pendente |
| SPR-191 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede o registro de visitas por usuários sem permissão | Erro/negativo | Pendente |
| SPR-192 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar visitas de estudos de outro coordenador | Erro/negativo | Pendente |
| SPR-193 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar uma visita de outra participação | Erro/negativo | Pendente |
| SPR-194 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registro em estado invalido | Erro/negativo | Pendente |
| SPR-195 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar realizada com motivo | Erro/negativo | Pendente |
| SPR-196 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar agendada como situacao final | Erro/negativo | Pendente |
| SPR-197 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Permite registrar realizada no dia da visita | Sucesso | Pendente |
| SPR-198 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registro de visita de participante retirado | Erro/negativo | Pendente |
| SPR-199 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registro de visita de outro estudo | Erro/negativo | Pendente |
| SPR-200 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede registrar uma visita prevista de outro estudo | Erro/negativo | Pendente |
| SPR-201 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica a correção de ausência para realização, preservando os dados anteriores no histórico | Sucesso | Pendente |
| SPR-202 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita que possui resultados registrados | Erro/negativo | Pendente |
| SPR-203 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede que uma correção retorne a visita para AGENDADA | Erro/negativo | Pendente |
| SPR-204 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita para a mesma situação | Erro/negativo | Pendente |
| SPR-205 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Prepara uma visita com situação final e os vínculos necessários | Erro/negativo | Pendente |
| SPR-206 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede correções para participantes retirados do estudo | Erro/negativo | Pendente |
| SPR-207 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Exige uma justificativa preenchida para corrigir a visita | Erro/negativo | Pendente |
| SPR-208 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Exige motivo ao corrigir uma visita para CANCELADA | Erro/negativo | Pendente |
| SPR-209 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Rejeita motivo na correção para REALIZADA | Erro/negativo | Pendente |
| SPR-210 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Uma visita ainda AGENDADA deve ser registrada antes de ser corrigida | Erro/negativo | Pendente |
| SPR-211 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Não permite converter visita futura em REALIZADA ou AUSENTE | Erro/negativo | Pendente |
| SPR-212 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Coordenadores não podem corrigir visitas de estudos não vinculados | Erro/negativo | Pendente |
| SPR-213 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede que a URL de outra participação acesse uma visita | Erro/negativo | Pendente |
| SPR-214 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita cuja participação pertence a outro estudo | Erro/negativo | Pendente |
| SPR-215 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede corrigir uma visita prevista ligada ao protocolo de outro estudo | Erro/negativo | Pendente |
| SPR-216 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede correções por perfis que não são COORDENADOR | Erro/negativo | Pendente |
| SPR-217 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Confirma que CANCELADA para REALIZADA limpa o motivo da visita, mas conserva o motivo anterior no histórico da correção | Sucesso | Pendente |
| SPR-218 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Prepara os dados usados nos testes de consulta | Sucesso | Pendente |
| SPR-219 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se um agendamento duplicado é impedido | Erro/negativo | Pendente |
| SPR-220 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se participantes retirados não podem receber agendamentos | Erro/negativo | Pendente |
| SPR-221 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se uma visita finalizada não pode ser reagendada | Erro/negativo | Pendente |
| SPR-222 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se datas anteriores ao dia atual são rejeitadas | Erro/negativo | Pendente |
| SPR-223 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a visita prevista deve pertencer ao estudo | Erro/negativo | Pendente |
| SPR-224 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se pesquisadores não podem agendar visitas | Erro/negativo | Pendente |
| SPR-225 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede o reagendamento de visitas por pesquisadores | Erro/negativo | Pendente |
| SPR-226 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica o reagendamento de uma visita pendente | Sucesso | Pendente |
| SPR-227 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o coordenador só pode agendar visitas em seus estudos | Erro/negativo | Pendente |
| SPR-228 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a participação deve pertencer ao estudo informado | Erro/negativo | Pendente |
| SPR-229 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o estado do estudo permite agendamento | Erro/negativo | Pendente |
| SPR-230 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o estado do estudo permite reagendamento | Erro/negativo | Pendente |
| SPR-231 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se é possível agendar uma visita para o dia atual | Sucesso | Pendente |
| SPR-232 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se uma visita não pode ser agendada para o dia anterior | Erro/negativo | Pendente |
| SPR-233 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a data não pode anteceder o início do estudo | Erro/negativo | Pendente |
| SPR-234 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a data não pode ultrapassar o fim do estudo | Erro/negativo | Pendente |
| SPR-235 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se uma data inválida impede o reagendamento | Erro/negativo | Pendente |
| SPR-236 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se participantes retirados não podem ter visitas reagendadas | Erro/negativo | Pendente |
| SPR-237 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a visita reagendada pertence à participação informada | Erro/negativo | Pendente |
| SPR-238 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a visita reagendada pertence ao estudo informado | Erro/negativo | Pendente |
| SPR-239 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se dois participantes podem agendar a mesma visita prevista | Sucesso | Pendente |
| SPR-240 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o agendamento é permitido às 23h do último dia do estudo | Sucesso | Pendente |
| SPR-241 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Prepara uma visita existente e os vínculos necessários para a consulta | Sucesso | Pendente |
| SPR-242 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Permite consultar visitas finalizadas e devolve os dados de registro | Sucesso | Pendente |
| SPR-243 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Mantém a consulta disponível após o encerramento do estudo | Sucesso | Pendente |
| SPR-244 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Permite consultar uma visita histórica de participação retirada | Sucesso | Pendente |
| SPR-245 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Bloqueia a consulta quando não existe usuário autenticado | Erro/negativo | Pendente |
| SPR-246 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Recusa a consulta por perfis diferentes de coordenador | Erro/negativo | Pendente |
| SPR-247 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Oculta visitas de estudo não vinculado ao coordenador da consulta | Erro/negativo | Pendente |
| SPR-248 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Devolve HTTP 404 quando a visita solicitada não existe | Erro/negativo | Pendente |
| SPR-249 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede consultar visita vinculada a outra participação da URL | Erro/negativo | Pendente |
| SPR-250 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede consultar visita cuja participação pertence a outro estudo | Erro/negativo | Pendente |
| SPR-251 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Impede consultar visita prevista ligada ao protocolo de outro estudo | Erro/negativo | Pendente |
| SPR-252 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se a listagem utiliza a consulta sem bloqueio pessimista | Erro/negativo | Pendente |
| SPR-253 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se participações retiradas continuam listadas com a data de retirada | Sucesso | Pendente |
| SPR-254 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o pesquisador responsável pode listar as participações do seu estudo | Sucesso | Pendente |
| SPR-255 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se o pesquisador não pode consultar participações de outro estudo | Erro/negativo | Pendente |
| SPR-256 | RF12, RF13 | Regras de negócio | `VisitaAgendadaServiceTest` | Verifica se administradores e participantes não podem consultar a listagem | Erro/negativo | Pendente |

## 2. Testes manuais (Swagger)

Para cada requisito, ao menos um cenário de sucesso e um de erro, com a requisição e a resposta visíveis no print. Procedimento no [roteiro de testes](backend/roteiro-de-testes.md).

| ID | Requisito | Cenário | Endpoint | Esperado | Responsável | Resultado | Evidência |
|---|---|---|---|---|---|---|---|
| SWG-001 | RF12 | Agendamento com sucesso | `POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas` | 201 Created, com o id da visita agendada | Luiz | Pendente | `swagger/rf12/01-rf12-agendamento-sucesso.png` |
| SWG-002 | RF12 | Agendamento duplicado | `POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas` | 409 Conflict, código VISITA_JA_AGENDADA | Luiz | Pendente | `swagger/rf12/02-rf12-agendamento-erro-duplicado.png` |
| SWG-003 | RF12 | Reagendamento com sucesso | `PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}` | 200 OK (conferir no Swagger) | Luiz | Pendente | `swagger/rf12/03-rf12-reagendamento-sucesso.png` |
| SWG-004 | RF12 | Reagendamento com data inválida | `PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}` | Recusa (conferir status e código no Swagger) | Luiz | Pendente | `swagger/rf12/04-rf12-reagendamento-erro.png` |
| SWG-005 | RF13 | Registrar visita realizada | `PATCH .../visitas/{visitaAgendadaId}/situacao` | 200 OK (conferir no Swagger) | Luiz | Pendente | `swagger/rf13/01-rf13-registro-realizada.png` |
| SWG-006 | RF13 | Registrar visita ausente | `PATCH .../visitas/{visitaAgendadaId}/situacao` | 200 OK (conferir no Swagger) | Luiz | Pendente | `swagger/rf13/02-rf13-registro-ausente.png` |
| SWG-007 | RF13 | Registrar visita cancelada | `PATCH .../visitas/{visitaAgendadaId}/situacao` | 200 OK (conferir no Swagger) | Luiz | Pendente | `swagger/rf13/03-rf13-registro-cancelada.png` |
| SWG-008 | RF13 | Registrar visita futura | `PATCH .../visitas/{visitaAgendadaId}/situacao` | Recusa (conferir status e código no Swagger) | Luiz | Pendente | `swagger/rf13/04-rf13-registro-erro.png` |
| SWG-009 | RF13 | Correção de visita | `POST .../visitas/{visitaAgendadaId}/correcoes` | Sucesso (conferir no Swagger) | Luiz | Pendente | `swagger/rf13/05-rf13-correcao-sucesso.png` |
| SWG-010 | RF13 | Correção de visita com resultados | `POST .../visitas/{visitaAgendadaId}/correcoes` | Recusa (conferir status e código no Swagger) | Luiz | Pendente | `swagger/rf13/06-rf13-correcao-erro.png` |
| SWG-011 | RF14 | Registrar resultado fictício | `POST .../visitas/{visitaAgendadaId}/resultados` | 201 Created (conferir no Swagger) | Luiz | Pendente | `swagger/rf14/01-rf14-resultado-sucesso.png` |
| SWG-012 | RF14 | Resultado em visita não realizada ou atividade incorreta | `POST .../visitas/{visitaAgendadaId}/resultados` | Recusa (conferir status e código no Swagger) | Luiz | Pendente | `swagger/rf14/02-rf14-resultado-erro.png` |
| SWG-013 | RF15 | Consultar histórico completo | `GET /estudos/{estudoId}/participacoes/{participacaoId}/historico` | 200 OK | Luiz | Pendente | `swagger/rf15/01-rf15-historico-sucesso.png` |
| SWG-014 | RF15 | Coordenador não vinculado ou perfil sem permissão | `GET /estudos/{estudoId}/participacoes/{participacaoId}/historico` | 404 ou 403 (conferir no Swagger) | Luiz | Pendente | `swagger/rf15/02-rf15-historico-erro-acesso.png` |
| SWG-015 | RF16 | Retirar participante e cancelar visitas pendentes | `POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada` | Sucesso (conferir no Swagger) | Georis | Pendente | `swagger/rf16/01-rf16-retirada-sucesso.png` |
| SWG-016 | RF16 | Motivo inválido ou retirada repetida | `POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada` | Recusa (conferir status e código no Swagger) | Georis | Pendente | `swagger/rf16/02-rf16-retirada-erro.png` |
| SWG-017 | RF17 | Participante consulta seus estudos | `GET /participante/estudos` | 200 OK | Georis | Pendente | `swagger/rf17/01-rf17-estudos-sucesso.png` |
| SWG-018 | RF17 | Perfil incorreto ou dados alheios | `GET /participante/estudos` | 403 ou recusa (conferir no Swagger) | Georis | Pendente | `swagger/rf17/02-rf17-estudos-erro.png` |
| SWG-019 | RF18 | Consultar próximas visitas | `GET /participante/visitas/proximas` | 200 OK | Georis | Pendente | `swagger/rf18/01-rf18-proximas-visitas.png` |
| SWG-020 | RF18 | Consultar histórico de visitas | `GET /participante/visitas/historico` | 200 OK | Georis | Pendente | `swagger/rf18/02-rf18-historico-sucesso.png` |
| SWG-021 | RF18 | Consultar estudo sem vínculo com o participante | `GET /participante/...` | Recusa (conferir status e código no Swagger) | Georis | Pendente | `swagger/rf18/03-rf18-consulta-erro.png` |

## 3. Cenários da API (Postman)

Gere as linhas depois de executar a coleção: `python docs/relatorios/gerar_tabela_postman.py docs/postman/ClinicalStudyPB.postman_collection.json` (ajuste `RF_POR_PASTA` no script para as pastas novas). Prints do Runner por requisito em [evidencias/backend/postman](backend/postman/).

| ID | Requisito | Cenário | Requisição | Esperado | Resultado |
|---|---|---|---|---|---|
| API-001 | | | | | |

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

| ID | Requisito | Arquivo | O que cobre | Nº de testes | Resultado |
|---|---|---|---|---|---|
| MOB-001 | | | | | |

### 4.4 Mobile (manuais)

| ID | Requisito | Cenário | Esperado | Resultado | Evidência |
|---|---|---|---|---|---|
| MOBM-001 | | | | | |
