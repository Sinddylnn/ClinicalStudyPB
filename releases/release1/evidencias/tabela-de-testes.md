# Tabela de testes — Release 1

Lista de todos os testes da Release 1, por ferramenta. Os resultados correspondem à execução completa registrada no [relatório de testes](backend/postman/relatorio-execucao.md).

## 1. Testes automatizados do backend (Spring)

Cada linha é um método de teste. O cenário vem do comentário do próprio teste. A coluna Tipo foi sugerida pelo nome do teste e deve ser revisada.

| ID | Requisito | Camada | Classe de teste | Cenário | Tipo (sugerido) | Resultado |
|---|---|---|---|---|---|---|
| SPR-001 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Verifica a documentação produzida pelo springdoc com os filtros reais de segurança | Sucesso | Aprovado |
| SPR-002 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere permissões, CSRF, erros e DTOs das operações administrativas reais | Sucesso | Aprovado |
| SPR-003 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere as operações de estudos e a diferença entre coordenador opcional e obrigatório | Sucesso | Aprovado |
| SPR-004 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere os recursos necessários para abrir a interface no navegador sem login | Sucesso | Aprovado |
| SPR-005 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confirma que publicar a documentação não libera a sessão nem remove o CSRF | Erro/negativo | Aprovado |
| SPR-006 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Mantém o contrato das novas operações disponível para a integração da web | Sucesso | Aprovado |
| SPR-007 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere as operações e limites publicados para a integração da web | Sucesso | Aprovado |
| SPR-008 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere rotas, corpos, respostas, segurança e códigos documentados das visitas | Sucesso | Aprovado |
| SPR-009 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere rotas, schemas e erros publicados para cadastro e edição de resultados | Sucesso | Aprovado |
| SPR-010 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere a consulta das participações e o schema de seus dados | Sucesso | Aprovado |
| SPR-011 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere que a retirada de participantes está publicada no contrato | Sucesso | Aprovado |
| SPR-012 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere que as consultas do participante estão publicadas, sem exigir CSRF | Sucesso | Aprovado |
| SPR-013 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere os contratos GET da visita e de seus resultados para a web | Sucesso | Aprovado |
| SPR-014 | Transversal (erros e contrato da API) | API (MockMvc) | `DocumentacaoApiTest` | Confere a publicação da consulta do histórico completo de gestão (RF15) | Sucesso | Aprovado |
| SPR-015 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Verifica o contrato de erros usando a aplicação real e requisições simuladas | Erro/negativo | Aprovado |
| SPR-016 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Confere que dados válidos são aceitos sem acionar o tratamento de erros | Erro/negativo | Aprovado |
| SPR-017 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Confere a resposta para JSON malformado sem divulgar detalhes de sua leitura | Sucesso | Aprovado |
| SPR-018 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Confere a preservação do código e da mensagem de uma regra de negócio | Sucesso | Aprovado |
| SPR-019 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Confere a resposta HTTP 404 no formato de erro da API | Erro/negativo | Aprovado |
| SPR-020 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Confere a resposta HTTP 405 para um método não aceito pelo endereço | Erro/negativo | Aprovado |
| SPR-021 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Confere a rejeição de conteúdo em texto quando a entrada esperada é JSON | Erro/negativo | Aprovado |
| SPR-022 | Transversal (erros e contrato da API) | API (MockMvc) | `TratadorErrosApiTest` | Confere que a resposta HTTP 500 não expõe a mensagem interna da exceção | Erro/negativo | Aprovado |
| SPR-023 | RF07 | Integração (PostgreSQL) | `EstudoEstadoPersistenciaIT` | Confere commits, migrações e bloqueios em banco exclusivo de testes | Erro/negativo | Aprovado |
| SPR-024 | RF07 | Integração (PostgreSQL) | `EstudoEstadoPersistenciaIT` | Salva o motivo nos dois encerramentos antecipados e bloqueia a troca de coordenador | Erro/negativo | Aprovado |
| SPR-025 | RF07 | Integração (PostgreSQL) | `EstudoEstadoPersistenciaIT` | Confere a consulta real de visitas sem atividade e o protocolo com intervalos na ordem | Sucesso | Aprovado |
| SPR-026 | RF07 | Integração (PostgreSQL) | `EstudoEstadoPersistenciaIT` | Mostra que a atribuição espera a transação concorrente e lê o estado já encerrado | Erro/negativo | Aprovado |
| SPR-027 | RF07 | Integração (PostgreSQL) | `EstudoEstadoPersistenciaIT` | Aplica as migrações novas sobre V4 e preserva os estudos existentes | Sucesso | Aprovado |
| SPR-028 | RF07 | Integração (PostgreSQL) | `EstudoEstadoPersistenciaIT` | Cria dados completos ou uma visita pendente, exclusivamente para o cenário | Sucesso | Aprovado |
| SPR-029 | RF07 | Unitário | `EstudoEstadoTest` | Confere a matriz completa de estados e a preservação dos dados quando a operação falha | Sucesso | Aprovado |
| SPR-030 | RF07 | Unitário | `EstudoEstadoTest` | Exige um motivo preenchido nos dois caminhos de encerramento antecipado | Erro/negativo | Aprovado |
| SPR-031 | RF07 | Unitário | `EstudoEstadoTest` | Confere os limites do texto e não exige justificativa ao encerrar a execução | Erro/negativo | Aprovado |
| SPR-032 | RF07 | Unitário | `EstudoEstadoTest` | Evita gravar uma justificativa de encerramento em outro tipo de mudança | Erro/negativo | Aprovado |
| SPR-033 | RF07 | Unitário | `EstudoEstadoTest` | Preserva o coordenador e a justificativa após o encerramento | Erro/negativo | Aprovado |
| SPR-034 | RF04 | Integração (PostgreSQL) | `EstudoPersistenciaIT` | Confere migrações, consultas JPA e vínculos usando PostgreSQL real | Sucesso | Aprovado |
| SPR-035 | RF04 | Integração (PostgreSQL) | `EstudoPersistenciaIT` | Confirma que os vínculos reais impedem trocar o perfil de pesquisadores e coordenadores | Erro/negativo | Aprovado |
| SPR-036 | RF04 | Integração (PostgreSQL) | `EstudoPersistenciaIT` | Ordena pelo cadastro mesmo quando o último estudo tem data prevista anterior | Sucesso | Aprovado |
| SPR-037 | RF04 | Integração (PostgreSQL) | `EstudoPersistenciaIT` | Aplica V3 sobre V1/V2 com dados existentes e verifica a chave estrangeira criada | Sucesso | Aprovado |
| SPR-038 | RF05 | API (MockMvc) | `CriterioControllerTest` | Cadastra criterio de inclusao | Sucesso | Aprovado |
| SPR-039 | RF05 | API (MockMvc) | `CriterioControllerTest` | Normaliza descricao antes do cadastro | Sucesso | Aprovado |
| SPR-040 | RF05 | API (MockMvc) | `CriterioControllerTest` | Recusa descricao em branco | Erro/negativo | Aprovado |
| SPR-041 | RF05 | API (MockMvc) | `CriterioControllerTest` | Impede alteracao fora do planejamento | Erro/negativo | Aprovado |
| SPR-042 | RF05 | API (MockMvc) | `CriterioControllerTest` | Impede pesquisador de alterar estudo de outro responsavel | Erro/negativo | Aprovado |
| SPR-043 | RF05 | API (MockMvc) | `CriterioControllerTest` | Permite declarar ausencia de criterios de exclusao | Sucesso | Aprovado |
| SPR-044 | RF05 | API (MockMvc) | `CriterioControllerTest` | Recusa declarar ausencia quando existem criterios de exclusao | Erro/negativo | Aprovado |
| SPR-045 | RF05 | API (MockMvc) | `CriterioControllerTest` | Recusa exclusao enquanto declaracao estiver marcada | Erro/negativo | Aprovado |
| SPR-046 | RF05 | API (MockMvc) | `CriterioControllerTest` | Bloqueia coordenador na configuracao de exclusao | Erro/negativo | Aprovado |
| SPR-047 | RF05 | API (MockMvc) | `CriterioControllerTest` | Lista criterios do estudo | Sucesso | Aprovado |
| SPR-048 | RF05 | API (MockMvc) | `CriterioControllerTest` | Lista vazia quando estudo nao possui protocolo | Sucesso | Aprovado |
| SPR-049 | RF05 | API (MockMvc) | `CriterioControllerTest` | Bloqueia coordenador nos endpoints de criterio | Erro/negativo | Aprovado |
| SPR-050 | RF05 | API (MockMvc) | `CriterioControllerTest` | Consulta declaracao sem criar protocolo e recupera valor salvo | Sucesso | Aprovado |
| SPR-051 | RF05 | API (MockMvc) | `CriterioControllerTest` | Coordenador vinculado consulta mas nao altera mesmo apos encerramento | Erro/negativo | Aprovado |
| SPR-052 | RF05 | API (MockMvc) | `CriterioControllerTest` | Edita e remove criterio preservando identidade e declaracao | Sucesso | Aprovado |
| SPR-053 | RF05 | API (MockMvc) | `CriterioControllerTest` | Rejeita troca para exclusao com declaracao marcada | Erro/negativo | Aprovado |
| SPR-054 | RF05 | API (MockMvc) | `CriterioControllerTest` | Nao altera criterio de outro protocolo | Erro/negativo | Aprovado |
| SPR-055 | RF05 | API (MockMvc) | `CriterioControllerTest` | Protege nova operacao0 | Sucesso | Aprovado |
| SPR-056 | RF05 | API (MockMvc) | `CriterioControllerTest` | Protege nova operacao1 | Sucesso | Aprovado |
| SPR-057 | RF04 | API (MockMvc) | `EstudoControllerTest` | Exercita HTTP, validação, segurança e serviço de estudos com repositórios simulados | Sucesso | Aprovado |
| SPR-058 | RF04 | API (MockMvc) | `EstudoControllerTest` | Permite definir um coordenador ativo já no cadastro | Sucesso | Aprovado |
| SPR-059 | RF04 | API (MockMvc) | `EstudoControllerTest` | Aceita os valores mínimos e máximos permitidos no cadastro | Sucesso | Aprovado |
| SPR-060 | RF04 | API (MockMvc) | `EstudoControllerTest` | Permite cadastrar estudo com datas passadas quando o período é válido | Sucesso | Aprovado |
| SPR-061 | RF04 | API (MockMvc) | `EstudoControllerTest` | Remove espaços das extremidades do título e do objetivo no cadastro | Sucesso | Aprovado |
| SPR-062 | RF04 | API (MockMvc) | `EstudoControllerTest` | Recusa contas com perfil diferente e coordenadores desativados nas duas operações | Erro/negativo | Aprovado |
| SPR-063 | RF04 | API (MockMvc) | `EstudoControllerTest` | Informa conta inexistente sem criar estudo nem alterar o vínculo anterior | Erro/negativo | Aprovado |
| SPR-064 | RF04 | API (MockMvc) | `EstudoControllerTest` | Confere campos obrigatórios, limites e identificadores antes de persistir | Erro/negativo | Aprovado |
| SPR-065 | RF04 | API (MockMvc) | `EstudoControllerTest` | Fornece entradas que violam o contrato do cadastro | Erro/negativo | Aprovado |
| SPR-066 | RF04 | API (MockMvc) | `EstudoControllerTest` | Recusa números decimais no JSON sem arredondar nem salvar um estudo | Erro/negativo | Aprovado |
| SPR-067 | RF04 | API (MockMvc) | `EstudoControllerTest` | Aceita o maior inteiro suportado sem alterar seu valor | Sucesso | Aprovado |
| SPR-068 | RF04 | API (MockMvc) | `EstudoControllerTest` | Usa os mesmos textos dos campos obrigatórios no formulário web | Sucesso | Aprovado |
| SPR-069 | RF04 | API (MockMvc) | `EstudoControllerTest` | Distingue vínculo por pesquisador, por coordenador e ausência de vínculos | Sucesso | Aprovado |
| SPR-070 | RF04 | API (MockMvc) | `EstudoControllerTest` | Atribui depois do cadastro e retira da listagem do coordenador substituído | Sucesso | Aprovado |
| SPR-071 | RF04 | API (MockMvc) | `EstudoControllerTest` | Não revela nem altera um estudo pertencente a outro pesquisador | Erro/negativo | Aprovado |
| SPR-072 | RF04 | API (MockMvc) | `EstudoControllerTest` | Exige uma escolha válida para atribuir e não interpreta ausência como remoção | Erro/negativo | Aprovado |
| SPR-073 | RF04 | API (MockMvc) | `EstudoControllerTest` | Oferece opções ativas ao pesquisador sem expor e-mail, senha ou hash | Sucesso | Aprovado |
| SPR-074 | RF04 | API (MockMvc) | `EstudoControllerTest` | Preserva a distinção entre falta de sessão e falta de CSRF | Erro/negativo | Aprovado |
| SPR-075 | RF04 | API (MockMvc) | `EstudoControllerTest` | Mantém cadastro, seleção e atribuição exclusivos de pesquisadores | Erro/negativo | Aprovado |
| SPR-076 | RF04 | API (MockMvc) | `EstudoControllerTest` | Interrompe a sessão quando a conta pesquisadora deixa de estar ativa | Erro/negativo | Aprovado |
| SPR-077 | RF04 | API (MockMvc) | `EstudoControllerTest` | Confere as cinco transições pela API, usando o serviço e os filtros reais | Sucesso | Aprovado |
| SPR-078 | RF04 | API (MockMvc) | `EstudoControllerTest` | Exige um protocolo completo e identifica a visita ainda sem atividade | Erro/negativo | Aprovado |
| SPR-079 | RF04 | API (MockMvc) | `EstudoControllerTest` | Confere as quatro combinações possíveis entre exclusões cadastradas e declaração | Sucesso | Aprovado |
| SPR-080 | RF04 | API (MockMvc) | `EstudoControllerTest` | Bloqueia execução sem inclusão, encerramento antecipado com inclusão e reabertura | Erro/negativo | Aprovado |
| SPR-081 | RF04 | API (MockMvc) | `EstudoControllerTest` | Rejeita corpo inválido e justificativa ausente sem modificar o estudo | Erro/negativo | Aprovado |
| SPR-082 | RF04 | API (MockMvc) | `EstudoControllerTest` | Mantém sessão, CSRF, perfil e isolamento por pesquisador no novo endpoint | Sucesso | Aprovado |
| SPR-083 | RF04 | API (MockMvc) | `EstudoControllerTest` | Prepara somente as consultas simuladas do protocolo completo no teste de API | Erro/negativo | Aprovado |
| SPR-084 | RF04 | API (MockMvc) | `EstudoControllerTest` | Informa os IDs dos participantes quando há visitas pendentes | Erro/negativo | Aprovado |
| SPR-085 | RF04 | API (MockMvc) | `EstudoControllerTest` | Permite encerrar um estudo sem visitas pendentes | Sucesso | Aprovado |
| SPR-086 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Cadastra visita prevista | Sucesso | Aprovado |
| SPR-087 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Normaliza dados da visita | Sucesso | Aprovado |
| SPR-088 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Recusa ordem duplicada | Erro/negativo | Aprovado |
| SPR-089 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Impede cadastro fora do planejamento | Erro/negativo | Aprovado |
| SPR-090 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Cadastra atividade na visita | Sucesso | Aprovado |
| SPR-091 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Recusa atividade em visita de outro estudo | Erro/negativo | Aprovado |
| SPR-092 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Impede cadastro de atividade sem protocolo | Erro/negativo | Aprovado |
| SPR-093 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Lista visitas com atividades | Sucesso | Aprovado |
| SPR-094 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Bloqueia coordenador nos endpoints de visita | Erro/negativo | Aprovado |
| SPR-095 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Coordenador vinculado consulta visitas apos encerramento | Sucesso | Aprovado |
| SPR-096 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Edita visita e atividade preservando ids | Sucesso | Aprovado |
| SPR-097 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Recusa ordem de outra visita na edicao | Erro/negativo | Aprovado |
| SPR-098 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Remove atividade e visita | Sucesso | Aprovado |
| SPR-099 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Recusa ids de outra visita ou atividade | Erro/negativo | Aprovado |
| SPR-100 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Protege nova operacao0 | Sucesso | Aprovado |
| SPR-101 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Protege nova operacao1 | Sucesso | Aprovado |
| SPR-102 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Protege nova operacao2 | Sucesso | Aprovado |
| SPR-103 | RF06 | API (MockMvc) | `VisitaPrevistaControllerTest` | Protege nova operacao3 | Sucesso | Aprovado |
| SPR-104 | RF09 | Integração (PostgreSQL) | `AvaliacaoElegibilidadePersistenciaIT` | Salva atualiza e consulta avaliacao no postgresql | Sucesso | Aprovado |
| SPR-105 | RF09 | Integração (PostgreSQL) | `AvaliacaoElegibilidadePersistenciaIT` | Impede sobrescrever respostas e metadados após uma inclusão já confirmada | Erro/negativo | Aprovado |
| SPR-106 | RF09 | Integração (PostgreSQL) | `AvaliacaoElegibilidadePersistenciaIT` | Aplica V9 sobre inclusões legadas sem apagar registros ou inventar candidatos | Sucesso | Aprovado |
| SPR-107 | RF08 | Integração (PostgreSQL) | `CandidatoPersistenciaIT` | Salva e consulta candidato no banco | Sucesso | Aprovado |
| SPR-108 | RF10, RF11 | Integração (PostgreSQL) | `ConsentimentoInclusaoPersistenciaIT` | Registra corrige inclui e preserva historico | Sucesso | Aprovado |
| SPR-109 | RF10, RF11 | Integração (PostgreSQL) | `ConsentimentoInclusaoPersistenciaIT` | Ultima recusa impede inclusao mesmo depois de aceite | Erro/negativo | Aprovado |
| SPR-110 | RF10, RF11 | Integração (PostgreSQL) | `ConsentimentoInclusaoPersistenciaIT` | Nao confia em resumo elegivel quando respostas reprovam | Sucesso | Aprovado |
| SPR-111 | RF10, RF11 | Integração (PostgreSQL) | `ConsentimentoInclusaoPersistenciaIT` | Avaliacao e inclusao simultaneas preservam consistencia | Sucesso | Aprovado |
| SPR-112 | RF10, RF11 | Integração (PostgreSQL) | `ConsentimentoInclusaoPersistenciaIT` | Duas inclusoes disputam ultima vaga sem ultrapassar limite | Erro/negativo | Aprovado |
| SPR-113 | RF10, RF11 | Integração (PostgreSQL) | `ConsentimentoInclusaoPersistenciaIT` | Inclusao aguarda encerramento e reconfere estado | Sucesso | Aprovado |
| SPR-114 | RF10, RF11 | Integração (PostgreSQL) | `ConsentimentoInclusaoPersistenciaIT` | Inclusao reconfere conta depois de troca concorrente de perfil | Sucesso | Aprovado |
| SPR-115 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Consulta candidato ainda nao avaliado | Sucesso | Aprovado |
| SPR-116 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Consulta candidato sem protocolo | Sucesso | Aprovado |
| SPR-117 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Considera elegivel quando todos criterios sao validos | Sucesso | Aprovado |
| SPR-118 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Permite salvar avaliacao incompleta | Sucesso | Aprovado |
| SPR-119 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Considera inelegivel quando inclusao nao foi atendida | Sucesso | Aprovado |
| SPR-120 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Considera inelegivel quando exclusao esta presente | Sucesso | Aprovado |
| SPR-121 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Mantem incompleta mesmo com criterio reprovado | Sucesso | Aprovado |
| SPR-122 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Recusa avaliacao sem nenhuma resposta | Erro/negativo | Aprovado |
| SPR-123 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Recusa resposta incompativel com tipo do criterio | Erro/negativo | Aprovado |
| SPR-124 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Recusa criterio fora do protocolo | Erro/negativo | Aprovado |
| SPR-125 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Recusa criterio duplicado | Erro/negativo | Aprovado |
| SPR-126 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Impede avaliacao fora do recrutamento | Erro/negativo | Aprovado |
| SPR-127 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Impede pesquisador de avaliar | Erro/negativo | Aprovado |
| SPR-128 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Impede outro coordenador de avaliar | Erro/negativo | Aprovado |
| SPR-129 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Impede consulta por outro coordenador | Erro/negativo | Aprovado |
| SPR-130 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Impede avaliacao de candidato inexistente | Erro/negativo | Aprovado |
| SPR-131 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Exige csrf para salvar avaliacao | Erro/negativo | Aprovado |
| SPR-132 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Bloqueia coordenador antes do estudo | Erro/negativo | Aprovado |
| SPR-133 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Pesquisador consulta seu estudo mesmo encerrado | Sucesso | Aprovado |
| SPR-134 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Pesquisador nao consulta estudo de outro responsavel | Sucesso | Aprovado |
| SPR-135 | RF09 | API (MockMvc) | `AvaliacaoElegibilidadeControllerTest` | Impede edicao apos inclusao sem gravar respostas ou registro | Erro/negativo | Aprovado |
| SPR-136 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Cadastra candidato no estudo | Sucesso | Aprovado |
| SPR-137 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Normaliza nome e email | Sucesso | Aprovado |
| SPR-138 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Recusa nome em branco | Erro/negativo | Aprovado |
| SPR-139 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Recusa email invalido | Erro/negativo | Aprovado |
| SPR-140 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Recusa email duplicado | Erro/negativo | Aprovado |
| SPR-141 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Impede cadastro fora do recrutamento | Erro/negativo | Aprovado |
| SPR-142 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Impede coordenador de outro estudo | Erro/negativo | Aprovado |
| SPR-143 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Impede pesquisador de cadastrar candidato | Erro/negativo | Aprovado |
| SPR-144 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Lista candidatos do estudo | Sucesso | Aprovado |
| SPR-145 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Lista candidato com elegibilidade e consentimento atualizados | Sucesso | Aprovado |
| SPR-146 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Lista vazia quando nao ha candidatos | Sucesso | Aprovado |
| SPR-147 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Impede listagem por outro coordenador | Erro/negativo | Aprovado |
| SPR-148 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Permite pesquisador responsavel listar candidatos | Sucesso | Aprovado |
| SPR-149 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Pesquisador consulta seu estudo mesmo encerrado | Sucesso | Aprovado |
| SPR-150 | RF08 | API (MockMvc) | `CandidatoControllerTest` | Pesquisador nao consulta estudo de outro responsavel | Sucesso | Aprovado |
| SPR-151 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Inclui retorna data e impede duplicata | Erro/negativo | Aprovado |
| SPR-152 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Corrige consentimento preservando recusa e autor | Erro/negativo | Aprovado |
| SPR-153 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Consulta pendente sem criar registro | Sucesso | Aprovado |
| SPR-154 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Consulta conta correspondente sem expor gestao de usuarios | Sucesso | Aprovado |
| SPR-155 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Rejeita conta incompativel | Erro/negativo | Aprovado |
| SPR-156 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Rejeita limite historico e conta ja incluida | Erro/negativo | Aprovado |
| SPR-157 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Rejeita elegibilidade invalida | Erro/negativo | Aprovado |
| SPR-158 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Reconfere respostas mesmo com resumo elegivel | Sucesso | Aprovado |
| SPR-159 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Exige respostas completas e avaliacao persistida | Erro/negativo | Aprovado |
| SPR-160 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Rejeita protocolo sem criterio inclusao | Erro/negativo | Aprovado |
| SPR-161 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Exige historico de aceite e nao apenas resumo | Erro/negativo | Aprovado |
| SPR-162 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Nao corrige consentimento apos inclusao | Erro/negativo | Aprovado |
| SPR-163 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Rejeita resposta invalida | Erro/negativo | Aprovado |
| SPR-164 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Valida limite da observacao apos normalizar | Sucesso | Aprovado |
| SPR-165 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Exige identificador valido | Erro/negativo | Aprovado |
| SPR-166 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Bloqueia escrita fora do recrutamento | Erro/negativo | Aprovado |
| SPR-167 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Bloqueia escrita de outros perfis | Erro/negativo | Aprovado |
| SPR-168 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Exige vinculos nas leituras e escritas | Erro/negativo | Aprovado |
| SPR-169 | RF10, RF11 | API (MockMvc) | `ConsentimentoInclusaoControllerTest` | Exige sessao e csrf | Erro/negativo | Aprovado |
| SPR-170 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Verifica login, sessão, logout, CSRF, CORS e perfis usando os filtros reais | Erro/negativo | Aprovado |
| SPR-171 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Bloqueia login sem CSRF antes de consultar as credenciais | Erro/negativo | Aprovado |
| SPR-172 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Cria uma sessão para cada perfil sem expor nem conservar o hash nas credenciais | Sucesso | Aprovado |
| SPR-173 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Renova o identificador de sessão e o token CSRF ao aceitar o login | Sucesso | Aprovado |
| SPR-174 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Usa a mesma resposta para senha errada, conta ausente e conta desativada | Erro/negativo | Aprovado |
| SPR-175 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Fornece recusas de credenciais, incluindo o limite de bytes do BCrypt | Erro/negativo | Aprovado |
| SPR-176 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Confere as permissões da Sprint 1 para todos os perfis existentes | Sucesso | Aprovado |
| SPR-177 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Bloqueia imediatamente uma conta desativada depois de abrir a sessão | Erro/negativo | Aprovado |
| SPR-178 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Remove permissões antigas quando o administrador muda de perfil | Sucesso | Aprovado |
| SPR-179 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Mantém acesso negado em JSON quando a restrição é aplicada no método Java | Erro/negativo | Aprovado |
| SPR-180 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Invalida a sessão no servidor e recusa seu uso posterior | Erro/negativo | Aprovado |
| SPR-181 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Impede que logout por GET ou sem CSRF encerre a sessão | Erro/negativo | Aprovado |
| SPR-182 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Aceita o preflight da web configurada sem exigir login antecipado | Sucesso | Aprovado |
| SPR-183 | RF02, RF03 | API (MockMvc) | `AutenticacaoTest` | Recusa uma origem diferente sem divulgar permissão CORS | Erro/negativo | Aprovado |
| SPR-184 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Confere validações, acesso e regras de usuários com controller e serviço reais | Erro/negativo | Aprovado |
| SPR-185 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Aceita exatamente oito caracteres e armazena somente o hash BCrypt | Sucesso | Aprovado |
| SPR-186 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Mantém os textos do formulário no cadastro e na edição | Sucesso | Aprovado |
| SPR-187 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Recusa o cadastro quando um campo obrigatório não é informado | Erro/negativo | Aprovado |
| SPR-188 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Fornece exemplos de campos obrigatórios ausentes no cadastro | Erro/negativo | Aprovado |
| SPR-189 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Normaliza nome e e-mail antes de salvar o novo usuário | Sucesso | Aprovado |
| SPR-190 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Confere o limite em bytes, inclusive quando há acentos na senha | Sucesso | Aprovado |
| SPR-191 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Fornece exemplos que distinguem bytes de caracteres | Erro/negativo | Aprovado |
| SPR-192 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Fornece nome e endereço de e-mail acima de 255 caracteres | Erro/negativo | Aprovado |
| SPR-193 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Preserva pelo menos um administrador e verifica a ordem da consulta protegida | Erro/negativo | Aprovado |
| SPR-194 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Impede retirar o perfil do último administrador ativo | Erro/negativo | Aprovado |
| SPR-195 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Permite remover um administrador quando outro permanece ativo | Sucesso | Aprovado |
| SPR-196 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Confere o 404 e o conflito identificado pela consulta prévia | Erro/negativo | Aprovado |
| SPR-197 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Confere o conflito quando a restrição única é identificada somente ao salvar | Erro/negativo | Aprovado |
| SPR-198 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Reativa uma conta que estava desativada | Sucesso | Aprovado |
| SPR-199 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Impede usar na edição um e-mail que já pertence a outra conta | Erro/negativo | Aprovado |
| SPR-200 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Lista usuários ativos e desativados na gestão administrativa | Sucesso | Aprovado |
| SPR-201 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Impede retirar o perfil necessário para vínculos já existentes | Erro/negativo | Aprovado |
| SPR-202 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Permite editar dados pessoais sem retirar o perfil exigido pelo estudo | Sucesso | Aprovado |
| SPR-203 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Mantém disponível a troca de perfil quando não há vínculos incompatíveis | Erro/negativo | Aprovado |
| SPR-204 | RF01 | API (MockMvc) | `UsuarioControllerTest` | Prepara uma requisição administrativa com CSRF válido | Erro/negativo | Aprovado |

