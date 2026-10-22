# Sessão e controle de acesso - Sprint 1

O login usa e-mail e senha. O Spring Security confere a conta no PostgreSQL,
compara a senha com o hash BCrypt e guarda a identidade em uma sessão no servidor.
O navegador recebe o cookie `JSESSIONID`, marcado como HttpOnly: o JavaScript
envia o cookie nas requisições, mas não lê seu valor.

Essa implementação segue o Kickoff: sessão, BCrypt, CSRF, origem web restrita,
perfis e bloqueio de contas desativadas. Os endereços abaixo concretizam o contrato
para a integração da web; nomes de endpoints não eram exigências da professora.

## Fluxo para a web

1. Consultar `GET /auth/csrf` antes do login e guardar `token` e `headerName`.
2. Enviar `POST /auth/login` com JSON `{ "email": "...", "senha": "..." }`,
   o cookie e o token no cabeçalho indicado pela resposta anterior.
3. Após o sucesso, consultar novamente `GET /auth/csrf`, pois o login renova a sessão
   e descarta a proteção CSRF anterior.
4. Consultar `GET /auth/sessao` ao recarregar a página para recuperar a identificação.
5. Enviar o token CSRF nas operações POST, PUT, PATCH e DELETE, incluindo o logout.
6. Para sair, enviar `POST /auth/logout`. Depois, limpar os dados da sessão na tela.
   Para entrar novamente, começar pelo primeiro passo.

No `fetch`, usar `credentials: "include"` em todas essas chamadas. No Axios,
usar `withCredentials: true`. Não é necessário enviar um cabeçalho Authorization.
O token CSRF protege requisições de alteração; ele não substitui a senha nem o cookie.

## Contrato HTTP

| Método e endereço | Entrada | Resposta de sucesso |
|---|---|---|
| `GET /auth/csrf` | Nenhuma | `200` com `token` e `headerName` |
| `POST /auth/login` | JSON com `email` e `senha`, cookie e CSRF | `200` com `id`, `nome`, `email` e `perfil` |
| `GET /auth/sessao` | Cookie da sessão autenticada | `200` com os mesmos dados públicos do login |
| `POST /auth/logout` | Cookie e CSRF | `204`, sem corpo; sessão invalidada no servidor |

Os retornos nunca incluem senha ou hash. E-mails são consultados sem distinguir
maiúsculas e espaços nas pontas, seguindo a restrição criada por Luiz no banco.
A senha é preservada exatamente como foi digitada. BCrypt admite até 72 bytes;
uma senha de login acima desse limite é recusada, inclusive quando houver acentos.

| Situação | HTTP | Código JSON |
|---|---|---|
| Campos de login inválidos | `400` | `VALIDACAO_INVALIDA`, com `errosCampos` |
| E-mail ausente, senha errada ou conta desativada no login | `401` | `CREDENCIAIS_INVALIDAS` |
| Consulta protegida sem sessão válida | `401` | `AUTENTICACAO_NECESSARIA` |
| Perfil sem permissão | `403` | `ACESSO_NEGADO` |
| Alteração sem CSRF ou com token inválido | `403` | `CSRF_INVALIDO` |

A verificação CSRF acontece antes do login. Por isso, um POST sem o token pode
receber `403` mesmo sem estar autenticado. Um preflight de origem não permitida
é recusado pelo filtro CORS, que pode responder sem o corpo JSON da API.

## Permissões preparadas para as rotas da Sprint 1

| Operação | Perfil permitido |
|---|---|
| Gestão em `/usuarios` e seus subendereços | Administrador |
| `POST /estudos` | Pesquisador |
| `GET /estudos` e `GET /estudos/{id}` | Pesquisador e coordenador |
| Consulta da própria sessão | Qualquer perfil autenticado |

O filtro controla o perfil. Na task de estudos, o serviço e o repositório também
precisam limitar o pesquisador aos estudos de sua responsabilidade. O responsável
por um novo estudo vem do identificador autenticado, nunca de um valor livre do formulário.
As rotas de gestão e estudos serão implementadas nas respectivas tasks; as permissões
por si só não criam esses endpoints.

