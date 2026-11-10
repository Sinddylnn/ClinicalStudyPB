# ClinicalStudyPB

![capa.png](assets/capa.png)

>Projeto acadêmico desenvolvido na disciplina de Engenharia de Software II da UEPB, no período 2026.2.

O ClinicalStudyPB é um sistema de gestão de estudos clínicos com dados fictícios. A proposta reúne uma aplicação web para a equipe responsável pelos estudos, um aplicativo para os participantes e uma API compartilhada entre essas interfaces.

## Sobre o sistema

O sistema permite gerenciar usuários, cadastrar estudos, organizar o recrutamento e acompanhar participantes e visitas. A aplicação web concentra as atividades administrativas e de pesquisa, enquanto o aplicativo permite ao participante consultar informações sobre sua participação e realizar as ações previstas para seu perfil.

O desenvolvimento será dividido em três releases e seis sprints. As funcionalidades serão entregues gradualmente, seguindo os requisitos da disciplina e o planejamento registrado no Azure DevOps.

Como se trata de um projeto acadêmico, serão utilizados dados fictícios. O sistema não realiza diagnósticos nem decisões clínicas automatizadas.

---

## Arquitetura


<div align="center">
  <img src="assets/fluxo_geral.png" alt="visão geral proposta" width="70%">
</div>

A aplicação web e o aplicativo se comunicam com o mesmo backend por meio de uma API REST. O backend concentra as regras de negócio, o controle de acesso e a comunicação com o banco de dados.


<p align="center">
  <img src="docs/diagramas/01_visao_geral.png" alt="Visão geral do sistema" width="60%">
</p>

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/diagramas/06_componentes_uml.png" alt="Componentes" width="100%"><br>
      <sub>Componentes</sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/diagramas/07_camadas_backend.png" alt="Camadas do backend" width="100%"><br>
      <sub>Camadas do backend</sub>
    </td>
  </tr>
</table>

<br>

As interfaces não acessam diretamente o banco. Dessa forma, as regras e os dados permanecem centralizados, mesmo quando são utilizados em telas diferentes.


### Casos de uso

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/diagramas/02_casos_acesso_estudos.png" alt="Casos de uso: acesso e estudos" width="100%"><br>
      <sub>Acesso e estudos</sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/diagramas/03_casos_recrutamento.png" alt="Casos de uso: recrutamento" width="100%"><br>
      <sub>Recrutamento</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="docs/diagramas/04_casos_acompanhamento.png" alt="Casos de uso: acompanhamento" width="100%"><br>
      <sub>Acompanhamento</sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/diagramas/05_casos_participante.png" alt="Casos de uso: participante" width="100%"><br>
      <sub>Participante</sub>
    </td>
  </tr>
</table>

<br>

### Modelos de domínio

<p align="center">
  <img src="docs/diagramas/09_modelo_dominio_estudos.png" alt="Modelo de domínio: estudos e protocolos" width="60%">
</p>

<p align="center">
  <img src="docs/diagramas/11_modelo_dominio_recrutamento.png" alt="Modelo de domínio: recrutamento e inclusão" width="60%"><br>
</p>

<br>

### Sequência do cadastro

<p align="center">
  <img src="docs/diagramas/08_sequencia_cadastro.png" alt="Sequência do cadastro" width="70%">
</p>

<br>

### Arquitetura

<p align="center">
  <img src="docs/diagramas/01_visao_geral.png" alt="Visão geral do sistema" width="60%">
</p>

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/diagramas/06_componentes_uml.png" alt="Componentes" width="100%"><br>
      <sub>Componentes</sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/diagramas/07_camadas_backend.png" alt="Camadas do backend" width="100%"><br>
      <sub>Camadas do backend</sub>
    </td>
  </tr>
</table>

<br>

### Estados do estudo

<p align="center">
  <img src="docs/diagramas/10_estados_estudos.png" alt="Estados do estudo" width="80%">
</p>




---
## Stack Tecnológio
| Componente | Tecnologias definidas |
|---|---|
| Backend | Java 21, Spring Boot e Maven Wrapper |
| Aplicação web | React, TypeScript e Vite |
| Aplicativo mobile | React Native, TypeScript e Expo |
| Banco de dados | PostgreSQL, com migrações Flyway |
| Documentação da API | OpenAPI e Swagger UI |
| Ambiente local | Docker e Docker Compose |
| Integração contínua | GitHub Actions |
| Planejamento e acompanhamento | Azure DevOps |

