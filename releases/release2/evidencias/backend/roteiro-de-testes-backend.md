# Roteiro de testes backend Release 2

Este roteiro descreve a execução dos testes do backend da Release 2 e a organização das evidências. Os resultados Spring e Swagger estão na [tabela de testes](../tabela-de-testes.md); o [relatório do Postman](postman/relatorio-execucao.md) registra somente execuções dessa ferramenta.

## 1. Regra por requisito

Para cada requisito com teste executado, registre:

- a captura da execução dos testes Spring;
- as capturas e o roteiro Swagger dos cenários executados;
- as capturas do Runner e o relatório Postman, quando a coleção cobrir o requisito.

## 2. Requisitos, responsáveis e cenários

| Requisito | Responsável (Spring e Swagger) | Evidência de sucesso | Evidência de erro |
|---|---|---|---|
| RF12: agendamento e reagendamento | Luiz | Agendamento e reagendamento | Agendamento duplicado ou data inválida |
| RF13: registrar e corrigir visitas | Luiz | Registrar realizada, ausente e cancelada | Repetir registro de visita finalizada ou corrigir para a mesma situação |
| RF14: resultados fictícios das atividades | Luiz | Registrar, editar e consultar resultados | Tentar cadastrar resultado duplicado |
| RF15: histórico completo de visitas | Luiz | Consultar histórico completo | Acesso negado a participante (403) |
| RF16: retirada do participante | Georis | Retirar participante e cancelar visitas pendentes | Tentar retirar novamente a participação |
| RF17: consultar estudos do participante | Georis | Participante consultar seus estudos | Consultar sem sessão autenticada |
| RF18: próximas visitas e histórico | Georis | Consultar próximas visitas e histórico (resposta vazia no print) | Consultar estudo sem vínculo com o participante |

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
│   └── rf18-testes-spring.png
├── swagger/
│   └── rf12/ ... rf18/                     (prints 01-rfXX-descricao.png e roteiro.md)
└── postman/
    ├── rf12/ ... rf18/     (prints 01-rfXX-descricao.png)
    ├── runner/             (prints da execução completa)
    └── relatorio-execucao.md     
```

## 4. Preparar o ambiente

Na raiz do repositório:

```text
docker compose up -d db
docker compose ps
```

O PostgreSQL precisa aparecer como `healthy`. Em outro terminal, na pasta `backend`, defina `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` e execute `./mvnw spring-boot:run` (no PowerShell, `.\mvnw.cmd spring-boot:run`). Aguarde a mensagem de inicialização. Swagger em `http://localhost:8080/swagger-ui.html`.

**Dados de teste:** os roteiros RF12 a RF15 usam um estudo, uma participação e visitas preparados anteriormente por SQL. O script de preparação não foi encontrado entre as evidências da Release 2. Para reproduzir os exemplos, preparar registros equivalentes e atualizar os IDs conforme o banco utilizado.

## 5. Testes Spring (por requisito)

No PowerShell, coloque o argumento `-Dtest` entre aspas. A captura deve mostrar as classes, os testes terminados, a ausência de falhas e `BUILD SUCCESS`. Os arquivos desta release estão em `releases/release2/evidencias/backend/spring/`.

| Requisito | Classes de teste | Arquivo do print |
|---|---|---|
| RF12 e RF13 | `VisitaAgendadaControllerTest`, `VisitaAgendadaServiceTest` | `rf12-testes-spring.png`, `rf13-testes-spring.png` |
| RF14 | `ResultadoAtividadeControllerTest`, `ResultadoAtividadeServiceTest` | `rf14-testes-spring.png` |
| RF15 | `HistoricoParticipacaoControllerTest`, `HistoricoParticipacaoServiceTest` | `rf15-testes-spring.png` |
| RF16 | `RetiradaParticipanteControllerTest`, `RetiradaParticipanteServiceTest` | `rf16-testes-spring.png` |
| RF17 e RF18 | `ParticipanteConsultaControllerTest`, `ParticipanteConsultaServiceTest` | `rf17-testes-spring.png`, `rf18-testes-spring.png` |

