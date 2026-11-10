# Planning Sprint 2

| Informação | Definição |
|---|---|
| Projeto | ClinicalStudyPB — Engenharia de Software II, UEPB, 2026.2 |
| Product Owner da Sprint | Luiz Inácio Moura da Costa |
| Início planejado | 27/10/2026 |
| Término planejado | 09/11/2026 |
| Duração planejada | 2 semanas |
| Encerramento confirmado | 09/11/2026 |
| Esforço planejado | 150 horas: 144 h de atividades dos PBIs + 6 h de reunião de acompanhamento |

O período planejado da Sprint 2 foi de 27/10 a 09/11/2026, com encerramento confirmado em 09/11/2026. Os resultados finais estão documentados na Review da Sprint.

As atividades, os responsáveis e as estimativas estão organizados nas tabelas a seguir, conforme o planejamento registrado no Azure DevOps.


## Objetivo da Sprint

Concluir as funcionalidades previstas para a Release 1 do ClinicalStudyPB, contemplando os requisitos RF05 a RF11: critérios de inclusão e exclusão, visitas previstas, gerenciamento dos estados do estudo, cadastro de candidatos, avaliação de elegibilidade, consentimento simulado e inclusão de participantes.

Também faz parte do objetivo integrar as telas web ao backend, manter a aplicação mobile executável, corrigir problemas identificados e validar as funcionalidades por meio de testes automatizados.

Ao final da Sprint, a equipe deverá apresentar a Release 1 com as funcionalidades integradas, documentação atualizada, evidências organizadas e resultados de testes e cobertura.



## PBIs e critérios de aceite

| PBI no Azure | Escopo e resultado esperado | Horas |
|---|---|---:|
| **3383 — Configuração do estudo** | RF05 a RF07: permitir que o pesquisador configure critérios de inclusão e exclusão, cadastre visitas previstas e suas atividades e gerencie os estados do estudo. As informações devem permanecer vinculadas ao estudo, respeitando as validações e transições permitidas. | 31 |
| **3384 — Recrutamento e elegibilidade** | RF08 e RF09: permitir que o coordenador cadastre candidatos vinculados ao estudo e avalie sua elegibilidade com base nos critérios definidos, registrando o resultado da avaliação. | 18 |
| **3385 — Consentimento e inclusão** | RF10 e RF11: permitir o registro do consentimento simulado e a inclusão de candidatos elegíveis como participantes, respeitando as regras de consentimento e o limite de vagas do estudo. | 15 |
| **3386 — Integração e qualidade** | Integrar os fluxos web ao backend, executar testes automatizados, corrigir defeitos e verificar a cobertura. Manter também a base da aplicação mobile executável. | 45 |
| **3387 — Entrega da Release 1** | Atualizar a documentação do projeto, organizar evidências, diagramas, relatórios de testes, cobertura e burndown, preparando a versão para apresentação e entrega da Release 1. | 35 |
| **3388 — Reuniões** | Realizar o acompanhamento da Sprint, com participação dos seis integrantes e previsão de 1 hora por pessoa. | 6 |
| **Total** | **5 PBIs principais e 1 PBI de reuniões.** | **150** |

Os PBIs 3386 e 3387 são itens habilitadores. Eles não representam diretamente novos requisitos funcionais, mas são necessários para integrar, testar, documentar e preparar a entrega da Release 1.

As 150 horas correspondem ao esforço planejado da Sprint, sendo 144 horas destinadas às atividades dos PBIs principais e 6 horas à reunião de acompanhamento.



## Tasks e responsáveis

As horas representam as estimativas definidas no planejamento da Sprint 2, não o tempo efetivamente gasto.

