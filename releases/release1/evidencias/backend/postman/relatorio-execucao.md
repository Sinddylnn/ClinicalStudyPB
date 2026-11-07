# Evidência de testes: coleção Postman (Release 1)

| Item | Valor |
|---|---|
| Data e hora da execução | 26/10/2026, 17:01 |
| Commit testado | `<hash curto: git rev-parse --short HEAD>` |
| Branch | `mobile` |
| Executado por | Horlan de Lacerda |
| Ferramenta | Postman, Collection Runner |
| Ambiente | Local (`http://localhost:8080`) |
| Iterações | 1 |
| Duração | 4,1 s (tempo médio de resposta: 105 ms) |
| Resultado geral | 29 requisições, 36 testes aprovados, 0 falhas, 0 erros |

## Cenários e resultados

| # | Cenário | Esperado | Resultado |
|---|---|---|---|
| 1 | Obter CSRF | 200 | Aprovado |
| 2 | Login inválido (senha errada) | 401 | Aprovado |
| 3 | Login Admin | 200 | Aprovado |
| 4 | Consultar sessão | 200 | Aprovado |
| 5 | Cadastrar pesquisador | 201 | Aprovado |
| 6 | Cadastrar coordenador | 201 | Aprovado |
| 7 | Cadastrar e-mail duplicado | 409 | Aprovado |
| 8 | Cadastrar usuário inválido | 400 | Aprovado |
| 9 | Listar usuários | 200 | Aprovado |
| 10 | Editar usuário | 200 | Aprovado |
| 11 | Editar usuário inválido | 400 | Aprovado |
| 12 | Editar usuário inexistente | 404 | Aprovado |
| 13 | Desativar usuário | 200 | Aprovado |
| 14 | Desativar usuário inexistente | 404 | Aprovado |
| 15 | Reativar usuário | 200 | Aprovado |
| 16 | Logout do administrador | 204 | Aprovado |
| 17 | Login Pesquisador | 200 | Aprovado |
| 18 | Listar coordenadores disponíveis | 200 | Aprovado |
| 19 | Cadastrar estudo | 201 | Aprovado |
| 20 | Cadastrar estudo inválido (campos vazios) | 400 | Aprovado |
| 21 | Cadastrar estudo inválido (fim antes do início) | 400 | Aprovado |
| 22 | Cadastrar estudo com coordenador inexistente | 404 | Aprovado |
| 23 | Listar estudos | 200 | Aprovado |
| 24 | Atribuir coordenador | 200 | Aprovado |
| 25 | Atribuir coordenador inválido | 400 | Aprovado |
| 26 | Atribuir coordenador a estudo inexistente | 404 | Aprovado |
| 27 | Listar usuários sem permissão (pesquisador) | 403 | Aprovado |
| 28 | Logout | 204 | Aprovado |
| 29 | Rota protegida após logout | 401 | Aprovado |

