# Decisões e versões do projeto
 

## Origem das escolhas

O projeto exige aplicações web e mobile, uma API REST compartilhada, banco de dados,
controle de acesso por perfil, documentação OpenAPI/Swagger, testes e acompanhamento
no Azure DevOps. As regras específicas abaixo detalham esse escopo; não devem ser
apresentadas como se todos os seus detalhes estivessem expressos no enunciado.

| Decisão registrada no Kickoff | Consequência e situação no código |
|---|---|
| Backend Java/Spring Boot em uma aplicação, organizado por módulos | Sem microsserviços. A base e a autenticação já existem; os demais módulos evoluem nas suas tasks |
| Web React e app React Native usam a API; somente o backend acessa PostgreSQL | As interfaces enviam e recebem JSON; controllers usam DTOs, serviços aplicam regras e repositories acessam o banco |
| D01: administrador cria, lista, edita, desativa e reativa usuários; e-mail único, sem exclusão física | Entidade, restrições, endpoints de gestão e bloqueio de conta inativa implementados; contrato publicado no OpenAPI |
| D02: responsável pelo estudo é o pesquisador autenticado | O futuro cadastro deverá obter o ID da sessão; não aceitar escolha livre do responsável no formulário |
| D03: estudo e protocolo são separados; protocolo antecede o recrutamento | Modelagem inicial de estudo existe; protocolo e transições ainda dependem das próximas funcionalidades |
| D04: pesquisador vê seus estudos; coordenador vê os estudos em que foi vinculado; participante vê seus vínculos | A autorização por perfil já está preparada. A filtragem por vínculo será implementada nos serviços e consultas correspondentes |
| D04 e detalhamento: pesquisador responsável atribui o coordenador; um por estudo e vários estudos por coordenador | Vínculo opcional no cadastro, obrigatório antes do recrutamento. Essa associação ainda não existe no modelo atual |
| D05: Spring Security, sessão no servidor, 30 minutos sem uso, logout e BCrypt | Implementado com cookie HttpOnly, CSRF e CORS; fluxo local de autenticação e usuários conferido com PostgreSQL 17.11 em 23/10/2026 |
| D06: execução local, banco com Docker Compose, sem hospedagem paga | Compose disponível; não implica que o banco esteja instalado ou validado em toda máquina |
| D07: versões de referência fixadas no Kickoff | Conferir manifests e locks antes de integrar mudanças de dependências |
| D08: detalhar campos e respostas do cadastro | Autenticação e usuários já têm campos, respostas e permissões documentados. Estudos aguardam implementação |
| D09: coordenador registra avaliação, consentimento e inclusão; API verifica elegibilidade, aceite e vagas | Previsto para recrutamento; não entregue por esta task |
| D10: coordenador registra visitas, avaliações e retirada e responde às solicitações do app | Previsto para acompanhamento; confirmação de presença não comprova comparecimento |
| D11: relatório filtrado por estudo e exportado em PDF | Sem decisão de CSV nesta versão; implementação futura |
| D12: registrar alterações e permitir consulta pelo administrador, sem editar/apagar o log pela interface | Auditoria permanece no backlog; não foi adicionada à task de autenticação ou à publicação OpenAPI |
| D13: configurações por arquivos/variáveis; ações do participante limitadas aos fluxos previstos | Não adicionar questionários clínicos nem funcionalidades que não foram combinadas |

## Detalhes técnicos concretizados no backend

Estes detalhes implementam as decisões acima e permanecem sujeitos à revisão do PR:

- `Controller → Service → Repository → PostgreSQL`: o controller trata HTTP e DTOs;
  o serviço concentra regras; o repository usa JPA. Flyway aplica migrações, enquanto
  Hibernate valida a estrutura com `ddl-auto=validate`.
- JSON é o formato transmitido pela rede. DTO é a estrutura Java que representa
  esses dados dentro do backend. Entidades JPA não são o contrato público da API.
- Entidades existentes permanecem diretamente em `usuarios` e `estudos`, conforme
  o alinhamento da equipe; não é necessário movê-las para um subpacote `dominio`.
- Endpoints de autenticação usam `/auth`, sem prefixo `/api`. O cookie é
  `JSESSIONID`; o token vem de `GET /auth/csrf` e vai no cabeçalho `X-CSRF-TOKEN`.
- A origem web local padrão é `http://localhost:5173`; o backend usa
  `http://localhost:8080`. Execução compartilhada deve usar HTTPS e cookie Secure.