A conta é relida por identificador nas requisições autenticadas. Desativação encerra
o acesso na próxima requisição; mudança de perfil atualiza as permissões da sessão.
Isso preserva o reconhecimento da conta mesmo depois de alterar seu e-mail.
Rotas novas precisam ser incluídas na política de acesso, pois a regra final nega
operações que ainda não foram autorizadas.

## Ambiente local

Configurar estas variáveis no terminal ou na configuração de execução do IntelliJ:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clinicalstudypb
SPRING_DATASOURCE_USERNAME=clinicalstudypb
SPRING_DATASOURCE_PASSWORD=senha_definida_no_seu_banco
WEB_ORIGINS=http://localhost:5173
SESSION_COOKIE_SECURE=false
SESSION_TIMEOUT=30m
```

Endereço, usuário e senha devem corresponder ao PostgreSQL preparado pela equipe.
O Kickoff fixa PostgreSQL 17.11. `.env.example` documenta os nomes; copiar esse arquivo
para `.env` não faz o Spring carregá-lo automaticamente.

O Flyway aplica as migrações e o Hibernate valida a estrutura, sem recriar tabelas.
Para testar credenciais reais, a preparação dos dados deve fornecer uma conta ativa
com senha codificada pelo bean `PasswordEncoder`. Essa mesma instância deve ser usada
na gestão de usuários de Luiz ao cadastrar ou trocar uma senha.

O prazo de 30 minutos sem atividade e a origem Vite são padrões locais configuráveis.
Usar `localhost` de forma consistente na web e na API, sem alternar com `127.0.0.1`.
Para mais de uma origem permitida, separar os endereços completos por vírgula.
Em uma execução com HTTPS, definir `SESSION_COOKIE_SECURE=true`. O cookie usa
SameSite=Lax; uma implantação futura em sites diferentes exige revisar esse arranjo.

As sessões ficam em memória: reiniciar o backend exige novo login.

## Conferir o fluxo manualmente

Com o backend e o PostgreSQL ligados, começar por:

```bash
curl -i -c /tmp/clinical-cookies.txt http://localhost:8080/auth/csrf
```

Copiar o `token` retornado. O arquivo guarda o cookie para a próxima chamada:

```bash
curl -i -b /tmp/clinical-cookies.txt -c /tmp/clinical-cookies.txt \
  -H 'Content-Type: application/json' \
  -H 'X-CSRF-TOKEN: COLE_O_TOKEN_RETORNADO' \
  -d '{"email":"EMAIL_DA_CONTA_FICTICIA","senha":"SENHA_CONFIGURADA"}' \
  http://localhost:8080/auth/login
```

Esses valores são marcadores; usar a conta fictícia preparada no banco. Depois:

```bash
curl -i -b /tmp/clinical-cookies.txt http://localhost:8080/auth/sessao
curl -i -b /tmp/clinical-cookies.txt -c /tmp/clinical-cookies.txt http://localhost:8080/auth/csrf
```

Copiar o novo token retornado e encerrar a sessão:

```bash
curl -i -X POST -b /tmp/clinical-cookies.txt -c /tmp/clinical-cookies.txt \
  -H 'X-CSRF-TOKEN: COLE_O_NOVO_TOKEN' http://localhost:8080/auth/logout
curl -i -b /tmp/clinical-cookies.txt http://localhost:8080/auth/sessao
```

O logout deve retornar `204`; a consulta seguinte, `401`. Os exemplos são para
Linux/macOS. No Windows, o mesmo fluxo pode ser executado no Postman com seu gerenciador
de cookies e o token no cabeçalho indicado.

## Testes

Com JDK 21 e as dependências Maven disponíveis:

```bash
cd backend
./mvnw verify
```

No Windows, usar `.\mvnw.cmd verify`.

`AutenticacaoTest` exercita filtros reais, BCrypt, sessão, renovação de CSRF,
credenciais recusadas, matriz de perfis, logout, CORS, desativação e troca de perfil.
O repositório é simulado para isolar o comportamento de acesso. Isso não verifica
a consulta SQL nem as migrações: a integração com PostgreSQL precisa ser validada
com o ambiente da equipe. Os testes do contrato de erros MVC permanecem separados.

Referências de implementação: [sessões no Spring Security](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html),
[CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html) e
[CORS](https://docs.spring.io/spring-security/reference/servlet/integrations/cors.html).
