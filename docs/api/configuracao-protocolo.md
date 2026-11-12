# Configuração do protocolo

Este contrato complementa a modelagem dos RF05–RF07 e as transições documentadas
em [Estados do estudo](../estados-estudo.md).

O pesquisador responsável configura o protocolo durante o planejamento. Já o
coordenador vinculado pode consultar os critérios, a declaração de exclusões e
as visitas com suas atividades. As consultas continuam disponíveis depois do
planejamento, respeitando esses vínculos.

## Rotas

Todos os caminhos abaixo começam com `/estudos/{estudoId}`.

| Método | Caminho | Finalidade |
|---|---|---|
| GET / POST | `/criterios` | Listar ou cadastrar critérios |
| PUT / DELETE | `/criterios/{criterioId}` | Editar ou remover um critério |
| GET / PUT | `/criterios/exclusao` | Consultar ou alterar a declaração de ausência de exclusões |
| GET / POST | `/visitas` | Listar visitas com atividades ou cadastrar uma visita |
| PUT / DELETE | `/visitas/{visitaId}` | Editar ou remover uma visita |
| POST | `/visitas/{visitaId}/atividades` | Cadastrar atividade |
| PUT / DELETE | `/visitas/{visitaId}/atividades/{atividadeId}` | Editar ou remover atividade |

Cadastros retornam 201, consultas e edições retornam 200, e remoções retornam
204 sem corpo. As alterações exigem sessão de pesquisador e token CSRF.

As edições recebem os mesmos campos do cadastro: critério usa `tipo` e
`descricao`; visita usa `nome`, `descricao` opcional e `ordem`; atividade
usa `descricao`. Os identificadores e vínculos existentes são preservados.

## Declaração de exclusões

O GET de `/criterios/exclusao` retorna `{"semCriteriosExclusao": true}` ou
`false`. Se o protocolo ainda não existir, retorna `false`, sem criar registros.
Isso permite reconstruir a opção da tela após recarregar a página.

Antes de cadastrar uma exclusão ou mudar um critério para EXCLUSAO, o pesquisador
precisa desmarcar a declaração pelo PUT. O backend rejeita a combinação inválida,
sem desmarcar automaticamente a opção. Também rejeita marcar a declaração quando
já existem exclusões.

Excluir o último critério de exclusão não marca a declaração automaticamente.
O protocolo pode ficar incompleto no planejamento; a completude é exigida ao
abrir o recrutamento.

## Edição e remoção

As alterações bloqueiam o estudo na mesma transação usada para verificar o
planejamento. Esse bloqueio é compartilhado com a mudança de estado.

Na edição de uma visita, a ordem pode permanecer igual; só é rejeitada quando
já pertence a outra visita do mesmo protocolo. Intervalos na numeração são válidos.

Remover uma visita remove também suas atividades, pela chave estrangeira com
`ON DELETE CASCADE` já existente na V6. Não houve alteração de migrações.
A web deve pedir confirmação explicando essa remoção conjunta.

Os IDs dos itens são conferidos dentro do protocolo e da visita informados.
Registros inexistentes ou fora do vínculo permitido retornam 404. Dados inválidos
e alterações fora do planejamento retornam 400; sessão ausente retorna 401;
perfil sem permissão ou CSRF inválido retorna 403.

## Verificação

Com JDK 21, na pasta backend, executar `./mvnw -B verify`.

Para incluir os testes de persistência, configurar um PostgreSQL exclusivo para
testes pelas variáveis `CLINICALSTUDYPB_TEST_DB_URL`,
`CLINICALSTUDYPB_TEST_DB_USER` e `CLINICALSTUDYPB_TEST_DB_PASSWORD`, e executar:

```bash
./mvnw -B clean '-Dtest=*Test,*IT' verify
```

Os testes de API conferem vínculos, CSRF, campos, edição, remoção e estados.
O teste de persistência confere dados após commit, rollback de uma edição inválida,
remoção em cascata e abertura do recrutamento com o protocolo configurado pelos
serviços. O contrato das novas rotas também é verificado no OpenAPI.

### Validação em 03/11/2026

Executado o comando completo acima com JDK 21.0.12.1 e PostgreSQL 17.11
descartável: **185 testes, zero falhas, zero erros e zero ignorados**.
O resultado foi BUILD SUCCESS, com 98.12% de cobertura de linhas
nos serviços, acima do mínimo de 80%. O total inclui 11 testes de integração
com PostgreSQL. O banco de desenvolvimento não foi utilizado.