A arquitetura e o stack definidos no documento de Kickoff estão configurados no repositório. O estado funcional de cada componente varia por release: consulte a documentação da entrega para distinguir módulos implementados, interfaces prototipadas e integrações ainda pendentes

---

## Organização do repositório

```text
backend/               API Java + Spring Boot ⟶ Georis e Luiz
web/                   Interface React ⟶ Suelle e Sinddy
mobile/                Aplicativo React Native + Expo ⟶ Horlan
docs/                  Decisões, orientações e guias técnicos (autenticação, OpenAPI, Docker, modelagem, Postman)
releases/              Documentação e evidências de cada release
  release1/            Documentação e evidências da primeira release
    diagramas/         Diagramas editáveis (.drawio) e imagens
    evidencias/        Capturas e relatórios (web, mobile, backend)
    sprints/           Planning, review e burndown de cada sprint
  release2/            Evidências da segunda release
  release3/            Evidências da terceira release
```

Gabriela apoia os testes integrados e prepara o ambiente com Docker Compose e a automação com GitHub Actions. Cada integrante também é responsável por testar e documentar o que implementa.

As pastas ainda sem implementação contêm apenas `.gitkeep`, um marcador vazio que permite registrá-las no Git. Sua existência organiza o trabalho, mas não significa que o componente esteja concluído.

---

## Executar o projeto


### Caminho recomendado: Docker Compose 🐳

Para executar banco, backend e web, abra um terminal na raiz do repositório, com o Docker em execução, e rode:

```bash
docker compose --profile web up -d --build --wait
```

Acesse a web em <http://localhost:5173> e a documentação Swagger em <http://localhost:8080/swagger-ui.html>. O Compose fornece as variáveis de ambiente; não é necessário instalar Java, Maven ou Node localmente para executar esses três componentes.

Para executar somente o banco e o backend:

```bash
docker compose up -d --build --wait
```

O Expo é executado separadamente, dentro da pasta `mobile/`. As instruções completas para Docker, contas fictícias, logs, atualização de imagens e encerramento estão no [guia de execução com Docker](docs/execucao-docker.md).

A configuração do Compose define `VITE_ESTUDOS_API=real` para a web. Os serviços de protocolo e recrutamento têm seletores próprios e podem permanecer simulados. A configuração Docker é voltada a desenvolvimento local e demonstração, não a hospedagem de produção.

> As subseções seguintes descrevem como executar cada componente fora do Docker. No Linux, acrescente `sudo` aos comandos Docker se sua instalação exigir isso.

### Preparar o banco

Para executar o backend fora do Docker, inicie primeiro o banco PostgreSQL. Na raiz do repositório:

```bash
docker compose up -d --wait db
docker compose ps
```

O serviço está pronto quando aparece como `healthy`. As credenciais padrão são `clinicalstudypb` e `clinicalstudypb_dev`; a configuração completa está no arquivo `.env.example`. Para personalizar, copie esse arquivo para `.env` somente se ainda não existir e ajuste os valores antes da criação inicial do banco.

