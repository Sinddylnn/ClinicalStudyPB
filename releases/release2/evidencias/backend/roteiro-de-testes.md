# Roteiro de testes — Release 2

Este roteiro define como os testes do backend da Release 2 são executados e como as evidências são organizadas. Os resultados vão no [relatório de testes](postman/relatorio-execucao.md) e a lista de casos, na [tabela de testes](../tabela-de-testes.md).

## 1. Regra por requisito

Para **cada requisito**:

- pelo menos 1 print de sucesso (Swagger);
- pelo menos 1 print de erro (Swagger);
- print dos testes Spring executando;
- roteiro correspondente (`roteiro.md` na pasta do requisito);
- prints do Runner do Postman e relatório de execução.

## 2. Requisitos, responsáveis e cenários

| Requisito | Responsável (Spring e Swagger) | Evidência de sucesso | Evidência de erro |
|---|---|---|---|
| RF12: agendamento e reagendamento | Luiz | Agendamento e reagendamento | Agendamento duplicado ou data inválida |
| RF13: registrar e corrigir visitas | Luiz | Registrar realizada, ausente e cancelada | Registrar visita futura ou corrigir visita com resultados |
| RF14: resultados fictícios das atividades | Luiz | Registrar resultados fictícios | Resultado em visita não realizada ou atividade incorreta |
| RF15: histórico completo de visitas | Luiz | Consultar histórico completo | Acesso por coordenador não vinculado ou perfil sem permissão |
| RF16: retirada do participante | Georis | Retirar participante e cancelar visitas pendentes | Motivo inválido ou tentativa de retirar novamente |
| RF17: consultar estudos do participante | Georis | Participante consultar seus estudos | Acesso com perfil incorreto ou tentativa de consultar dados alheios |
| RF18: próximas visitas e histórico | Georis | Consultar próximas visitas e histórico | Consultar estudo sem vínculo com o participante |

Os testes do Postman são de responsabilidade da Gabriela.

## 3. Estrutura das evidências

```text
releases/release2/evidencias/backend/
├── spring/
│   ├── rf12-testes-spring.png
│   ├── rf13-testes-spring.png
│   ├── rf14-testes-spring.png
│   ├── rf15-testes-spring.png
│   ├── rf16-testes-spring.png
│   ├── rf17-testes-spring.png
│   ├── rf18-testes-spring.png
│   └── testes-spring-suite-completa.png   (final da release)
├── jacoco/                                 (final da release)
├── swagger/
│   └── rf12/ ... rf18/                     (prints 01-rfXX-descricao.png e roteiro.md)
└── postman/
    ├── rf12/ ... rf18/                     (prints do Runner por requisito)
    ├── runner/                             (execução completa da coleção)
    └── relatorio-execucao.md
```

## 4. Preparar o ambiente

Na raiz do repositório:

```text
docker compose up -d db
docker compose ps
```

O PostgreSQL precisa aparecer como `healthy`. Em outro terminal, na pasta `backend`, defina `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` e execute `./mvnw spring-boot:run` (no PowerShell, `.\mvnw.cmd spring-boot:run`). Aguarde a mensagem de inicialização. Swagger em `http://localhost:8080/swagger-ui.html`.

## 5. Testes Spring (por requisito)

No PowerShell, coloque o argumento `-Dtest` entre aspas. O print precisa mostrar as classes, os testes terminados, a ausência de falhas e `BUILD SUCCESS`, e é salvo em `evidencias/backend/spring/`.

| Requisito | Classes de teste | Arquivo do print |
|---|---|---|
| RF12 e RF13 | `VisitaAgendadaControllerTest`, `VisitaAgendadaServiceTest`, `ParticipacaoConsultaControllerTest` | `rf12-testes-spring.png`, `rf13-testes-spring.png` |
| RF14 | `ResultadoAtividadeControllerTest`, `ResultadoAtividadeServiceTest`, `ResultadoAtividadePersistenciaIT` | `rf14-testes-spring.png` |
| RF15 | `HistoricoParticipacaoControllerTest`, `HistoricoParticipacaoServiceTest` | `rf15-testes-spring.png` |
| RF16 | `RetiradaParticipanteControllerTest`, `RetiradaParticipanteServiceTest` | `rf16-testes-spring.png` |
| RF17 e RF18 | `ParticipanteConsultaControllerTest`, `ParticipanteConsultaServiceTest` | `rf17-testes-spring.png`, `rf18-testes-spring.png` |
| Suíte completa (fim da release) | todas | `testes-spring-suite-completa.png` |

Exemplo: `./mvnw "-Dtest=VisitaAgendadaControllerTest,VisitaAgendadaServiceTest" test`. A suíte completa, com os testes de banco, usa `./mvnw -B verify "-Dtest=*Test,*IT"` e as variáveis `CLINICALSTUDYPB_TEST_DB_*` do banco de testes.

## 6. Swagger

Nos prints, registre a requisição executada e sua resposta, com endpoint, status HTTP e JSON; a seção "Example Value" sozinha não comprova o teste. Entre como coordenador (`GET /auth/csrf`, depois `POST /auth/login` com o cabeçalho `X-CSRF-TOKEN`, e busque um novo token com `GET /auth/csrf`). Os dados são fictícios. Em cada pasta `swagger/rfXX/`, crie um `roteiro.md` com objetivo, pré-requisitos, dados de teste, cenário de sucesso, cenário de erro (cada um com resultado esperado, obtido e evidência), testes automatizados e observações.

## 7. Postman

Mantém a estrutura de `releases/release1/evidencias/backend/postman/`, dividida por requisito.

| Item | Como fazer |
|---|---|
| Coleção | Pastas novas em `docs/postman/ClinicalStudyPB.postman_collection.json`, uma para cada grupo de requisitos (agendamento, histórico e retirada, participante) |
| Execução | Importar a coleção e o ambiente `Local`, executar no Runner (Iterations 1, Delay 0), resultado sem falhas |
| Prints por requisito | Runner mostrando só a pasta do requisito, em `postman/rfXX/`, com o nome `01-rfXX-descricao.png` |
| Execução completa | Print do Runner com a coleção inteira em `postman/runner/` |
| Relatório | `postman/relatorio-execucao.md`, no [modelo da Release 1](../../../release1/evidencias/backend/postman/relatorio-execucao.md) |

Rotas cobertas:

| Requisito | Rotas |
|---|---|
| RF12 | `POST` e `PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas` |
| RF13 | `PATCH .../visitas/{visitaAgendadaId}/situacao` e `POST .../visitas/{visitaAgendadaId}/correcoes` |
| RF14 | `GET`, `POST` e `PUT .../visitas/{visitaAgendadaId}/resultados` |
| RF15 | `GET /estudos/{estudoId}/participacoes/{participacaoId}/historico` |
| RF16 | `POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada` |
| RF17 e RF18 | `GET /participante/estudos`, `/participante/visitas/proximas` e `/participante/visitas/historico` |

## 8. Cobertura (JaCoCo)

No fim da release, com a suíte completa: abrir `backend/target/site/jacoco/index.html`, salvar o print em `evidencias/backend/jacoco/` e registrar os percentuais no relatório de testes. A regra de 80% vale para as classes `service`.