## 2. Cenários da API (Postman)

Resultado conforme a execução completa em [evidencias/backend/postman](backend/postman/). Os valores entre chaves duplas são variáveis do ambiente Postman.

| ID | Requisito | Cenário | Requisição | Esperado | Resultado |
|---|---|---|---|---|---|
| API-001 | RF02 | Obter CSRF | GET `/auth/csrf` | 200 | Aprovado |
| API-002 | RF02 | Login inválido (senha errada) | POST `/auth/login` | 401 | Aprovado |
| API-003 | RF02 | Login Admin | POST `/auth/login` | 200 | Aprovado |
| API-004 | RF02 | Consultar sessão | GET `/auth/sessao` | 200 | Aprovado |
| API-005 | RF01 | Cadastrar pesquisador | POST `/usuarios` | 201 | Aprovado |
| API-006 | RF01 | Cadastrar coordenador | POST `/usuarios` | 201 | Aprovado |
| API-007 | RF01 | Cadastrar participante | POST `/usuarios` | 201 | Aprovado |
| API-008 | RF01 | Cadastrar e-mail duplicado | POST `/usuarios` | 409 | Aprovado |
| API-009 | RF01 | Cadastrar inválido (sem nome, e-mail malformado) | POST `/usuarios` | 400 | Aprovado |
| API-010 | RF01 | Listar usuários | GET `/usuarios` | 200 | Aprovado |
| API-011 | RF01 | Editar usuário | PUT `/usuarios/{{pesquisadorId}}` | 200 | Aprovado |
| API-012 | RF01 | Editar inválido (perfil inexistente) | PUT `/usuarios/{{pesquisadorId}}` | 400 | Aprovado |
| API-013 | RF01 | Editar usuário inexistente | PUT `/usuarios/999999` | 404 | Aprovado |
| API-014 | RF01 | Desativar usuário | PATCH `/usuarios/{{pesquisadorId}}/desativar` | 200 | Aprovado |
| API-015 | RF01 | Desativar usuário inexistente | PATCH `/usuarios/999999/desativar` | 404 | Aprovado |
| API-016 | RF01 | Reativar usuário | PATCH `/usuarios/{{pesquisadorId}}/reativar` | 200 | Aprovado |
| API-017 | RF02 | Logout Admin | POST `/auth/logout` | 204 | Aprovado |
| API-018 | RF02 | Login Pesquisador | POST `/auth/login` | 200 | Aprovado |
| API-019 | RF04 | Listar coordenadores disponíveis | GET `/estudos/coordenadores` | 200 | Aprovado |
| API-020 | RF04 | Cadastrar estudo | POST `/estudos` | 201 | Aprovado |
| API-021 | RF04 | Cadastrar estudo inválido (campos vazios, limite 0) | POST `/estudos` | 400 | Aprovado |
| API-022 | RF04 | Cadastrar estudo inválido (fim antes do início) | POST `/estudos` | 400 | Aprovado |
| API-023 | RF04 | Cadastrar estudo com coordenador inexistente | POST `/estudos` | 404 | Aprovado |
| API-024 | RF04 | Listar estudos | GET `/estudos` | 200 | Aprovado |
| API-025 | RF04 | Atribuir coordenador | PUT `/estudos/{{estudoId}}/coordenador` | 200 | Aprovado |
| API-026 | RF04 | Atribuir coordenador inválido (conta não é coordenador) | PUT `/estudos/{{estudoId}}/coordenador` | 400 | Aprovado |
| API-027 | RF04 | Atribuir coordenador a estudo inexistente | PUT `/estudos/999999/coordenador` | 404 | Aprovado |
| API-028 | RF03 | Listar usuários sem permissão (Pesquisador) | GET `/usuarios` | 403 | Aprovado |
| API-029 | RF07 | Abrir recrutamento sem protocolo | PATCH `/estudos/{{estudoId}}/estado` | 400 | Aprovado |
| API-030 | RF07 | Pular planejamento para execução | PATCH `/estudos/{{estudoId}}/estado` | 400 | Aprovado |
| API-031 | RF07 | Encerrar sem justificativa | PATCH `/estudos/{{estudoId}}/estado` | 400 | Aprovado |
| API-032 | RF07 | Encerrar estudo sem inclusões | PATCH `/estudos/{{estudoId}}/estado` | 200 | Aprovado |
| API-033 | RF07 | Reabrir estudo encerrado | PATCH `/estudos/{{estudoId}}/estado` | 400 | Aprovado |
| API-034 | RF07 | Alterar coordenador após encerramento | PUT `/estudos/{{estudoId}}/coordenador` | 400 | Aprovado |
| API-035 | RF05, RF06 | Cadastrar estudo com coordenador | POST `/estudos` | 201 | Aprovado |
| API-036 | RF05, RF06 | Cadastrar critério de inclusão | POST `/estudos/{{estudo2Id}}/criterios` | 201 | Aprovado |
| API-037 | RF05, RF06 | Cadastrar critério inválido (descrição vazia) | POST `/estudos/{{estudo2Id}}/criterios` | 400 | Aprovado |
| API-038 | RF05, RF06 | Cadastrar critério inválido (tipo inexistente) | POST `/estudos/{{estudo2Id}}/criterios` | 400 | Aprovado |
| API-039 | RF05, RF06 | Listar critérios | GET `/estudos/{{estudo2Id}}/criterios` | 200 | Aprovado |
| API-040 | RF05, RF06 | Editar critério | PUT `/estudos/{{estudo2Id}}/criterios/{{criterioId}}` | 200 | Aprovado |
| API-041 | RF05, RF06 | Editar critério inexistente | PUT `/estudos/{{estudo2Id}}/criterios/999999` | 404 | Aprovado |
| API-042 | RF05, RF06 | Cadastrar critério temporário | POST `/estudos/{{estudo2Id}}/criterios` | 201 | Aprovado |
| API-043 | RF05, RF06 | Remover critério temporário | DELETE `/estudos/{{estudo2Id}}/criterios/{{criterioTmpId}}` | 204 | Aprovado |
| API-044 | RF05, RF06 | Declarar ausência de critérios de exclusão | PUT `/estudos/{{estudo2Id}}/criterios/exclusao` | 200 | Aprovado |
| API-045 | RF05, RF06 | Consultar declaração de exclusão | GET `/estudos/{{estudo2Id}}/criterios/exclusao` | 200 | Aprovado |
| API-046 | RF05, RF06 | Cadastrar visita prevista | POST `/estudos/{{estudo2Id}}/visitas` | 201 | Aprovado |
| API-047 | RF05, RF06 | Cadastrar visita com ordem duplicada | POST `/estudos/{{estudo2Id}}/visitas` | 400 | Aprovado |
| API-048 | RF05, RF06 | Cadastrar visita inválida (nome vazio, ordem 0) | POST `/estudos/{{estudo2Id}}/visitas` | 400 | Aprovado |
| API-049 | RF05, RF06 | Cadastrar atividade prevista | POST `/estudos/{{estudo2Id}}/visitas/{{visitaId}}/atividades` | 201 | Aprovado |
| API-050 | RF05, RF06 | Cadastrar atividade inválida (descrição vazia) | POST `/estudos/{{estudo2Id}}/visitas/{{visitaId}}/atividades` | 400 | Aprovado |
| API-051 | RF05, RF06 | Listar visitas previstas | GET `/estudos/{{estudo2Id}}/visitas` | 200 | Aprovado |
| API-052 | RF05, RF06 | Abrir recrutamento com protocolo completo | PATCH `/estudos/{{estudo2Id}}/estado` | 200 | Aprovado |
| API-053 | RF05, RF06 | Editar critério fora do planejamento | PUT `/estudos/{{estudo2Id}}/criterios/{{criterioId}}` | 400 | Aprovado |
| API-054 | RF08 a RF11 | Logout Pesquisador | POST `/auth/logout` | 204 | Aprovado |
| API-055 | RF08 a RF11 | Login Coordenador | POST `/auth/login` | 200 | Aprovado |
| API-056 | RF08 a RF11 | Cadastrar candidato | POST `/estudos/{{estudo2Id}}/candidatos` | 201 | Aprovado |
| API-057 | RF08 a RF11 | Cadastrar candidato com e-mail duplicado | POST `/estudos/{{estudo2Id}}/candidatos` | 409 | Aprovado |
| API-058 | RF08 a RF11 | Cadastrar candidato inválido (e-mail malformado) | POST `/estudos/{{estudo2Id}}/candidatos` | 400 | Aprovado |
| API-059 | RF08 a RF11 | Listar candidatos | GET `/estudos/{{estudo2Id}}/candidatos` | 200 | Aprovado |
| API-060 | RF08 a RF11 | Salvar elegibilidade sem respostas | PUT `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/elegibilidade` | 400 | Aprovado |
| API-061 | RF08 a RF11 | Salvar elegibilidade | PUT `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/elegibilidade` | 200 | Aprovado |
| API-062 | RF08 a RF11 | Consultar elegibilidade | GET `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/elegibilidade` | 200 | Aprovado |
| API-063 | RF08 a RF11 | Registrar aceite de consentimento | PUT `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/consentimento` | 200 | Aprovado |
| API-064 | RF08 a RF11 | Consultar histórico de consentimento | GET `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/consentimento/historico` | 200 | Aprovado |
| API-065 | RF08 a RF11 | Consultar condições de inclusão | GET `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/inclusao` | 200 | Aprovado |
| API-066 | RF08 a RF11 | Incluir candidato como participante | POST `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/inclusao` | 201 | Aprovado |
| API-067 | RF08 a RF11 | Incluir candidato novamente | POST `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/inclusao` | 409 | Aprovado |
| API-068 | RF08 a RF11 | Corrigir consentimento após inclusão | PUT `/estudos/{{estudo2Id}}/candidatos/{{candidatoId}}/consentimento` | 400 | Aprovado |
| API-069 | RF08 a RF11 | Logout Coordenador | POST `/auth/logout` | 204 | Aprovado |
| API-070 | RF08 a RF11 | Login Pesquisador (retorno) | POST `/auth/login` | 200 | Aprovado |
| API-071 | RF03 | Pesquisador não cadastra candidato | POST `/estudos/{{estudo2Id}}/candidatos` | 403 | Aprovado |
| API-072 | RF08 a RF11 | Iniciar execução com inclusão | PATCH `/estudos/{{estudo2Id}}/estado` | 200 | Aprovado |
| API-073 | RF02 | Logout | POST `/auth/logout` | 204 | Aprovado |
| API-074 | RF02 | Rota protegida após logout | GET `/usuarios` | 401 | Aprovado |

## 3. Testes manuais (Swagger)

Os prints estão em [evidencias/backend/swagger](backend/swagger/): documentação do contrato e rotas de exemplo.