O Spring Boot não carrega `.env` automaticamente. Ao iniciar o backend fora do Docker, configure as variáveis de conexão no terminal ou na IDE. Mais detalhes estão na seção [Banco de dados](#banco-de-dados-postgresql-com-docker-compose) e no [guia de execução com Docker](docs/execucao-docker.md).

### Backend

Requisitos: JDK 21 completo, com `java` e `javac`, e PostgreSQL disponível. O Maven Wrapper utiliza Maven 3.9.16 e pode baixar o Maven e as dependências na primeira execução, portanto esse primeiro uso requer acesso à internet.

Configure `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` no terminal ou na IDE. O arquivo `.env.example` serve como referência, mas não é carregado automaticamente pelo Spring Boot.

#### Linux/macOS 🐧🍎

A partir da raiz do repositório:

```bash
cd backend
java -version
javac -version
./mvnw --version
./mvnw spring-boot:run
```

Se necessário, configure `JAVA_HOME` e `PATH` para apontar para o JDK 21. Ter somente o executável `java` não garante que o compilador `javac` esteja instalado.

#### Windows 🪟

Com `JAVA_HOME` apontando para o JDK 21:

```powershell
cd backend
java -version
javac -version
.\mvnw.cmd --version
.\mvnw.cmd spring-boot:run
```

O backend utiliza `http://localhost:8080`. A mensagem `Started ClinicalStudyPbApplication` confirma a inicialização. Para encerrar, pressione `Ctrl+C` no terminal.

#### Conferir a proteção de acesso

Com o servidor ligado, execute em outro terminal:

```bash
curl -i -H 'Accept: application/json' http://localhost:8080/auth/sessao
```

No PowerShell, use `curl.exe`. Sem login, a resposta esperada é HTTP 401, com conteúdo semelhante a:

```json
{
  "codigo": "AUTENTICACAO_NECESSARIA",
  "mensagem": "Entre no sistema para realizar esta operação."
}
```

Esse exemplo verifica que o servidor responde e exige autenticação. O fluxo de login, CSRF, consulta da sessão e logout está no [guia de autenticação](docs/autenticacao.md).

#### Consultar a documentação da API

Com o backend ligado, acesse [Swagger UI](http://localhost:8080/swagger-ui.html). O contrato OpenAPI também está disponível em [JSON](http://localhost:8080/v3/api-docs) e [YAML](http://localhost:8080/v3/api-docs.yaml).

A documentação inclui as operações publicadas pelo backend, como autenticação, usuários, estudos, critérios, visitas previstas, recrutamento, elegibilidade, consentimento e inclusão. A existência de uma rota na API não significa que todas as telas da web já estejam integradas a ela. Consulte os guias de [OpenAPI](docs/openapi.md), [configuração do protocolo](docs/configuracao-protocolo.md), [estados do estudo](docs/estados-estudo.md), [recrutamento e elegibilidade](docs/recrutamento-e-elegibilidade.md) e [consentimento e inclusão](docs/consentimento-inclusao.md).

### Aplicação mobile

O aplicativo mobile é um protótipo para o participante, desenvolvido com React Native, TypeScript e Expo Router. Ainda não consome a API; executar o Expo permite verificar a navegação e as telas disponíveis, não realizar o fluxo completo de participação.

#### Versões

| Ferramenta | Versão declarada |
|---|---|
| Node.js | 24.22.0 |
| npm | 11.6.2 |
| React Native | 0.88.0 |
| React | 19.3.0 |
| TypeScript | 6.0.3 |
| Expo | 58.0.17 |
| Expo Router | 58.0.25 |
| Jest | 30.5.2 |
| Jest Expo | 58.0.12 |
| React Native Testing Library | 14.1.0 |

Use a versão de Node compatível com o projeto. A versão da aplicação web está registrada em `web/.nvmrc`; mantenha a versão do mobile alinhada com essa versão ao preparar o ambiente local.

#### Pré-requisitos

- Node.js e npm instalados.
- Git para clonar o repositório.
- Android Studio com pelo menos um emulador Android (AVD) criado, ou Expo Go instalado em um celular.

#### Executar no Android

A partir da raiz do repositório:

```bash
cd mobile
npm ci
```

Abra o Android Studio, inicie um emulador pelo Device Manager e aguarde a tela inicial do Android. Para conferir se o emulador foi reconhecido:

```bash
adb devices
```

O emulador deve aparecer com o estado `device`. Em seguida, inicie o Expo:

```bash
npx expo start --android
```

Se o emulador não abrir o app automaticamente, pressione `a` no terminal com o Expo em execução. As telas atualmente disponíveis incluem Início, Estudos, Visitas e Perfil; algumas exibem conteúdo de protótipo, como o cartão “Disponível na Sprint 3”.

#### Executar em um celular físico

Instale o Expo Go, conecte o celular e o computador à mesma rede Wi-Fi e execute, dentro de `mobile/`:

```bash
npx expo start
```

Leia o QR code pelo Expo Go. O túnel do Expo disponibiliza o servidor de desenvolvimento do aplicativo, não o backend Spring Boot. Quando a integração mobile com a API for implementada, o endereço será `http://10.0.2.2:8080` no emulador padrão do Android Studio ou o IP local do computador no celular físico.

---

## Testes automatizados

Os testes de cada módulo devem ser executados na pasta correspondente. Os comandos e resultados são apresentados separadamente para evitar confundir a suíte mobile com os testes da web e do backend.

### Backend

Na pasta `backend/`, com JDK 21:

```bash
./mvnw -B verify
```

Esse comando compila o backend, executa os testes padrão e valida a cobertura configurada. O mínimo de 80% aplica-se às linhas dos pacotes de serviços (`*.service`). Os testes de persistência `*IT` não são incluídos automaticamente no comando padrão.

Para executar também os testes de integração com PostgreSQL, inicie primeiro o banco exclusivo de testes:

```bash
docker compose --profile test up -d --wait db-test
```

Configure as variáveis no mesmo terminal:

```bash
export CLINICALSTUDYPB_TEST_DB_URL=jdbc:postgresql://localhost:5433/clinicalstudypb_test
export CLINICALSTUDYPB_TEST_DB_USER=clinicalstudypb
export CLINICALSTUDYPB_TEST_DB_PASSWORD=clinicalstudypb_dev
```

Depois, dentro de `backend/`, execute:

```bash
./mvnw -B clean '-Dtest=*Test,*IT' verify
```

No PowerShell, configure as mesmas variáveis com `$env:NOME_DA_VARIAVEL="valor"` e execute `.mvnw.cmd -B clean "-Dtest=*Test,*IT" verify` dentro de `backend/`. O banco de testes é descartável e não deve ser substituído pelo banco de desenvolvimento.

Ao terminar, pare o banco de testes:

```bash
docker compose --profile test stop db-test
```

Os testes de integração leem `CLINICALSTUDYPB_TEST_DB_URL`, `CLINICALSTUDYPB_TEST_DB_USER` e `CLINICALSTUDYPB_TEST_DB_PASSWORD`. Os detalhes estão nos guias de [protocolo](docs/configuracao-protocolo.md), [recrutamento e elegibilidade](docs/recrutamento-e-elegibilidade.md) e [consentimento e inclusão](docs/consentimento-inclusao.md).

### Web

Na pasta `web/`:

```bash
npm ci
npm test
npm run lint
npm run build
npm run test:coverage
```

`npm test` executa os testes com Vitest. `npm run test:coverage` também gera o relatório de cobertura em `web/coverage/`.

### Mobile

Na pasta `mobile/`:

```bash
npm ci
npm test -- --ci
```

A quantidade de testes pode mudar ao longo do desenvolvimento. O número de testes de uma suíte não representa os testes dos outros módulos.

### Integração contínua

A GitHub Actions executa testes e cobertura do backend, incluindo testes de persistência com PostgreSQL, além de testes, cobertura e build da web. O job do aplicativo mobile ainda não está configurado no workflow de CI.

---

## Banco de dados (PostgreSQL com Docker Compose)

O banco local utiliza PostgreSQL 17.11, configurado em `docker-compose.yml`. É necessário ter Docker com Compose v2 instalado; no Windows e macOS, mantenha o Docker Desktop aberto e com o motor em execução.

### Iniciar o banco

A partir da raiz do repositório, se quiser personalizar as portas ou credenciais, copie `.env.example` para `.env` somente quando ainda não existir:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Sem arquivo `.env`, o Compose usa os valores padrão definidos no projeto. Para iniciar o banco:

```bash
docker compose up -d --wait db
docker compose ps
```

O estado deve aparecer como `healthy`. Os dados ficam no volume `clinicalstudypb-pgdata` e permanecem disponíveis após reiniciar o contêiner.

| Item | Valor padrão |
|---|---|
| Endereço publicado | `localhost:5432` |
| Banco | `clinicalstudypb` |
| Usuário | `clinicalstudypb` |
| Senha de desenvolvimento | `clinicalstudypb_dev` |

As credenciais são fictícias e destinadas somente ao ambiente local. Se o banco já foi inicializado, alterar a senha no `.env` não altera a senha armazenada no PostgreSQL. Continue usando a senha original ou altere-a de forma controlada no banco.

Para abrir um terminal SQL dentro do contêiner:

```bash
docker compose exec db psql -U clinicalstudypb -d clinicalstudypb
```

### Executar backend conectado ao banco

Fora do Docker, o Spring Boot não carrega `.env` automaticamente. Configure as variáveis no terminal antes de iniciar o backend. Exemplo em Linux/macOS:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clinicalstudypb
export SPRING_DATASOURCE_USERNAME=clinicalstudypb
export SPRING_DATASOURCE_PASSWORD='clinicalstudypb_dev'
cd backend
./mvnw spring-boot:run
```

No PowerShell:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/clinicalstudypb"
$env:SPRING_DATASOURCE_USERNAME="clinicalstudypb"
$env:SPRING_DATASOURCE_PASSWORD="clinicalstudypb_dev"
cd backend
.\mvnw.cmd spring-boot:run
```

O Flyway aplica as migrações ao iniciar a aplicação. Para conferir o histórico:

```bash
docker compose exec db psql -U clinicalstudypb -d clinicalstudypb -c "SELECT version, description, success FROM flyway_schema_history;"
```

### Banco de testes

Os testes de integração usam um banco PostgreSQL separado, descartável e armazenado em memória. Ele não deve ser usado para dados de desenvolvimento.

Na raiz do repositório:

```bash
docker compose --profile test up -d --wait db-test
```

Por padrão, fica disponível em `localhost:5433`, no banco `clinicalstudypb_test`, com usuário `clinicalstudypb` e senha `clinicalstudypb_dev`. Configure as variáveis `CLINICALSTUDYPB_TEST_DB_*` conforme descrito em [Testes automatizados](#testes-automatizados). Ao parar o contêiner, os dados em memória são descartados.

### Parar os serviços

Para parar banco, backend e web sem remover os dados:

```bash
docker compose --profile web stop
```

Para remover os contêineres e manter o volume do banco:

```bash
docker compose --profile web down
```

Não adicione `-v` se quiser preservar os dados. Remover o volume apaga o banco local.


### Problemas comuns

- **Erro ao conectar na API do Docker (`dockerDesktopLinuxEngine`):** o Docker Desktop não está em execução. Abra-o e aguarde o motor iniciar antes de repetir o comando.
- **Porta 5432 em uso:** já existe outro PostgreSQL na máquina. Defina `POSTGRES_PORT` no `.env` (por exemplo, `5434`). Ajuste `SPRING_DATASOURCE_URL` somente se executar Java fora do Docker; dentro dele, o banco permanece em `db:5432`.
- **Erro de autenticação depois de trocar a senha:** o PostgreSQL só lê a senha na criação do volume. Reutilize a senha definida na criação do banco ou altere-a de forma controlada no PostgreSQL; não apague o volume para resolver isso.
- **Backend não conecta:** confirme que `docker compose ps` mostra `healthy` e consulte os logs. Fora do Docker, confira também se as três variáveis `SPRING_DATASOURCE_*` estão configuradas no terminal/IDE.

---

## Releases

| Release | Sprints | Entrega | Documentação |
|---|---|---|---|
| Release 1 | 1 e 2 | 09/11/2026 | [README da Release 1](releases/release1/README.md) |
| Release 2 | 3 e 4 | 07/12/2026 | [README da Release 2](releases/release2/README.md) |
| Release 3 | 5 e 6 | 11/02/2027 | [README da Release 3](releases/release3/README.md) |

Os requisitos implementados em cada entrega, com as capturas das interfaces (sucesso e erro) para evidências, estão no README da respectiva release. Os guias técnicos, a modelagem e a coleção Postman estão em [`docs/`](docs/).

---

## Autores

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/gabiandradeal">
        <img src="https://github.com/gabiandradeal.png" width="100" alt="Foto da Gabriela"/><br />
        <sub><b>Gabriela Andrade</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/georiSamuel">
        <img src="https://github.com/georiSamuel.png" width="100" alt="Foto do Georis"/><br />
        <sub><b>Georis Samuel</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Horlanlacerda">
        <img src="https://github.com/Horlanlacerda.png" width="100" alt="Foto do Horlan"/><br />
        <sub><b>Horlan Lacerda</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/SuelleMaciel">
        <img src="https://github.com/SuelleMaciel.png" width="100" alt="Foto da Suelle"/><br />
        <sub><b>Suelle Maciel</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Sinddylnn">
        <img src="https://github.com/Sinddylnn.png" width="100" alt="Foto da Sinddy"/><br />
        <sub><b>Sinddy Lorranny</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/luizmouradc">
        <img src="https://github.com/luizmouradc.png" width="100" alt="Foto do Luiz"/><br />
        <sub><b>Luiz Moura</b></sub>
      </a>
    </td>
  </tr>
</table>