- O OpenAPI é servido pelo backend, com consulta pública por GET à documentação.
  Isso permite ler o contrato antes do login. Os endpoints de negócio conservam
  suas próprias permissões e proteção CSRF.
- A gestão de usuários usa `/usuarios`, sem prefixo `/api`. POST cadastra; GET lista;
  PUT edita nome, e-mail e perfil; PATCH desativa ou reativa. Todas exigem administrador
  e as alterações exigem CSRF. Os DTOs de resposta não expõem senha ou hash.
- O código de gestão protege o último administrador ativo, rejeita senhas acima de
  72 bytes em UTF-8 e limita nome/e-mail a 255 caracteres. E-mail duplicado retorna
  409. São detalhes da implementação revisada, não novos requisitos atribuídos à professora.
- As rotas de estudos serão documentadas quando implementadas. Preparar permissões
  não cria essas funcionalidades.

As escolhas da publicação OpenAPI nesta task não alteram o Kickoff, não ampliam o
escopo funcional e não resolvem, sozinhas, as pendências de integração da task 3171.

## Versões acordadas

Esta tabela reproduz a seção 2.1 do Kickoff. Ela indica o alvo aprovado, e não uma
certificação de que todos os computadores ou branches já usam o mesmo conjunto.

| Tecnologia | Versão acordada | Onde conferir |
|---|---|---|
| Java | Temurin JDK **21.0.12.1+1**, linha Java 21 | `java -version`, `javac -version` e SDK da IDE |
| Spring Boot | **4.1.1** | Parent do `backend/pom.xml` |
| Maven | **3.9.16** | Wrapper em `backend/.mvn/wrapper/maven-wrapper.properties` |
| OpenAPI e Swagger UI | **springdoc 3.1.1** | Propriedade `springdoc.version` no POM; inclui o starter `springdoc-openapi-starter-webmvc-ui` |
| Node.js | **24.22.0 LTS** | `node --version`, ambiente web/mobile e CI |
| React / React DOM | **19.2.3** | Manifest e lock da web; React DOM é usado na web |
| TypeScript | **6.0.3** | Manifests e locks das interfaces |
| Vite | **8.3.5** | Manifest e lock da web |
| Expo | **57.0.30 — SDK 57** | Manifest e lock do mobile |
| React Native | **0.86.3** | Manifest e lock do mobile |
| PostgreSQL | **17.11** | Imagem `postgres:17.11` no Compose |

O ambiente local de Georis utiliza Microsoft OpenJDK 21.0.12.1. Isso foi registrado
como diferença de distribuição em relação ao Temurin de referência; não foi feita
troca de JDK nesta task. O POM compila para Java 21.

Spring Security, Hibernate, Flyway, driver PostgreSQL e bibliotecas de teste recebem
versões do gerenciamento de dependências do Spring Boot. Não foi fixada uma versão
independente para cada uma no Kickoff. Para inspecionar as versões resolvidas:

```bash
cd backend
./mvnw dependency:tree
```

OpenAPI é a especificação e Swagger UI é a interface. **3.1.1**, na tabela, é a
versão da biblioteca **springdoc**, não a versão do projeto nem necessariamente
o número que aparece no campo `openapi` do JSON.

A revisão de 23/10 encontrou dependências diferentes na branch mobile
(Expo 58 / React Native 0.88 / React 19.3). Essa divergência segue pendente de
alinhamento; ela não muda automaticamente a stack aprovada. A conferência de
integração deve ser repetida quando essas branches forem atualizadas.

## Versão do nosso projeto

Usamos **dois números: release.evolução**. A primeira entrega da release 1 usa `1.0`.
Uma nova entrega funcional dentro da mesma release pode passar a `1.1`; o início
da release 2 passa a `2.0`. Não se incrementa a versão a cada comentário, commit ou task.

| Local | Valor atual | Significado |
|---|---|---|
| POM | `1.0-SNAPSHOT` | Aplicação da release 1, evolução 0, ainda em desenvolvimento |
| OpenAPI, campo `info.version` | `1.0` | Versão do contrato da nossa API |
| Javadoc, tag `@version` | `1.0` | Versão documentada das classes, conforme a convenção da equipe |

`SNAPSHOT` é um sufixo do Maven. A troca para uma entrega estável deve acompanhar a
preparação da release; não foi removido agora. Nos Javadocs, conservar o autor e a
data de criação de cada classe. Classes novas de Georis nesta task usam
`@author Georis`, `@version 1.0` e `@since 23/10/2026`.


