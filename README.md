# ClinicalStudyPB

![capa.png](assets/capa.png)

>Projeto acadêmico desenvolvido na disciplina de Engenharia de Software II da UEPB, no período 2026.2.

O ClinicalStudyPB é um sistema de gestão de estudos clínicos com dados fictícios. A proposta reúne uma aplicação web para a equipe responsável pelos estudos, um aplicativo para os participantes e uma API compartilhada entre essas interfaces.

## Sobre o sistema

O sistema permitirá gerenciar usuários, cadastrar estudos, organizar o recrutamento e acompanhar participantes e visitas. A aplicação web concentrará as atividades administrativas e de pesquisa, enquanto o aplicativo permitirá ao participante consultar informações sobre sua participação e realizar as ações previstas para seu perfil.

O desenvolvimento será dividido em três releases e seis sprints. As funcionalidades serão entregues gradualmente, seguindo os requisitos da disciplina e o planejamento registrado no Azure DevOps.

Como se trata de um projeto acadêmico, serão utilizados dados fictícios. O sistema não realiza diagnósticos nem decisões clínicas automatizadas.

## Arquitetura e tecnologias

![fluxo_geral.png](assets/fluxo_geral.png)

A aplicação web e o aplicativo se comunicam com o mesmo backend por meio de uma API REST. O backend concentra as regras de negócio, o controle de acesso e a comunicação com o banco de dados.

// Colocar diagrama aqui
```text
Web — React ─────────────┐
                         ├── API REST — Spring Boot ── PostgreSQL
Mobile — React Native ───┘
```

As interfaces não acessam diretamente o banco. Dessa forma, as regras e os dados permanecem centralizados, mesmo quando são utilizados em telas diferentes.

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

Essas escolhas representam a estrutura prevista para o projeto. A configuração de cada ferramenta será incorporada ao repositório nas atividades correspondentes, respeitando as versões definidas no Kickoff.

## Organização do repositório

```text
backend/             API Java + Spring Boot ⟶ Georis e Luiz
web/                 Interface React ⟶ Suelle e Sinddy
mobile/              Aplicativo React Native + Expo ⟶ Horlan
docs/                Decisões e orientações para a equipe
docs/diagramas/      Diagramas editáveis e imagens
releases/release1/   Evidências da primeira release
releases/release2/   Evidências da segunda release
releases/release3/   Evidências da terceira release
```

Gabriela apoia os testes integrados e prepara o ambiente com Docker Compose e a automação com GitHub Actions. Cada integrante também é responsável por testar e documentar o que implementa.

As pastas ainda sem implementação contêm apenas `.gitkeep`, um marcador vazio que permite registrá-las no Git. Sua existência organiza o trabalho, mas não significa que o componente esteja concluído.


## Executar o projeto

Cada componente terá suas próprias instruções de instalação e execução. Por enquanto, o procedimento disponível é o da base do backend.

### Backend

É necessário um **JDK 21 completo**, incluindo os executáveis `java` e `javac`.

Para iniciar a API, também é necessário PostgreSQL **17.11** disponível. Configure
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD`
no terminal ou na IDE, conforme o banco preparado pela equipe. Os nomes estão em
`.env.example`, que serve como referência e não é carregado automaticamente.

O Maven Wrapper utiliza o Maven **3.9.16** e faz seu download na primeira execução. Nesse momento, também é necessário acesso à internet para obter as dependências.

#### Linux/macOS 🐧🍎

A partir da raiz do repositório:

```bash
cd backend
java -version
javac -version
./mvnw --version
./mvnw verify
./mvnw spring-boot:run
```

Se o terminal estiver utilizando outra versão do Java, configure `JAVA_HOME` e `PATH` para apontar para seu JDK 21 antes de continuar.

Ter apenas o executável `java` não garante que o compilador `javac` também esteja instalado.

#### Windows 🪟

Com `JAVA_HOME` apontando para seu JDK 21:

```powershell
cd backend
java -version
javac -version
.\mvnw.cmd --version
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

O comando `verify` compila o projeto, executa os testes e gera o pacote da aplicação. Já `spring-boot:run` inicia o servidor.

O backend utiliza `http://localhost:8080`. A mensagem `Started ClinicalStudyPbApplication` confirma sua inicialização. Para encerrar, pressione `Ctrl+C` no terminal.

#### Conferir a proteção de acesso

Com o servidor ligado, execute em outro terminal:

```bash
curl -i -H 'Accept: application/json' http://localhost:8080/auth/sessao
```

No PowerShell, utilize `curl.exe` no lugar de `curl`.

Sem realizar login, a resposta esperada é **HTTP 401**, com o seguinte conteúdo:

```json
{
  "codigo": "AUTENTICACAO_NECESSARIA",
  "mensagem": "Entre no sistema para realizar esta operação."
}
```

Esse exemplo confere se o servidor responde e exige autenticação. O fluxo completo
de login, CSRF, consulta da sessão e logout está no [guia de autenticação](docs/autenticacao.md),
junto das orientações para integrar a web e preparar os dados de teste.