Exemplo: `./mvnw "-Dtest=VisitaAgendadaControllerTest,VisitaAgendadaServiceTest" test`. A suíte completa, com os testes de banco, usa `./mvnw -B verify "-Dtest=*Test,*IT"` e as variáveis `CLINICALSTUDYPB_TEST_DB_*` do banco de testes.

**Execuções sem captura correspondente:** as classes `ParticipacaoConsultaControllerTest`, `DocumentacaoApiTest`, `AcompanhamentoPersistenciaIT` e `ResultadoAtividadePersistenciaIT` aparecem na tabelona, mas não nos prints Spring anexados. Por isso, seus 24 casos estão identificados como **Não comprovado** até haver evidência de execução. Um comando listado neste roteiro não substitui a captura nem comprova que a classe foi executada.

## 6. Swagger

Nos prints, registre a requisição executada e sua resposta, com endpoint, status HTTP e JSON; a seção "Example Value" sozinha não comprova o teste. Quando necessário, autentique-se como coordenador ou participante pelo fluxo de CSRF e login descrito na documentação. Os dados são fictícios. Cada cenário registrado na tabela aponta para sua captura e para o roteiro correspondente em `swagger/rfXX/`.

Os roteiros Swagger estão em `swagger/rf12/roteiro.md` a `swagger/rf18/roteiro.md`. Os testes manuais cadastrados com capturas totalizam 24 cenários.

## 7. Postman

A coleção `docs/postman/ClinicalStudyPB.postman_collection.json` reúne as pastas **1 a 7 e 12** (Release 1) e as pastas **8 a 11** (**RF12 a RF18** e sessão do app), com 143 requisições e 211 testes.

| Item | Como fazer |
|---|---|
| Coleção | Manter atualizadas em `docs/postman/ClinicalStudyPB.postman_collection.json` as pastas da Release 2 (pastas **8 a 11**, cobrindo agendamento, situação/correção, resultados, histórico, retirada e consultas do participante) |
| Execução | Importar a coleção e o ambiente `Local` (`docs/postman/Local.postman_environment.json`); cada pasta faz o login do perfil de que precisa e a coleção não depende de IDs fixos. |
| Prints por requisito | Runner mostrando a pasta do requisito, em `postman/rfXX/`, com o nome `01-rfXX-descricao.png` |
| Execução completa | Print do Runner com a execução em `postman/runner/` |
| Relatório | `postman/relatorio-execucao.md`, tomando como referência o formato da Release 1 ([relatório da Release 1](../../../release1/evidencias/backend/postman/relatorio-execucao.md)) e registrando as condições reais de execução da Release 2 |

Rotas cobertas:

| Requisito | Rotas |
|---|---|
| RF12 | `POST /estudos/{estudoId}/participacoes/{participacaoId}/visitas` e `PUT /estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}` |
| RF13 | `PATCH .../visitas/{visitaAgendadaId}/situacao` e `POST .../visitas/{visitaAgendadaId}/correcoes` |
| RF14 | `GET` e `POST .../visitas/{visitaAgendadaId}/resultados`; `PUT .../visitas/{visitaAgendadaId}/resultados/{resultadoId}` |
| RF15 | `GET /estudos/{estudoId}/participacoes/{participacaoId}/historico` |
| RF16 | `POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada` |
| RF17 e RF18 | `GET /participante/estudos`, `/participante/visitas/proximas` e `/participante/visitas/historico` |

## 8. Cobertura (JaCoCo)

A execução completa da suíte do backend (`./mvnw -B verify` após `./mvnw -B test "-Dtest=*IT"`) totalizou **586 testes executados sem falhas** (`0` erros, `0` falhas).

- **Cobertura total de linhas:** **97,7%** (`1891` de `1936` linhas cobertas).
- **Cobertura dos pacotes de negócio (`.service`, meta mínima de 80%):** **98,1%** (`1010` de `1030` linhas cobertas) - com `estudos.service` em **97%** de instruções, `recrutamento.service` em **95%** e `usuarios.service` em **97%**.

Evidência: [cobertura-jacoco.png](jacoco/cobertura-jacoco.png)
