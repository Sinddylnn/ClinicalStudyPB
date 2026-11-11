# Guia de execução da aplicação web

Este guia mostra como instalar, executar e testar a aplicação web do ClinicalStudyPB. No fim, reúne as evidências da Release 1 (Sprints 1 e 2).

## Visão geral

Na Release 1, a web entrega os requisitos RF01 a RF11:

| Requisito | Sprint | O que a web faz                                                                                       |
| --------- | ------ | ----------------------------------------------------------------------------------------------------- |
| RF01      | 1      | O administrador lista, cadastra, edita, desativa e reativa contas dos quatro perfis.                  |
| RF02      | 1      | Qualquer conta ativa entra com e-mail e senha e sai encerrando a sessão no servidor.                  |
| RF03      | 1      | Cada perfil vê apenas o que pode usar. Rotas de outro perfil levam ao acesso negado.                  |
| RF04      | 1      | O pesquisador cadastra estudos e vê a lista dos seus estudos.                                         |
| RF05      | 2      | O pesquisador define os critérios de inclusão e exclusão do estudo.                                   |
| RF06      | 2      | O pesquisador define as visitas previstas e as atividades de cada visita.                             |
| RF07      | 2      | O pesquisador altera o estado do estudo, respeitando as transições e os requisitos de cada uma.        |
| RF08      | 2      | O coordenador cadastra candidatos nos estudos vinculados a ele.                                       |
| RF09      | 2      | O coordenador avalia os critérios de elegibilidade de cada candidato.                                 |
| RF10      | 2      | O coordenador registra o consentimento simulado do candidato.                                         |
| RF11      | 2      | O coordenador inclui candidatos elegíveis com consentimento, respeitando o limite de participantes.    |

Quem usa a web:

- **Administrador:** gerencia as contas.
- **Pesquisador:** cadastra estudos e configura critérios, visitas e o estado de cada estudo.
- **Coordenador:** consulta os estudos vinculados a ele e conduz o recrutamento.

A segurança é garantida pelo backend. A web organiza a navegação e mostra as respostas da API.

## Pré-requisitos

| Ferramenta            | Versão                         | Uso                                  |
| --------------------- | ------------------------------ | ------------------------------------ |
| Node.js               | 24.22.0 (ver `web/.nvmrc`)     | Aplicação web                        |
| Docker com Compose v2 | —                              | Banco PostgreSQL e backend (opcional) |
| JDK                   | 21 completo (`java` e `javac`) | Backend fora do Docker               |

No Windows e no macOS, o Docker Desktop precisa estar aberto antes de subir o banco.

## Subir o banco e o backend

Todas as telas pedem login. Por isso, a web só funciona com o banco e o backend ligados. Há duas formas de subir os dois.

### Opção A: banco e backend no Docker (mais simples)

A partir da raiz do repositório:

```bash
docker compose up -d --build --wait
docker compose ps
```

O comando sobe o banco e o backend e espera os dois ficarem `healthy`. O backend fica em `http://localhost:8080`. Use `--build` sempre que o código do backend mudar. Os detalhes estão em [`execucao-docker.md`](execucao-docker.md).

Para subir também a web no Docker, use `docker compose --profile web up -d --build --wait`. Nesse modo, a web usa os estudos do backend (`VITE_ESTUDOS_API=real`). Para desenvolver ou testar os dados simulados, prefira rodar a web com `npm run dev`, como na seção "Rodar a web".

### Opção B: banco no Docker e backend pelo Maven

#### 1. Banco

A partir da raiz do repositório:

```bash
docker compose up -d db
docker compose ps
```