### Backend e Web 1

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3421 (T34) | 3383 | Georis | Modelar critérios, visitas e regras de transição dos estados do estudo | 4 |
| 3422 (T35) | 3383 | Georis | Implementar regras de mudança de estado do estudo | 5 |
| 3423 (T36) | 3385 | Georis | Implementar consentimento e inclusão de participantes no backend | 6 |
| 3424 (T37) | 3386 | Georis | Revisar contrato da API, integração dos fluxos e corrigir inconsistências | 4 |
| 3412 (T38) | 3387 | Georis | Revisar arquitetura e atualizar diagramas técnicos da Release 1 | 4 |
| 3392 (T39) | 3383 | Luiz | Implementar critérios de inclusão e exclusão dos estudos | 4 |
| 3395 (T40) | 3383 | Luiz | Implementar visitas previstas e suas atividades | 4 |
| 3396 (T41) | 3384 | Luiz | Implementar cadastro de candidatos vinculados ao estudo | 4 |
| 3397 (T42) | 3384 | Luiz | Implementar avaliação dos critérios de elegibilidade | 4 |
| 3398 (T43) | 3386 | Luiz | Testar regras de critérios, visitas, candidatos e elegibilidade | 4 |
| 3399 (T44) | 3387 | Luiz | Organizar Azure, capacidade, tasks, burndown e acompanhamento da Sprint 2 | 3 |
| 3413 (T45) | 3383 | Suelle | Implementar telas de critérios de inclusão e exclusão | 5 |
| 3414 (T46) | 3383 | Suelle | Implementar telas de visitas previstas e atividades | 5 |
| 3415 (T47) | 3383 | Suelle | Integrar alteração e exibição do estado do estudo | 4 |
| 3416 (T48) | 3386 | Suelle | Testar componentes das telas de configuração do estudo | 4 |
| 3417 (T49) | 3387 | Suelle | Produzir evidências e documentar fluxos web da Release 1 | 5 |

**Subtotal: 69 horas planejadas.**



### Web 2, Mobile e Qualidade

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3389 (T50) | 3384 | Sinddy | Implementar tela de cadastro e listagem de candidatos | 5 |
| 3390 (T51) | 3384 | Sinddy | Implementar interface de avaliação de elegibilidade | 5 |
| 3391 (T52) | 3385 | Sinddy | Implementar telas de consentimento e inclusão de participante | 5 |
| 3393 (T53) | 3386 | Sinddy | Testar componentes e validações do fluxo de recrutamento | 4 |
| 3394 (T54) | 3387 | Sinddy | Registrar evidências de sucesso e erro dos RF08 a RF11 | 4 |
| 3418 (T55) | 3386 | Horlan | Manter aplicação mobile executável e corrigir problemas da Sprint 1 | 4 |
| 3419 (T56) | 3386 | Horlan | Automatizar fluxo básico E2E da aplicação mobile | 5 |
| 3420 (T57) | 3387 | Horlan | Atualizar documentação de execução mobile e evidências no emulador | 4 |
| 3493 (T58) | 3387 | Horlan | Apoiar atualização do README principal e organização das evidências | 5 |
| 3494 (T59) | 3386 | Horlan | Revisar coleção Postman, exemplos e documentação da API | 5 |
| 3642 (T60) | 3385 | Gabriela | Testar API de consentimento, inclusão e limite de participantes | 4 |
| 3643 (T61) | 3386 | Gabriela | Executar testes de integração dos principais endpoints da Release 1 | 5 |
| 3644 (T62) | 3386 | Gabriela | Verificar cobertura do backend e preparar relatório para o mínimo de 80% | 5 |
| 3645 (T63) | 3386 | Gabriela | Atualizar E2E web para cobrir o fluxo principal da Release 1 | 5 |
| 3646 (T64) | 3387 | Gabriela | Revisar CI e organizar relatórios de testes e cobertura | 4 |

**Subtotal: 69 horas planejadas.**

### Preparação coletiva da Release 1

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3406 (T65) | 3387 | Luiz | Preparar README e evidências da Release 1 | 1 |
| 3407 (T65) | 3387 | Gabriela | Preparar README e evidências da Release 1 | 1 |
| 3408 (T65) | 3387 | Georis | Preparar README e evidências da Release 1 | 1 |
| 3409 (T65) | 3387 | Horlan | Preparar README e evidências da Release 1 | 1 |
| 3410 (T65) | 3387 | Sinddy | Preparar README e evidências da Release 1 | 1 |
| 3411 (T65) | 3387 | Suelle | Preparar README e evidências da Release 1 | 1 |

**Subtotal: 6 horas planejadas.**

### Reunião de acompanhamento

| Task no Azure | PBI | Responsável | Atividade | h |
|---|---|---|---|---:|
| 3400 (T66) | 3388 | Luiz | Participar da reunião de acompanhamento da Sprint | 1 |
| 3401 (T66) | 3388 | Georis | Participar da reunião de acompanhamento da Sprint | 1 |
| 3402 (T66) | 3388 | Gabriela | Participar da reunião de acompanhamento da Sprint | 1 |
| 3403 (T66) | 3388 | Sinddy | Participar da reunião de acompanhamento da Sprint | 1 |
| 3404 (T66) | 3388 | Suelle | Participar da reunião de acompanhamento da Sprint | 1 |
| 3405 (T66) | 3388 | Horlan | Participar da reunião de acompanhamento da Sprint | 1 |

