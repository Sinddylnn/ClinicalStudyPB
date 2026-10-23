# Como consultar e manter a documentação da API

O **contrato da API** é o combinado entre o backend e quem usa suas operações:
endereço, método HTTP, dados enviados, respostas e permissões. **OpenAPI** é o
formato desse contrato; **Swagger UI** é a página que permite consultá-lo e fazer
requisições. O **springdoc 3.1.1** lê os controllers e DTOs Java para gerar os dois.

Essa é uma entrega da task **3191: Publicar OpenAPI e documentar decisões e versões**.
Neste momento, o contrato cobre autenticação e gestão de usuários: oito caminhos e
nove operações, pois `/usuarios` oferece GET e POST. Os endpoints de estudos serão
acrescentados quando existirem no código.

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
mesmo e-mail deve retornar `409`. Nome ou e-mail acima de 255 caracteres e senha
acima de 72 bytes em UTF-8 devem retornar `400`. Acentos podem ocupar mais de um byte.
O último administrador ativo não pode ser desativado nem perder seu perfil: `400`.

Para conferir o perfil, encerre a sessão de administrador, obtenha outro CSRF e
entre como o pesquisador de teste. `GET /usuarios` deve retornar `403`. Depois do
logout, `GET /auth/sessao` deve retornar `401`. Se houver `403` em uma alteração,
confira tanto o perfil quanto o token; o campo `codigo` distingue os dois motivos.

## Entender as respostas

| Resposta | Significado neste fluxo |
|---|---|
| `200` | Consulta, login ou atualização concluída |
| `201` | Cadastro de usuário concluído |
| `204` | Logout concluído, sem JSON de resposta |
| `400` | Dados inválidos ou regra de negócio recusada, como remover o último administrador ativo |
| `401` | Credenciais recusadas ou ausência de uma sessão autenticada válida |
| `403` | Token CSRF ausente/inválido ou perfil sem permissão para a operação |
| `404` | Usuário informado não encontrado |
| `409` | E-mail já cadastrado |

CSRF é verificado antes do controller. Por isso, um login sem token pode responder
`403` antes mesmo de validar o e-mail e a senha. A senha aceita no login tem limite
de **72 bytes em UTF-8**, por causa do BCrypt; bytes não equivalem sempre a caracteres.
No cadastro, ultrapassar esse limite é uma validação `400` (`SENHA_MUITO_LONGA`);
no login, as credenciais são recusadas com `401`.

Os erros controlados usam `codigo`, `mensagem` e, quando houver validação de campos,
`errosCampos`. DTOs de resposta nunca incluem senha ou hash. A tabela detalhada de
códigos e o fluxo por `curl` estão em [autenticação](autenticacao.md).

## Onde a documentação é construída

| Arquivo no backend | Responsabilidade |
|---|---|
| `pom.xml` | Inclui `springdoc-openapi-starter-webmvc-ui` na versão 3.1.1 |
| `compartilhado/documentacao/ConfiguracaoOpenApi.java` | Define nome, versão, cookie de sessão, cabeçalho CSRF e operação de logout |
| `usuarios/api/AutenticacaoController.java` e `UsuarioController.java` | Descrevem autenticação e gestão de usuários, resultados e requisitos de acesso |
| DTOs em `usuarios/api` e `compartilhado/erro/ErroApi.java` | Explicam os campos que entram e saem da API |
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
  confere as operações de autenticação e usuários, sem limitar o total de caminhos.
  Assim, novas rotas podem ser adicionadas sem quebrar uma contagem fixa.

As versões e as decisões aprovadas estão em [decisões e versões](decisoes-e-versoes.md).
Não foram criadas rotas fictícias para antecipar a task de estudos.

## Verificação automatizada e limites

```bash
cd backend
./mvnw verify
```

`DocumentacaoApiTest` gera e lê o contrato, acessa os recursos da interface e confere
que a sessão, os perfis documentados e o CSRF estão descritos corretamente. Também
confere DTOs, limites dos campos e respostas sem senha. Os testes de autenticação
e usuários exercitam os filtros e as regras com repositório simulado.

Em 23/10/2026, a execução local com PostgreSQL 17.11 aplicou V1 e V2 e permitiu
conferir autenticação e gestão de usuários por HTTP real. A página Swagger também
foi aberta e executou `GET /auth/csrf` com retorno 200. Isso não comprova testes de
concorrência nem integração das telas. Cada integrante deve conferir seu ambiente. A integração das telas continua na task 3171. Quando o cadastro de
estudos for implementado, seu contrato também precisará ser revisado.


Referências: [springdoc](https://springdoc.org/),
[propriedades do springdoc](https://springdoc.org/properties.html),
[autenticação por cookie no OpenAPI/Swagger](https://swagger.io/docs/specification/v3_0/authentication/cookie-authentication/)
e [CSRF no Spring Security](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).
