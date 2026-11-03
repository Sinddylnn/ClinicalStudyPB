# Como consultar e manter a documentação da API

O **contrato da API** é o combinado entre o backend e quem usa suas operações:
endereço, método HTTP, dados enviados, respostas e permissões. **OpenAPI** é o
formato desse contrato; **Swagger UI** é a página que permite consultá-lo e fazer
requisições. O **springdoc 3.1.1** lê os controllers e DTOs Java para gerar os dois.

Essa é uma entrega da task **3191: Publicar OpenAPI e documentar decisões e versões**.
O contrato cobre autenticação, gestão de usuários, cadastro e listagem de estudos,
consulta de coordenadores disponíveis e atribuição de coordenador a um estudo.
As operações descritas correspondem aos controllers implementados.

## Abrir a documentação

Primeiro, configure o PostgreSQL e as variáveis do backend seguindo o README e o
[guia de autenticação](autenticacao.md#ambiente-local). O arquivo `.env`, sozinho,
não configura a execução Java: informe as variáveis no terminal ou no IntelliJ.

Na pasta `backend`, com JDK 21:

```bash
./mvnw spring-boot:run
```

No Windows, use `.\mvnw.cmd spring-boot:run`. Quando o servidor iniciar:

| Endereço local | O que mostra |
|---|---|
| <http://localhost:8080/swagger-ui.html> | Interface Swagger UI, com redirecionamento para sua página inicial |
| <http://localhost:8080/v3/api-docs> | Contrato OpenAPI em JSON |
| <http://localhost:8080/v3/api-docs.yaml> | O mesmo contrato em YAML |

Esses endereços acompanham a porta configurada para o servidor. A consulta da
documentação por GET é pública no ambiente acadêmico local. As operações descritas
continuam protegidas pelas regras de sessão, perfil e CSRF.

> **publicar** _significa disponibilizar a documentação no próprio backend em
execução_. Não foi criada uma hospedagem na internet.

## Fazer o primeiro teste no Swagger

Use a interface aberta no próprio backend, mantendo `localhost` em todas as chamadas.
Para testar um login válido, deve existir uma conta fictícia ativa no banco, com senha
armazenada como hash BCrypt. Os exemplos da documentação não criam essa conta.

1. Abra **GET /auth/csrf**, clique em **Try it out** e depois em **Execute**.
   Copie o campo `token` da resposta. O campo `headerName` informa `X-CSRF-TOKEN`.
2. Abra **POST /auth/login** e ative **Try it out**. Cole o token no campo
   `X-CSRF-TOKEN` e informe o e-mail e a senha da conta fictícia no JSON.
   Uma resposta `200` contém `id`, `nome`, `email` e `perfil`.
3. Execute novamente **GET /auth/csrf** e copie o **novo** token. Um login
   bem-sucedido renova a sessão e descarta o token CSRF anterior.
4. Execute **GET /auth/sessao**. O navegador envia o cookie automaticamente e a API
   devolve os dados públicos da conta autenticada.
5. Execute **POST /auth/logout**, preenchendo `X-CSRF-TOKEN` com o novo token.
   O resultado esperado é `204`, sem corpo de resposta.
6. Repita **GET /auth/sessao**. Agora a resposta deve ser `401`, pois o logout
   encerrou a sessão.

O cookie `JSESSIONID` identifica a sessão e é **HttpOnly**: o navegador o administra,
mas o JavaScript não pode ler seu valor. Não copie cookies para o botão **Authorize**
do Swagger e não use token Bearer. Neste projeto, a autenticação começa no endpoint
de login. O token **CSRF** é outra informação: ele comprova que a requisição de
alteração foi preparada dentro da mesma sessão.

**Example Value** mostra um modelo de JSON; não comprova que uma chamada foi feita.
Depois de clicar em **Execute**, confira o código e o corpo em **Server response**.
Os exemplos genéricos de `ErroApi` ilustram a estrutura; o código real depende do erro.

**Try it out faz requisições reais.** Login e logout afetam sua sessão. Cadastro,
edição, desativação e reativação já alteram os dados fictícios do banco.

## Testar a gestão de usuários

Entre com uma conta fictícia de perfil **ADMINISTRADOR** e obtenha um novo CSRF
após o login. Abra o grupo **Usuários** no Swagger:

| Operação | O que enviar | Resultado esperado |
|---|---|---|
| `POST /usuarios` | CSRF e JSON com `nome`, `email`, `senha`, `perfil` | `201`, conta ativa com ID gerado |
| `GET /usuarios` | A sessão já mantida pelo navegador | `200`, lista de contas ativas e desativadas |
| `PUT /usuarios/{id}` | ID, CSRF e JSON com `nome`, `email`, `perfil` | `200`, dados atualizados; não altera senha |
| `PATCH /usuarios/{id}/desativar` | ID e CSRF, sem corpo JSON | `200`, `ativo: false` |
| `PATCH /usuarios/{id}/reativar` | ID e CSRF, sem corpo JSON | `200`, `ativo: true` |

Exemplo fictício para cadastro; troque o e-mail se já existir no seu banco:

```json
{
  "nome": "Ana Pesquisa",
  "email": "ana.pesquisa@example.test",
  "senha": "ExemploLocal123!",
  "perfil": "PESQUISADOR"
}
```

Use o ID devolvido no cadastro para editar, desativar e reativar **essa conta de
teste**, mantendo sua conta administradora disponível. Repetir o cadastro com o
mesmo e-mail deve retornar `409`. Novas senhas precisam ter pelo menos **8 caracteres**
e não podem conter apenas espaços. Senha curta, nome ou e-mail acima de 255 caracteres
e senha acima de 72 bytes em UTF-8 retornam `400`. Acentos podem ocupar mais de um byte.
O mínimo se aplica ao cadastro; não altera a autenticação de contas já existentes.
O último administrador ativo não pode ser desativado nem perder seu perfil: `400`.
Também retorna `400 PERFIL_COM_VINCULOS` ao tentar mudar o perfil de um pesquisador
responsável ou coordenador para um perfil incompatível com os estudos vinculados.
Alterar nome/e-mail mantendo o perfil continua permitido. A desativação não apaga
esses vínculos, mas impede o acesso da conta.

Para conferir o perfil, encerre a sessão de administrador, obtenha outro CSRF e
entre como o pesquisador de teste. `GET /usuarios` deve retornar `403`. Depois do
logout, `GET /auth/sessao` deve retornar `401`. Se houver `403` em uma alteração,
confira tanto o perfil quanto o token; o campo `codigo` distingue os dois motivos.

## Testar estudos e atribuição de coordenador

Com o administrador, prepare contas fictícias de **PESQUISADOR** e **COORDENADOR**.
Anote seus IDs. Depois faça logout, entre como pesquisador e obtenha o novo CSRF.
O pesquisador não acessa `GET /usuarios`: existe uma consulta específica para a
seleção do coordenador, expondo somente os dados necessários.

| Operação | O que enviar | Resultado esperado |
|---|---|---|
| `GET /estudos/coordenadores` | Sessão de pesquisador | `200`, ID e nome de coordenadores ativos |
| `POST /estudos` | Sessão de pesquisador, CSRF e JSON de cadastro | `201`, responsável da sessão e estado `PLANEJAMENTO` |
| `GET /estudos` | Sessão de pesquisador ou coordenador | `200`, somente estudos vinculados àquela conta; pode retornar `[]` |
| `PUT /estudos/{id}/coordenador` | Sessão do pesquisador responsável, CSRF e `coordenadorId` | `200`, estudo com o coordenador atribuído ou substituído |

Exemplo de cadastro permitido **sem coordenador**:

```json
{
  "titulo": "Estudo fictício da Sprint 1",
  "objetivo": "Demonstrar o cadastro e a consulta de estudos",
  "dataInicio": "2026-11-01",
  "dataFim": "2026-11-01",
  "limiteParticipantes": 20
}
```

Para escolher o coordenador já no cadastro, acrescente `"coordenadorId": 3`,
substituindo `3` pelo ID retornado na consulta de coordenadores disponíveis. Omitir
o campo ou informar `null` deixa o estudo sem coordenador. O campo `responsavelId`
não faz parte do cadastro: o backend usa o pesquisador autenticado.

Para atribuir depois, use o ID do estudo em `PUT /estudos/{id}/coordenador` e envie:

```json
{ "coordenadorId": 3 }
```

Essa operação exige um ID positivo e não aceita `null` como remoção. Se já havia
um coordenador, ele é substituído. Repetir a mesma escolha mantém o mesmo vínculo.
A resposta de estudo contém `id`, `titulo`, `objetivo`, `responsavelId`,
`responsavelNome`, `coordenadorId`, `dataInicio`, `dataFim`, `limiteParticipantes` e `estado`.

`responsavelNome` é o nome atual do pesquisador, obtido pelo backend. A web pode
mostrá-lo e usá-lo na busca sem consultar a rota administrativa de usuários.
O nome também aparece nas respostas de cadastro e de atribuição do coordenador.

A listagem usa **ID decrescente**, seguindo a sequência de inclusão dos cadastros.
A data prevista de início não determina essa ordem. O ID não é uma data/hora de
auditoria nem indica a ordem exata dos commits de transações simultâneas; ele é
o critério simples adotado para esta entrega.

Para conferir o isolamento, cadastre estudos com dois pesquisadores e dois
coordenadores diferentes. Entre como cada coordenador e execute `GET /estudos`:
devem aparecer apenas os vinculados à conta. Um coordenador sem vínculo recebe
lista vazia. Depois de substituir o coordenador de um estudo, ele deve sair da
listagem do anterior e aparecer na do novo coordenador.

Confira também as recusas:

- `limiteParticipantes` aceita inteiros de `1` a `2147483647`. Enviar `2.5`, `2.0`,
  `2e0` ou um número acima desse máximo resulta em `400 REQUISICAO_INVALIDA`,
  sem salvar o estudo. O cliente deve enviar `2`, por exemplo. A conversão de
  decimal para inteiro foi desativada na API, inclusive para IDs recebidos no JSON.

- Datas iguais são aceitas; término anterior ao início resulta em `400 DATA_INVALIDA`.
- Campos obrigatórios, título acima de 150 caracteres, objetivo acima de 2000,
  limite de participantes não positivo e ID de coordenador não positivo resultam
  em `400 VALIDACAO_INVALIDA`, com os campos indicados em `errosCampos`.
- Conta escolhida inexistente resulta em `404 RECURSO_NAO_ENCONTRADO`; conta inativa
  ou de outro perfil resulta em `400 COORDENADOR_INVALIDO`.
- Atribuição em estudo alheio ou inexistente resulta em `404`. Coordenador,
  administrador e participante não podem cadastrar nem atribuir coordenadores: `403`.

A regra aprovada exige coordenador antes do recrutamento. **A transição para
recrutamento ainda será implementada na funcionalidade correspondente**; estes
endpoints não alteram o estado. A escolha e a atribuição já funcionam nesta entrega.

Ao iniciar o backend atualizado, Flyway aplica **V3** para criar a coluna opcional,
a chave estrangeira e o índice do coordenador. V1/V2 permanecem intactas. Estudos
antigos continuam sem coordenador até a atribuição pelo responsável; não é
necessário apagar o banco ou o volume Docker.

## Entender as respostas

| Resposta | Significado neste fluxo |
|---|---|
| `200` | Consulta, login ou atualização concluída |
| `201` | Cadastro de usuário ou estudo concluído |
| `204` | Logout concluído, sem JSON de resposta |
| `400` | Dados inválidos ou regra de negócio recusada, como remover o último administrador ativo |
| `401` | Credenciais recusadas ou ausência de uma sessão autenticada válida |
| `403` | Token CSRF ausente/inválido ou perfil sem permissão para a operação |
| `404` | Conta inexistente ou estudo inexistente/não pertencente ao pesquisador na atribuição |
| `409` | E-mail já cadastrado |

CSRF é verificado antes do controller. Por isso, um login sem token pode responder
`403` antes mesmo de validar o e-mail e a senha. A senha aceita no login tem limite
de **72 bytes em UTF-8**, por causa do BCrypt; bytes não equivalem sempre a caracteres.
No cadastro, ultrapassar esse limite é uma validação `400` (`SENHA_MUITO_LONGA`);
no login, as credenciais são recusadas com `401`.

Os erros controlados usam `codigo`, `mensagem` e, quando houver validação de campos,
`errosCampos`. Campos obrigatórios usam os mesmos textos do formulário web, como
“Informe o título.” e “Informe o nome completo.”. Mensagens repetidas de validações
do mesmo campo são apresentadas apenas uma vez.

Quando o JSON tem um tipo incompatível, a leitura falha antes da validação dos DTOs.
Nesse caso, a resposta permanece `400 REQUISICAO_INVALIDA`, com a mensagem geral
“Confira o formato e os dados da requisição.”; não há `errosCampos`. Isso é diferente
de receber um inteiro válido, como `0`, que é recusado pela regra do campo.

DTOs de resposta nunca incluem senha ou hash. A tabela detalhada de
códigos e o fluxo por `curl` estão em [autenticação](autenticacao.md).

## Onde a documentação é construída

| Arquivo no backend | Responsabilidade |
|---|---|
| `pom.xml` | Inclui `springdoc-openapi-starter-webmvc-ui` na versão 3.1.1 |
| `compartilhado/documentacao/ConfiguracaoOpenApi.java` | Define nome, versão, cookie de sessão, cabeçalho CSRF e operação de logout |
| `usuarios/api/AutenticacaoController.java` e `UsuarioController.java` | Descrevem autenticação e gestão de usuários, resultados e requisitos de acesso |
| `estudos/api/EstudoController.java` | Descreve cadastro, listagem, opções e atribuição de coordenadores |
| DTOs em `usuarios/api`, `estudos/api` e `compartilhado/erro/ErroApi.java` | Explicam os campos que entram e saem da API |
| `compartilhado/seguranca/ConfiguracaoSeguranca.java` | Permite consultar os arquivos da documentação sem liberar as operações protegidas |
| `application.properties` | Configura a página Swagger e a geração das respostas documentadas |

Os caminhos de pacotes da tabela partem de
`src/main/java/br/edu/uepb/clinicalstudypb`. O arquivo de propriedades fica em
`src/main/resources`.

O logout merece atenção: `POST /auth/logout` é executado por um **filtro do Spring
Security**, e não por um método do controller. Por isso, `OpenApiCustomizer` acrescenta
essa operação existente ao contrato. Esse código não implementa um segundo logout.

## Manter o contrato quando novas funcionalidades chegarem

- Documente o controller que realmente foi implementado. Use `@Operation` para
  explicar sua finalidade e `@ApiResponse` para descrever os resultados reais.
- Use `@Schema` para explicar os campos dos DTOs. Essa anotação documenta;
  validações como `@NotBlank` e regras no serviço continuam responsáveis por rejeitar
  dados incorretos.
- Declare a sessão nas operações protegidas com `@SecurityRequirement(name = "sessao")`
  e o parâmetro `TokenCsrf` nas operações de alteração. Essas anotações descrevem a
  segurança; quem a aplica é o Spring Security e, para vínculos, a regra de negócio.
- Confira exemplos, formatos de erro e perfis junto de quem implementa a web.
  Uma operação aparecer no Swagger não comprova que a tela está integrada.
- Atualize os testes do contrato quando novos endpoints entrarem. O teste atual
  confere as operações de autenticação, usuários e estudos, sem limitar o total de caminhos.
  Assim, novas rotas podem ser adicionadas sem quebrar uma contagem fixa.

As versões e as decisões aprovadas estão em [decisões e versões](decisoes-e-versoes.md).
Os contratos de estudos descritos acima já têm implementação no backend.

## Verificação automatizada e limites

```bash
cd backend
./mvnw verify
```

`DocumentacaoApiTest` gera e lê o contrato, acessa os recursos da interface e confere
que a sessão, os perfis documentados e o CSRF estão descritos corretamente. Também
confere DTOs, limites dos campos e respostas sem senha. Os testes de autenticação
e usuários, junto de `EstudoControllerTest`, exercitam os filtros e as regras com
repositórios simulados. Isso verifica o comportamento da API, mas não substitui a
conferência da persistência no banco real.

`EstudoPersistenciaIT` usa PostgreSQL real e precisa ser chamado explicitamente.
Ele não roda no `verify` comum. Prepare um **banco exclusivo de testes** e informe:

```bash
export CLINICALSTUDYPB_TEST_DB_URL='jdbc:postgresql://localhost:5433/clinicalstudypb_test'
export CLINICALSTUDYPB_TEST_DB_USER='USUARIO_DO_BANCO_DE_TESTES'
export CLINICALSTUDYPB_TEST_DB_PASSWORD='SENHA_DO_BANCO_DE_TESTES'
./mvnw -Dtest=EstudoPersistenciaIT test
```

O Compose da equipe oferece `db-test` na porta 5433. Os valores devem coincidir com
esse ambiente; as variáveis acima não iniciam o banco. O teste confere a persistência,
as consultas filtradas, a troca de coordenador, o bloqueio de mudança de perfil e
a migração de V2 para V3 preservando um estudo existente. Também confere que a chave
estrangeira rejeita um coordenador inexistente. Ele cria e remove um schema temporário
no banco de testes; nunca aponte essas variáveis para seu banco de desenvolvimento.

Em 23/10/2026, a execução local com PostgreSQL 17.11 aplicou V1 e V2 e permitiu
conferir autenticação e gestão de usuários por HTTP real. A página Swagger também
foi aberta e executou `GET /auth/csrf` com retorno 200. Isso não comprova testes de
concorrência nem integração das telas. Cada integrante deve conferir seu ambiente.
A integração das telas continua na task 3171, inclusive a seleção do coordenador
pelos novos endpoints; a existência do contrato não comprova que a web já o utiliza.

Na revisão de 25/10/2026, `./mvnw verify` passou com **84 testes**, incluindo os
cinco testes do contrato OpenAPI. Separadamente, os quatro cenários de
`EstudoPersistenciaIT` passaram em PostgreSQL **17.11** temporário. Foram
validados tanto um banco vazio quanto a evolução de V2 para V3 com dados existentes.
Esses resultados não representam uma execução da interface web nem testes de carga
ou de concorrência simultânea.


Referências: [springdoc](https://springdoc.org/),
[propriedades do springdoc](https://springdoc.org/properties.html),
[autenticação por cookie no OpenAPI/Swagger](https://swagger.io/docs/specification/v3_0/authentication/cookie-authentication/)
e [CSRF no Spring Security](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).


## Mudança de estado do estudo

O Swagger inclui `PATCH /estudos/{id}/estado`, o DTO `AlteracaoEstadoEntrada` e as
respostas `200`, `400`, `401`, `403` e `404`. A rota exige pesquisador responsável,
sessão e CSRF. `EstudoResposta` inclui `justificativaEncerramento`, e a atribuição
de coordenador documenta o bloqueio para estudos encerrados.

Consulte [as regras e os exemplos de mudança de estado](estados-estudo.md).
