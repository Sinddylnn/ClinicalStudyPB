# Planning  Sprint 2
 
| Informação | Definição |
|---|---|
| Projeto | ClinicalStudyPB - Engenharia de Software II, UEPB, 2026.2 |
| Product Owner da sprint | Georis Samuel Martins Gouveia |
| Início planejado | 27/10/2026 |
| Final planejado | 09/11/2026 |
| Duração planejada | 2 semanas |
| Encerramento confirmado | <dd/mm/2026> |
| Esforço planejado | <total> horas: <x> h de implementação, preparação, testes e organização + <y> h de reunião |
 
O período corresponde ao burndown e ao encerramento confirmado pela equipe.
Os IDs e títulos abaixo seguem os prints do Azure DevOps.
 
## Objetivo da sprint
 
Entregar os requisitos RF05 a RF11 (critérios de inclusão e exclusão, visitas previstas,
estados do estudo, recrutamento, elegibilidade, consentimento e inclusão de participantes),
integrar as telas web com o backend e concluir a Release 1 com testes e correção de defeitos.
Manter o aplicativo mobile executável e corrigir problemas da base da Sprint 1.
 
## PBIs e critérios de aceite
 
| PBI no Azure | Escopo e resultado esperado | Horas |
|---|---|---:|
| **<id> - Critérios, visitas e estados do estudo** | RF05 a RF07: como pesquisador, definir critérios de inclusão e exclusão, visitas previstas e atividades, e gerenciar os estados do estudo (planejamento, recrutamento, execução e encerrado). <Detalhar validações e regras de transição.> | <h> |
| **<id> - Recrutamento e elegibilidade** | RF08 e RF09: como coordenador, cadastrar candidatos vinculados a um estudo e registrar a avaliação dos critérios de elegibilidade. <Detalhar.> | <h> |
| **<id> - Consentimento e inclusão** | RF10 e RF11: registrar o consentimento simulado e incluir candidatos elegíveis e com consentimento, respeitando o limite de vagas. <Detalhar.> | <h> |
| **<id> - Integração e testes** | Item habilitador: telas web integradas ao backend; testes unitários, de integração, de componentes e E2E; correção de defeitos; <pendências da Sprint 1, se herdadas>. | <h> |
| **<id> - Mobile e documentação** | Item habilitador: app mobile executável e verificado (Task 3418); README principal e evidências da Release 1 organizados (Task 3493). | <h> |
| **<id> - Reuniões** | Reunião de acompanhamento em <dd/mm>, com participação dos seis integrantes e 1 h prevista por pessoa. | 6 |
| **Total** | **<n> PBIs no Azure e <n> tasks, incluindo as seis participações na reunião.** | **<total>** |
 
Um **item habilitador** prepara a base necessária para desenvolver o sistema, sem
entregar sozinho uma funcionalidade final ao usuário.
 
<Registrar regras de negócio decididas na sprint, por exemplo: quem pode cadastrar candidatos, o que acontece ao atingir o limite de vagas, quais transições de estado são permitidas.>
 
## Tasks e responsáveis
 
As horas são estimativas de planejamento, não um registro de horas efetivamente gastas.
 
| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| <id> | <id> | <nome> | <Atividade> | <h> |
| <id> | <id> | <nome> | <Atividade> | <h> |
| 3418 | <id> | Horlan | Manter aplicação mobile executável e corrigir problemas da base da Sprint 1 | <h> |
| 3493 | <id> | Horlan | Apoiar atualização do README principal e organização das evidências da Release 1 | <h> |
 
### Reunião de acompanhamento
 
| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| <id> | <id> | Georis | Participar da Reunião da Sprint (<dd/mm>) | 1 |
| <id> | <id> | Luiz | Participar da Reunião da Sprint (<dd/mm>) | 1 |
| <id> | <id> | Suelle | Participar da Reunião da Sprint (<dd/mm>) | 1 |
| <id> | <id> | Sinddy | Participar da Reunião da Sprint (<dd/mm>) | 1 |
| <id> | <id> | Horlan | Participar da Reunião da Sprint (<dd/mm>) | 1 |
| <id> | <id> | Gabriela | Participar da Reunião da Sprint (<dd/mm>) | 1 |
 
### Distribuição das horas
 
| Integrante | Tasks específicas, incluindo organização | Reunião | Total |
|---|---:|---:|---:|
| Georis | <h> | 1 h | <h> |
| Luiz | <h> | 1 h | <h> |
| Suelle | <h> | 1 h | <h> |
| Sinddy | <h> | 1 h | <h> |
| Horlan | <h> | 1 h | <h> |
| Gabriela | <h> | 1 h | <h> |
 
## Dependências principais
 
- <Task X> depende de <Task Y>. Por exemplo: as telas de recrutamento dependem dos endpoints de candidatos; a inclusão (RF11) depende da elegibilidade (RF09) e do consentimento (RF10).
- <Dependência>
## Critérios de conclusão
 
Um item está pronto quando seus critérios de aceite foram demonstrados, o código
foi revisado por outra pessoa e integrado, o pipeline foi aprovado, validações e
erros foram testados, os dados foram persistidos quando aplicável e o README e as
evidências foram atualizados.
 
## Demonstração prevista para a Review
 
<Roteiro da demonstração. Por exemplo: cadastrar estudo, definir critérios e visitas, mudar estado para recrutamento, cadastrar candidato, avaliar elegibilidade, registrar consentimento e incluir participante; mostrar erro de limite de vagas e de candidato inelegível; apresentar testes, cobertura, Swagger UI e o burndown.>
 
O resultado e o gráfico de acompanhamento estão na [Review da Sprint 2](review.md).