**Subtotal: 6 horas planejadas.**

### Resumo do esforço planejado

| Grupo de atividades | Horas |
|---|---:|
| Backend e Web 1 | 69 |
| Web 2, Mobile e Qualidade | 69 |
| Preparação coletiva | 6 |
| Reunião de acompanhamento | 6 |
| **Total da Sprint 2** | **150** |



### Distribuição das horas

A distribuição foi realizada considerando as atividades específicas de cada integrante, a preparação coletiva da Release 1 e a reunião de acompanhamento da Sprint.

| Integrante | Tasks específicas | Preparação coletiva | Reunião | Total |
|---|---:|---:|---:|---:|
| Georis | 23 h | 1 h | 1 h | 25 h |
| Luiz | 23 h | 1 h | 1 h | 25 h |
| Suelle | 23 h | 1 h | 1 h | 25 h |
| Sinddy | 23 h | 1 h | 1 h | 25 h |
| Horlan | 23 h | 1 h | 1 h | 25 h |
| Gabriela | 23 h | 1 h | 1 h | 25 h |
| **Total** | **138 h** | **6 h** | **6 h** | **150 h** |

A Sprint 2 possui 150 horas planejadas, distribuídas igualmente entre os seis integrantes. Desse total, 144 horas correspondem às atividades dos PBIs principais e 6 horas à reunião de acompanhamento.

Essa distribuição representa as estimativas iniciais da Sprint, não as horas efetivamente trabalhadas.



## Dependências principais

As principais dependências entre as tarefas da Sprint 2 são:

- **Critérios e visitas:** T45 e T46 dependem das funcionalidades de backend implementadas nas T39 e T40.
- **Estados do estudo:** T47 depende das regras de estados e transições definidas nas T34 e T35.
- **Recrutamento e elegibilidade:** T50 e T51 dependem das funcionalidades de cadastro de candidatos e avaliação de elegibilidade das T41 e T42.
- **Consentimento e inclusão:** T52 depende da implementação do backend na T36. A T60 verifica as regras de consentimento, elegibilidade e limite de participantes.
- **Integração e qualidade:** T37, T61, T62 e T63 envolvem a integração e validação dos fluxos da Release 1, dependendo da disponibilidade das funcionalidades desenvolvidas.
- **Documentação e entrega:** T38, T49, T54, T57, T58, T59, T64 e T65 reúnem documentação, resultados de testes e evidências para o fechamento da Release 1.
- **Acompanhamento:** T44 é responsável pela organização e acompanhamento da Sprint 2 no Azure DevOps, incluindo tarefas, capacidade e burndown.

Essas dependências orientam a ordem das atividades e ajudam a identificar possíveis impedimentos durante a Sprint.


## Critérios de conclusão

Uma tarefa será considerada concluída quando atender aos seguintes critérios:

- Os critérios de aceite e as regras de negócio foram atendidos.
- O código foi revisado por outro integrante e integrado à branch principal.
- Os testes automatizados relacionados à funcionalidade foram executados.
- As validações e situações de erro foram verificadas.
- Os dados foram persistidos corretamente, quando necessário.
- O pipeline do GitHub Actions foi aprovado.
- Não foram identificadas regressões conhecidas nas funcionalidades anteriores.
- A documentação e as evidências foram atualizadas, quando aplicável.
- A cobertura dos testes do backend foi verificada, respeitando o mínimo de 80% estabelecido para a Release 1.

A conclusão das tarefas deve ser registrada no Azure DevOps, mantendo o acompanhamento da Sprint atualizado.



## Demonstração prevista para a Review

Entrar no sistema como pesquisador; cadastrar critérios de inclusão e exclusão, visitas previstas e suas atividades; demonstrar as mudanças de estado do estudo. Entrar como coordenador, cadastrar candidatos, avaliar a elegibilidade, registrar o consentimento simulado e incluir participantes, mostrando também as validações e os bloqueios de operações inválidas. Apresentar a integração web com o backend, a aplicação mobile, os testes automatizados, a cobertura, o Swagger UI, o pipeline do GitHub Actions, o burndown e a documentação da Release 1.

Os resultados da Sprint e o gráfico de acompanhamento estão disponíveis na [Review da Sprint 2](review.md).