Espere o estado `healthy`. Sem o arquivo `.env` na raiz, a senha do banco é `clinicalstudypb_dev`. Os detalhes estão na seção "Banco de dados" do [README](../README.md#banco-de-dados-postgresql-com-docker-compose).

Se `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` já estiverem definidas no terminal, o Compose usa esses valores na criação do banco.

#### 2. Backend

O backend precisa destas variáveis, no mesmo terminal em que ele será iniciado:

| Variável                     | Valor local                                         |
| ---------------------------- | --------------------------------------------------- |
| `SPRING_DATASOURCE_URL`      | `jdbc:postgresql://localhost:5432/clinicalstudypb`  |
| `SPRING_DATASOURCE_USERNAME` | `clinicalstudypb`                                   |
| `SPRING_DATASOURCE_PASSWORD` | a senha do banco (`clinicalstudypb_dev` sem `.env`) |
| `WEB_ORIGINS`                | `http://localhost:5173`                             |

`WEB_ORIGINS` define a origem aceita para a web. Esse já é o valor padrão do backend, mas vale declarar.

Linux/macOS:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clinicalstudypb
export SPRING_DATASOURCE_USERNAME=clinicalstudypb
export SPRING_DATASOURCE_PASSWORD='SUBSTITUA_PELA_SENHA_DO_BANCO'
export WEB_ORIGINS=http://localhost:5173
cd backend
./mvnw spring-boot:run
```

Windows (PowerShell):

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/clinicalstudypb"
$env:SPRING_DATASOURCE_USERNAME="clinicalstudypb"
$env:SPRING_DATASOURCE_PASSWORD="SUBSTITUA_PELA_SENHA_DO_BANCO"
$env:WEB_ORIGINS="http://localhost:5173"
cd backend
.\mvnw.cmd spring-boot:run
```

As variáveis valem só para o terminal aberto. Ao abrir um terminal novo, defina-as de novo.

O backend está pronto quando aparece `Started ClinicalStudyPbApplication`. Deixe esse terminal aberto. Os detalhes estão na seção "Backend" do [README](../README.md#backend) e no [guia de autenticação](autenticacao.md).

## Credenciais fictícias

> **Dados fictícios.** As contas, os e-mails e as senhas abaixo servem só para testes locais. Não use dados reais.

A migração de dados fictícios do backend cria uma conta de cada perfil e dois estudos de exemplo, já com o coordenador vinculado:

| Conta                               | Senha      | Perfil        | Para testar                                        |
| ----------------------------------- | ---------- | ------------- | -------------------------------------------------- |
| `admin@clinicalstudypb.test`        | `Demo@123` | ADMINISTRADOR | Gestão de usuários                                 |
| `pesquisador@clinicalstudypb.test`  | `Demo@123` | PESQUISADOR   | Estudos, critérios, visitas e estados              |
| `coordenador@clinicalstudypb.test`  | `Demo@123` | COORDENADOR   | Recrutamento nos estudos vinculados                |
| `participante@clinicalstudypb.test` | `Demo@123` | PARTICIPANTE  | Conta usada na inclusão (o perfil usa o app mobile) |

Outras contas podem ser criadas pela tela de usuários, com a conta de administrador.

Para voltar o banco ao estado inicial, com só os dados fictícios, rode `docker compose down -v` e suba de novo. **Isso apaga todos os dados do banco local.**

## Rodar a web

Em outro terminal:

```bash
cd web
npm ci
npm run dev
```

Abra **http://localhost:5173**.

- `npm ci` instala as versões exatas do `package-lock.json`. Só é preciso na primeira vez ou quando as dependências mudarem.
- As chamadas para `/api` vão ao backend em `http://localhost:8080` pelo proxy do Vite, sem o prefixo. Por exemplo, `/api/usuarios` chega ao backend como `/usuarios`. O proxy fica em `web/vite.config.ts`.

### Dados reais ou simulados

O login e os usuários sempre usam o backend. Estudos, protocolo e recrutamento podem usar dados simulados ou a API, conforme três variáveis do `web/.env`:

| Variável              | Telas                                                             |
| --------------------- | ----------------------------------------------------------------- |
| `VITE_ESTUDOS_API`    | Lista e cadastro de estudos e mudança de estado                    |
| `VITE_PROTOCOLO_API`  | Critérios de inclusão e exclusão e visitas previstas com atividades |
| `VITE_CANDIDATOS_API` | Candidatos, elegibilidade, consentimento e inclusão                |

Cada uma aceita dois valores:

| Valor               | Comportamento                                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| `simulado` (padrão) | Dados fictícios em memória, que voltam ao estado inicial ao recarregar a página.  |
| `real`              | Dados vindos do backend e gravados no banco.                                       |

Para trocar, copie `web/.env.example` para `web/.env`, ajuste os valores e **reinicie o `npm run dev`**: o Vite só lê o `.env` ao iniciar.

Combinações mais usadas:

- **Tudo `simulado`:** mostra os exemplos fictícios de cada tela, inclusive um estudo em Recrutamento com candidatos em todas as etapas.
- **Tudo `real`:** usa só o backend; o que for cadastrado continua lá depois de recarregar.
- **`VITE_ESTUDOS_API=real` com os outros `simulado`:** o protocolo e os candidatos simulados começam vazios, para não misturar dados fictícios com estudos reais de mesmo id.

## Testes e cobertura

Dentro de `web/`:

```bash
npm test                # testes com Vitest
npm run lint            # ESLint
npm run build           # verificação de tipos e build de produção
npm run test:coverage   # testes com cobertura (Istanbul)
```

O `npm run test:coverage` mostra a tabela no terminal e gera o relatório em **`web/coverage/index.html`**. Abra esse arquivo no navegador para ver as linhas cobertas de cada arquivo. A pasta `coverage/` não vai para o Git.

Os testes não precisam do backend nem do banco: as chamadas à API são simuladas, e os testes usam sempre os serviços simulados, seja qual for o `web/.env`.

## Problemas comuns

| Sintoma                                                                   | Causa                                                           | Solução                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A web mostra só "Não foi possível verificar sua sessão. Tente novamente." | O backend está parado ou não conecta ao banco.                  | Suba o banco e o backend. Confira: `curl -i -H "Accept: application/json" http://localhost:5173/api/auth/sessao` deve responder **401** (ninguém logado). Um **502** indica backend parado. |
| O que foi cadastrado some ao recarregar a página                          | A tela está usando dados simulados.                             | Coloque a variável correspondente como `real` no `web/.env` e reinicie o `npm run dev`.                                                                                                     |
| Mudei o `web/.env` e nada mudou                                           | O Vite só lê o `.env` ao iniciar.                               | Pare o `npm run dev` (`Ctrl+C`) e rode de novo.                                                                                                                                             |
| O backend não sobe: "url attribute is not specified"                      | As variáveis `SPRING_DATASOURCE_*` não foram definidas no terminal. | Defina as variáveis da seção "Backend" no mesmo terminal, ou use a opção A (Docker).                                                                                                        |
| A porta 5173 está ocupada                                                 | A web do Docker (perfil `web`) está rodando.                    | Rode `docker compose --profile web stop web` antes do `npm run dev`.                                                                                                                        |
| `Cannot find module` ao rodar a web ou os testes                          | Dependências não instaladas, ou comando fora de `web/`.         | Entre em `web/` e rode `npm ci`.                                                                                                                                                            |
| `npm ci` falha com `EPERM` no Windows                                     | O `npm run dev` está aberto e trava arquivos de `node_modules`. | Pare o `npm run dev` (`Ctrl+C`) e rode `npm ci` de novo.                                                                                                                                    |

No PowerShell, use `curl.exe` no lugar de `curl`.

## Evidências da Release 1

As capturas foram feitas com o banco PostgreSQL e o backend locais, usando contas e dados fictícios. Os arquivos estão em [`releases/release1/evidencias/web/`](../releases/release1/evidencias/web/), e o resumo da entrega fica em [`releases/release1/README.md`](../releases/release1/README.md).

## Sprint 1: acesso e usuários (RF01 a RF03)

As capturas da Sprint 1 foram feitas antes da migração de dados fictícios, com contas criadas manualmente (Ana Administradora e Paula Pesquisadora).

### Sucesso

#### 1. Login do administrador

![Início do administrador após o login](../releases/release1/evidencias/web/01-login-sucesso-admin.png)

**Mostra:** a tela inicial da Ana Administradora logo após o login, com "Olá, Ana", o menu "Usuários" e os atalhos "Cadastrar usuário" e "Gerenciar usuários".
**Comprova:** RF02 (login com e-mail e senha) e RF03 (o administrador vê o menu de usuários).

#### 2. Início do pesquisador

![Início da pesquisadora](../releases/release1/evidencias/web/02-inicio-pesquisador.png)

**Mostra:** a tela inicial da Paula Pesquisadora, com o menu "Meus estudos" e sem o menu "Usuários".
**Comprova:** RF03. O menu e os atalhos mudam conforme o perfil.

#### 3. Lista de usuários

![Lista de usuários](../releases/release1/evidencias/web/03-usuarios-lista.png)

**Mostra:** a lista com nome, e-mail, perfil e situação; a busca; as abas Todos, Ativos e Inativos com contagem; e o filtro por perfil.
**Comprova:** RF01 (listagem). Contas ativas e inativas aparecem juntas, porque não há exclusão física (D01).

#### 4. Usuário cadastrado

![Usuário cadastrado com sucesso](../releases/release1/evidencias/web/04-usuario-cadastrado.png)

**Mostra:** a notificação "Usuário cadastrado com sucesso." e a nova conta destacada na lista, já como "Ativo".
**Comprova:** RF01. O cadastro gera uma conta que começa ativa.

#### 5. Edição de usuário

![Edição de usuário](../releases/release1/evidencias/web/05-usuario-edicao.png)

**Mostra:** o formulário com nome, e-mail e perfil. A senha não aparece, e a situação indica "Para desativar, use a ação na lista."
**Comprova:** RF01 (edição). A senha não é alterada nesta tela.

#### 6. Confirmação para desativar

![Confirmação para desativar uma conta](../releases/release1/evidencias/web/06-usuario-desativar.png)

**Mostra:** o diálogo "Desativar …?", que explica que novos logins são bloqueados, as sessões abertas são encerradas, os registros são preservados e a conta pode ser reativada.
**Comprova:** D01 e a regra 5.3. Desativar não exclui a conta e bloqueia o acesso.

#### 7. Confirmação para reativar

![Confirmação para reativar uma conta](../releases/release1/evidencias/web/07-usuario-reativar.png)

**Mostra:** o diálogo "Reativar …?" de uma conta inativa: a pessoa entra com o mesmo e-mail e senha, o perfil e os vínculos continuam iguais e nenhuma conta nova é criada.
**Comprova:** D01 e a regra 5.3. Reativar não duplica o e-mail.

#### 8. Menu da conta

![Menu da conta com a opção Sair](../releases/release1/evidencias/web/08-logout-menu-conta.png)

**Mostra:** o menu da conta aberto na barra, com nome, e-mail e a opção "Sair".
**Comprova:** RF02. O logout está disponível em todas as telas internas.

#### 9. Logout com sessão encerrada no servidor

![Login após o logout, com as requisições no DevTools](../releases/release1/evidencias/web/09-logout-sessao-encerrada.png)

**Mostra:** a tela de login depois do Sair. No DevTools aparecem `GET /auth/csrf`, `POST /auth/login` (200), as consultas `GET /auth/sessao` (200), um novo `GET /auth/csrf` e **`POST /auth/logout` com 204**.
**Comprova:** RF02. O logout encerra a sessão no servidor, e não só na tela. Também mostra a proteção CSRF: o token é buscado antes do login e do logout, que são alterações.

### Erro e proteção

#### 10. Credenciais inválidas

![Login com credenciais inválidas](../releases/release1/evidencias/web/10-credenciais-invalidas.png)

**Mostra:** a mensagem "E-mail ou senha inválidos. Confira os dados e tente novamente." O campo de senha é limpo.
**Comprova:** RF02. A mensagem é genérica e não revela se o e-mail existe.

#### 11. Cadastro com campos vazios

![Cadastro com campos vazios](../releases/release1/evidencias/web/11-cadastro-campos-vazios.png)

**Mostra:** a faixa "Não foi possível salvar. Confira os campos destacados." e o erro de cada campo: nome, e-mail, senha com pelo menos 8 caracteres e perfil.
**Comprova:** RF01. Nome, e-mail, senha inicial e perfil são obrigatórios: a web valida antes de enviar, e o backend valida de novo. A exceção é o mínimo de 8 caracteres da senha, que por enquanto só a web confere (pendência registrada para o backend).

#### 12. E-mail já cadastrado

![Cadastro com e-mail duplicado](../releases/release1/evidencias/web/12-email-duplicado.png)

**Mostra:** a mensagem "Já existe um usuário cadastrado com este e-mail." no campo e-mail. O e-mail usado é o de uma conta **inativa**.
**Comprova:** RF01. O e-mail é único, inclusive entre contas desativadas (resposta 409 `EMAIL_JA_CADASTRADO`).

#### 13. Último administrador ativo

![Último administrador ativo protegido](../releases/release1/evidencias/web/13-ultimo-administrador.png)

**Mostra:** o botão de desativar da única administradora ativa está desabilitado, com a dica "O último administrador ativo não pode ser desativado." A mesma nota aparece no rodapé da lista.
**Comprova:** a regra 5.3. O sistema nunca fica sem um administrador ativo. O backend também recusa a operação (`ULTIMO_ADMINISTRADOR`).

#### 14. Acesso negado por perfil

![Acesso negado](../releases/release1/evidencias/web/14-acesso-negado.png)

**Mostra:** a tela "Acesso negado" (Erro 403) para a administradora, ao abrir uma página de outro perfil, com o botão "Voltar ao início".
**Comprova:** RF03. Cada rota exige um perfil. O backend também responde 403 (`ACESSO_NEGADO`) quando o perfil não tem permissão.

#### 15. Sessão expirada

![Sessão expirada](../releases/release1/evidencias/web/15-sessao-expirada.png)

**Mostra:** a tela de login com o aviso "Sua sessão expirou. Entre novamente."
**Comprova:** RF02. Quando o backend responde 401 com alguém logado (sessão expirada, cookie apagado ou conta desativada), a web encerra a sessão na tela, avisa e, depois do novo login, volta à página de origem.

#### 16. Página não encontrada

![Página não encontrada](../releases/release1/evidencias/web/16-pagina-nao-encontrada.png)

**Mostra:** a tela "Página não encontrada" (Erro 404) com a barra da pesquisadora e o botão "Voltar ao início".
**Comprova:** endereços inexistentes têm uma resposta clara, sem perder a sessão.

### Testes e cobertura da Sprint 1

#### 17. Testes

![Resultado do npm test](../releases/release1/evidencias/web/17-testes.png)

**Mostra:** o fim da execução do `npm test`: **12 arquivos e 146 testes passando**. Aparecem os grupos de sessão, revalidação, sair, estudos e usuários.
**Comprova:** os componentes de login e de usuários têm testes automatizados (Vitest e Testing Library).

#### 18. Cobertura

![Relatório de cobertura com Istanbul](../releases/release1/evidencias/web/18-cobertura.png)

**Mostra:** a tabela do `npm run test:coverage`, gerada pelo Istanbul, ao fim da Sprint 1.
**Comprova:** a cobertura da web, prevista no kickoff:

| Escopo                                      | Linhas cobertas |
| ------------------------------------------- | --------------- |
| Toda a web (`src`)                          | **98,23%**      |
| Login (`src/pages/login`)                   | 100%            |
| Usuários (`src/pages/usuarios`)             | 99,6%           |
| Serviço de usuários (`src/api/usuarios.ts`) | 100%            |
| Autenticação (`src/autenticacao`)           | 94,73%          |

Dois arquivos aparecem em vermelho, e isso é esperado:

- **`App.tsx` (0%):** só junta o provedor de autenticação e as rotas. Os testes usam essas duas partes diretamente, cada uma com o seu cenário. Assim, este arquivo não é carregado nos testes.
- **`api/estudos.ts` (33%, na Sprint 1):** o serviço real de estudos ainda não era exercitado. Na Sprint 2, ele passou a ter testes próprios.

## Sprint 2: configuração do estudo (RF05 a RF07)

As capturas usam o pesquisador `pesquisador@clinicalstudypb.test`, com `VITE_ESTUDOS_API` e `VITE_PROTOCOLO_API` em `real`. O estudo é aberto pelo título em "Meus estudos" (`/estudos/:id`), em uma tela com as abas Resumo, Critérios e Visitas.

### Sucesso

#### 19. Critérios cadastrados

![Critérios de inclusão e exclusão cadastrados](../releases/release1/evidencias/web/19-rf05-criterios-sucesso.png)

**Mostra:** a aba Critérios com três critérios de inclusão e dois de exclusão, cada um com as ações de editar e remover. A opção "Este estudo não possui critérios de exclusão" fica desativada, com a explicação "Para marcar esta opção, remova os critérios de exclusão cadastrados."
**Comprova:** RF05. Os critérios pertencem ao estudo, e a declaração de ausência de exclusões não convive com exclusões cadastradas.

#### 21. Visitas previstas e atividades

![Visitas previstas com atividades](../releases/release1/evidencias/web/21-rf06-visitas-sucesso.png)

**Mostra:** a aba Visitas com três visitas em ordem ("1 · Visita Inicial", "2 · Acompanhamento da semana 6" e "3 · Visita final"), cada uma com as suas atividades e as ações de editar, remover e adicionar atividade.
**Comprova:** RF06. Cada visita prevista tem ordem própria e atividades vinculadas.

#### 24. Confirmação para iniciar o recrutamento

![Confirmação para iniciar o recrutamento](../releases/release1/evidencias/web/24-rf07-estado-confirmacao.png)

**Mostra:** o diálogo "Iniciar o recrutamento?", que explica que o protocolo fica somente para consulta, que não é possível voltar ao planejamento e que o coordenador passa a cadastrar, avaliar e incluir candidatos.
**Comprova:** RF07. A mudança de estado é confirmada e explica a consequência antes de acontecer.

#### 25. Recrutamento iniciado

![Estudo em Recrutamento](../releases/release1/evidencias/web/25-rf07-estado-sucesso.png)

**Mostra:** a notificação "Recrutamento iniciado.", a etiqueta "Recrutamento" e as ações seguintes ("Iniciar execução" e "Encerrar estudo"). Na aba Visitas, o aviso informa que o protocolo ficou só para consulta, sem os botões de alteração.
**Comprova:** RF07. A transição Planejamento → Recrutamento foi gravada no backend, e o protocolo deixa de ser alterável.

### Erro e validação

#### 20. Critério sem descrição

![Critério sem descrição](../releases/release1/evidencias/web/20-rf05-criterios-erro.png)

**Mostra:** o formulário "Novo critério de inclusão" com o campo destacado e a mensagem "Descreva o critério."
**Comprova:** RF05. A descrição é obrigatória: a web valida antes de enviar, e o backend valida de novo.

#### 22. Ordem de visita duplicada

![Ordem de visita duplicada](../releases/release1/evidencias/web/22-rf06-visitas-erro.png)

**Mostra:** o formulário "Nova visita" com a ordem 1, já usada pela "Visita Inicial", e a mensagem "Já existe uma visita prevista com essa ordem." no campo da ordem.
**Comprova:** RF06. A ordem é única no protocolo. A mensagem vem do backend (`ORDEM_VISITA_DUPLICADA`) e aparece no campo correspondente.

#### 23. Recrutamento bloqueado por pendências

![Iniciar recrutamento bloqueado](../releases/release1/evidencias/web/23-rf07-estado-erro.jpg)

**Mostra:** o botão "Iniciar recrutamento" desativado, com a explicação do que falta, e o quadro "Para iniciar o recrutamento" na aba Resumo, com duas pendências: visitas com pelo menos uma atividade cada e coordenador atribuído.
**Comprova:** RF07. A web orienta e bloqueia a transição enquanto os requisitos não são cumpridos; o backend confere as mesmas condições.

### Testes e cobertura da Release 1

#### 26. Testes

![Resultado do npm test](../releases/release1/evidencias/web/26-rf05-07-testes.png)

**Mostra:** o fim da execução do `npm test`: **28 arquivos e 414 testes passando**.
**Comprova:** as telas de critérios, visitas e estado do estudo, além das telas da Sprint 1 e do recrutamento, têm testes automatizados (Vitest e Testing Library).

#### 27. Cobertura

![Relatório de cobertura em HTML](../releases/release1/evidencias/web/27-rf05-07-cobertura.png)

**Mostra:** o relatório em HTML do Istanbul (`web/coverage/index.html`), com o total e a cobertura de cada pasta.
**Comprova:** a cobertura da web ao fim da Release 1:

| Escopo                                        | Linhas cobertas |
| --------------------------------------------- | --------------- |
| Toda a web                                    | **99,23%**      |
| Configuração do estudo (`src/pages/protocolo`) | 99,19%          |
| Estudos (`src/pages/estudos`)                 | 100%            |
| Recrutamento (`src/pages/recrutamento`)       | 99,5%           |
| Serviços da API (`src/api`)                   | 99,76%          |

A única pasta em vermelho é `src`, por causa do `App.tsx`, explicado na evidência 18.

Para reproduzir, rode `npm test` e `npm run test:coverage` dentro de `web/`.