#### Consultar a documentação da API

Com o backend ligado, acesse [Swagger UI](http://localhost:8080/swagger-ui.html).
A página apresenta autenticação, gestão de usuários, cadastro/listagem de estudos e
atribuição de coordenador, com seus campos e respostas. O contrato também está disponível em [JSON](http://localhost:8080/v3/api-docs)
e [YAML](http://localhost:8080/v3/api-docs.yaml).

O [guia do OpenAPI e Swagger](docs/openapi.md) explica como testar esses fluxos com
sessão, CSRF e permissões por vínculo. As [decisões e versões](docs/decisoes-e-versoes.md) reúnem as
escolhas do Kickoff e distinguem o que já existe do que ainda será implementado.
Esses documentos serão complementados conforme novas operações forem entregues.
### Aplicação web

Requer **Node.js 24.22.0** (ver `web/.nvmrc`).

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm test         # testes com Vitest
npm run lint     # ESLint
npm run build    # build de produção
```

Em desenvolvimento, as chamadas para `/api` são encaminhadas ao backend em `http://localhost:8080` pelo proxy do Vite, que remove o prefixo antes do envio (`/api/usuarios` chega ao backend como `/usuarios`). O prefixo existe só na web, para separar as chamadas à API das rotas de tela com o mesmo nome, como `/usuarios` e `/estudos`. O endereço do backend fica no `target` do proxy, em `web/vite.config.ts`. Já `VITE_API_URL` (ver `web/.env.example`) define o caminho base das chamadas feitas pela web, que por padrão é `/api`.

Todas as telas pedem login, então rodar `npm run dev` sem o backend mostra só "Não foi possível verificar sua sessão". Para usar a web, suba o banco (`docker compose up -d db`) e o backend, conforme as seções [Banco de dados](#banco-de-dados-postgresql-com-docker-compose) e [Backend](#backend), e crie uma conta de teste no banco. Por exemplo, pelo terminal SQL do contêiner (`docker compose exec db psql -U clinicalstudypb -d clinicalstudypb`):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES ('Paula Pesquisadora', 'paula@exemplo.com', crypt('Senha123', gen_salt('bf', 10)), 'PESQUISADOR');
```

Depois, entre na web com `paula@exemplo.com` e a senha `Senha123`. O [guia de autenticação](docs/autenticacao.md) traz mais detalhes sobre os dados de teste.

### Aplicação mobile

Aplicativo mobile do participante do ClinicalStudyPB, feito com React Native, TypeScript e Expo Router. Este guia explica como instalar as dependências, iniciar o Expo e executar o app no Android.

#### Versões utilizadas

|Item                | Versão  |
|--------------------|---------|
|React Native        | 0.88.0  |
|React               | 0.88.0  |
|TypeScript          | 6.0.3   |
|Expo                | 58.0.17 |
|Expo Router         | 58.0.25 |
|Jest                | 30.5.2  |
|Jest-expo           | 58.0.12 |
|React Native Testing Library      | 14.1.0  |
|Node.js             | 24.11.1 |
|npm                 | 11.6.2  |

#### Pré-requisitos

- Node.js e npm instalados (versões acima).
- Git para clonar o repositório.
- Android Studio com pelo menos um emulador (AVD) criado. Para criar: Android Studio -> More actions -> Virtual Device Manager -> Create Device.

#### Passo a passo

##### 1. Clonar repositório e entrar na pasta do app

```bash
git clone https://github.com/Sinddylnn/ClinicalStudyPB.git
cd ClinicalStudyPB/mobile
```

Todos os comandos abaixo são executados dentro da pasta `mobile/`.

##### 2. Instalar as dependências

```bash
npm install
```

##### 3. Abrir o emulador Android

Abra o Android Studio, vá em Device Manager e inicie o emulador. Espere a tela inicial do Android aparecer antes do próximo passo.

Para conferir se o emulador foi reconhecido:

```bash
adb devices
```

O emulador deve aparecer na lista com o status `device`.

##### 4. Iniciar o Expo no Android

```bash
npx expo start --android
```

O Expo inicia o servidor de desenvolvimento, abre o app no emulador e recarrega automaticamente quando o código é alterado. Se o emulador não abrir o app sozinho, com o servidor rodando pressione a no terminal.

##### 5. Verificar se deu certo

- O app abre na tela Início, com o cabeçalho "Olá!" e o cartão "Disponível na Sprint 3".
- A barra inferior tem quatro abas: Início, Estudos, Visitas e Perfil.
- Ao tocar em cada aba, a tela correspondente é exibida sem erros de compilação.

#### Endereço da API

O endereço da API muda conforme onde o app está rodando:

|Onde o app roda     | Endereço do servidor           |
|--------------------|--------------------------------|
|Emulador Android    | 10.0.2.2                       |
|Celular físico      | IP do computador na rede local |

- **Emulador Android:** dentro do emulador, localhost aponta para o próprio emulador, e não para o seu computador. O endereço especial 10.0.2.2 é o apelido que o emulador usa para acessar a máquina onde ele está rodando.
- **Celular físico:** use o IP do computador na rede local, e deixe celular e computador no mesmo Wi-Fi.

A API ainda não é consumida pelo app na Sprint 1. Esta seção registra a configuração para quando a integração for implementada.

#### Executando em um celular físico (opcional)

- 1. Instale o app **Expo Go** no celular.
- 2. Conecte celular e computador na mesma rede Wi-Fi.
- 3. Rode `npx expo start` e leia o QR code exibido no terminal com o Expo Go.

## Testes automatizados

```bash
npm test
npm test -- --ci
```

Resultado esperado: 1 suíte e 6 testes passando. O segundo comando é a execução no modo de integração contínua.

### Aplicação web, aplicativo e banco de dados

As instruções de execução serão acrescentadas conforme as bases forem disponibilizadas:

| Componente | Informações que serão documentadas |
|---|---|
| Web | Instalação das dependências, execução com Vite, endereço da API e testes |
| Mobile | Instalação das dependências, execução com Expo, configuração do Android e testes |

O backend já utiliza PostgreSQL, JPA e Flyway.
Os testes de segurança usam um repositório simulado e não exigem o banco, mas isso
não substitui a validação das migrações e da persistência no ambiente real.


### Banco de dados (PostgreSQL com Docker Compose)

O banco local roda em um contêiner **PostgreSQL 17.11**, definido no `docker-compose.yml` da raiz. É necessário ter o Docker com o Compose v2 instalado (`docker compose version`). No Windows e no macOS, o Docker Desktop precisa estar aberto e com o motor em execução.

#### Subir o banco

A partir da raiz do repositório:

```bash
cp .env.example .env
docker compose up -d db
docker compose ps
```

No PowerShell, utilize `Copy-Item .env.example .env` no lugar de `cp`. Antes de subir pela primeira vez, defina a senha em `SPRING_DATASOURCE_PASSWORD` no `.env`: o PostgreSQL só lê a senha ao criar o volume. Sem o arquivo `.env`, o Compose usa `clinicalstudypb_dev`.

O serviço está pronto quando `docker compose ps` mostra o estado `healthy`. Os dados ficam no volume `clinicalstudypb-pgdata` e continuam disponíveis depois de reiniciar o contêiner.

| Item | Valor |
|---|---|
| Endereço | `localhost:5432` |
| Banco | `clinicalstudypb` |
| Usuário e senha | `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` do `.env` |

Para abrir um terminal SQL dentro do contêiner:

```bash
docker compose exec db psql -U clinicalstudypb -d clinicalstudypb
```

#### Executar o backend com o banco

O Spring Boot não lê o `.env` automaticamente. Exporte as variáveis no terminal antes de iniciar o backend. O Flyway aplica as migrações na primeira execução.

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clinicalstudypb
export SPRING_DATASOURCE_USERNAME=clinicalstudypb
export SPRING_DATASOURCE_PASSWORD='SUBSTITUA_PELA_MESMA_SENHA_DO_ENV'
cd backend
./mvnw spring-boot:run
```

Substitua o texto entre aspas pela senha definida no seu `.env`, mantendo as aspas.
No PowerShell, utilize `$env:SPRING_DATASOURCE_URL="..."` para cada variável e `.\mvnw.cmd spring-boot:run`.

Para conferir as migrações, consulte a tabela `flyway_schema_history`:

```bash
docker compose exec db psql -U clinicalstudypb -d clinicalstudypb -c "SELECT version, description, success FROM flyway_schema_history;"
```

#### Banco de testes

Os testes de integração e o E2E usam um segundo banco, descartável, para não alterar os dados de desenvolvimento:

```bash
docker compose --profile test up -d db-test
```

Ele usa `localhost:5433` e o banco `clinicalstudypb_test`, com os mesmos usuário e senha. Os dados ficam apenas em memória: ao parar o contêiner (`docker compose --profile test down`), tudo é apagado.

#### Parar e recomeçar do zero

```bash
docker compose down        # para os contêineres e mantém os dados
docker compose down -v     # para e apaga o volume do banco de desenvolvimento
```

#### Problemas comuns

- **Erro ao conectar na API do Docker (`dockerDesktopLinuxEngine`):** o Docker Desktop não está em execução. Abra-o e aguarde o motor iniciar antes de repetir o comando.
- **Porta 5432 em uso:** já existe outro PostgreSQL na máquina. Defina `POSTGRES_PORT` no `.env` (por exemplo, `5434`) e ajuste a porta em `SPRING_DATASOURCE_URL`.
- **Erro de autenticação depois de trocar a senha:** o PostgreSQL só lê a senha na criação do volume. Execute `docker compose down -v` e suba o banco novamente.
- **Backend não conecta:** confirme que `docker compose ps` mostra `healthy` e que as três variáveis `SPRING_DATASOURCE_*` estão exportadas no mesmo terminal do backend.


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
