# Como executar a coleção Postman

Instruções para importar e executar a coleção da API ClinicalStudyPB (Release 1). Todos os dados são fictícios.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `ClinicalStudyPB.postman_collection.json` | Coleção principal com 74 requisições em 8 pastas |
| `Local.postman_environment.json` | Ambiente `Local` (`baseUrl` e credenciais fictícias) |
| `Consentimento-inclusao.postman_collection.json` | Coleção separada (AB#3423) que detalha o fluxo de consentimento e inclusão. Exige preencher variáveis à mão e **não** faz parte da execução abaixo |

## 1. Pré-requisitos

- Postman instalado (versão desktop).
- Java 21 e PostgreSQL instalados na máquina.
- Um banco chamado `clinicalstudypb` criado no PostgreSQL.

## 2. Iniciar o backend

As credenciais do banco não ficam no código: são lidas de variáveis de ambiente. Na pasta `backend`, defina as variáveis e suba a aplicação. Troque `sua_senha_do_postgres` pela senha do seu PostgreSQL local e **nunca** versione essa senha.

**CMD (Prompt de Comando):**

```
set SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clinicalstudypb
set SPRING_DATASOURCE_USERNAME=postgres
set SPRING_DATASOURCE_PASSWORD=sua_senha_do_postgres
mvnw.cmd spring-boot:run
```

**PowerShell:**

```
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/clinicalstudypb"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="sua_senha_do_postgres"
.\mvnw.cmd spring-boot:run
```

**Git Bash, Linux ou macOS:**

```
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clinicalstudypb
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=sua_senha_do_postgres
./mvnw spring-boot:run
```

As variáveis valem só para a janela do terminal em que foram definidas. Na primeira execução, as migrações do Flyway criam as tabelas sozinhas.

Aguarde a linha `Started ClinicalStudyPbApplication` e confirme que `GET http://localhost:8080/auth/csrf` retorna `200` com um token.

## 3. Conta de administrador inicial

O ambiente usa o administrador `admin@example.test` com a senha fictícia `Admin@12345`. Ele precisa existir no banco antes da execução. Se ainda não existir, crie-o no pgAdmin (Query Tool no banco `clinicalstudypb`) ou no `psql`:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
VALUES ('Admin Teste', 'admin@example.test',
        crypt('Admin@12345', gen_salt('bf', 10)), 'ADMINISTRADOR', TRUE)
ON CONFLICT DO NOTHING;
```

Se a conta já existir, o comando não altera nada. As demais contas (pesquisador, coordenador e participante) são criadas pela própria coleção.

## 4. Importar no Postman

1. Clique em **Import**.
2. Selecione a coleção principal e o ambiente `Local`.
3. No canto superior direito, selecione o ambiente **Local**. Sem ele, `{{baseUrl}}` fica vazio e todas as requisições falham.

Se você já tinha uma versão antiga da coleção, renomeie ou apague a antiga para não executar a errada.

## 5. Autenticação e CSRF

- A sessão (`JSESSIONID`) é mantida automaticamente pelo Postman.
- O backend exige token CSRF nas requisições de alteração (POST, PUT, PATCH e DELETE). Um script no nível da coleção consulta `GET /auth/csrf` antes de cada requisição e grava o token em `{{csrfToken}}`. As requisições enviam o header `X-CSRF-TOKEN`.
- Não é preciso copiar token nem cookie manualmente.
- O login é feito pelas requisições **Login Admin**, **Login Pesquisador** e **Login Coordenador**, usando as credenciais do ambiente.

## 6. Executar a coleção

**Execução completa (recomendada)**

1. Clique na coleção **ClinicalStudyPB API** e depois em **Run**.
2. Mantenha a ordem padrão, **Iterations = 1** e **Delay = 0**.
3. Clique em **Run ClinicalStudyPB API**.

**Resultado esperado:** 74 requisições, 102 testes aprovados, 0 falhas.

A coleção cria usuários, estudos e candidatos de teste com e-mails únicos (timestamp), então pode ser executada várias vezes seguidas. Os ids criados ficam gravados no ambiente durante a execução.

**Execução manual:** as requisições dependem umas das outras (ids e sessão). Para enviar uma requisição isolada, faça antes o login do perfil correspondente e rode antes as requisições que criam os ids que ela usa.

## 7. Ordem dos cenários

1. **Autenticação:** CSRF, login inválido (401), login admin, sessão.
2. **Usuários (administrador):** cadastrar pesquisador, coordenador e participante, duplicado (409), inválido (400), listar, editar, desativar e reativar.
3. **Troca de sessão:** logout do administrador e login como pesquisador.
4. **Estudos (pesquisador):** coordenadores, cadastrar, inválidos (400, 404), listar, atribuir coordenador, acesso sem permissão (403).
5. **Estados do estudo (pesquisador):** protocolo ausente, salto de estado, falta de justificativa, encerramento e recusas após o encerramento.
6. **Protocolo do estudo (pesquisador):** novo estudo com coordenador, critérios de inclusão e exclusão, visitas e atividades, com casos inválidos. Termina abrindo o recrutamento e recusando alteração do protocolo.
7. **Candidatos, elegibilidade e inclusão (coordenador):** cadastrar candidato, avaliar elegibilidade, registrar consentimento, incluir candidato, recusar duplicidade e correção após a inclusão. Volta ao pesquisador para confirmar o 403 em candidatos e iniciar a execução do estudo.
8. **Encerrar sessão:** logout (204) e rota protegida (401).

## 8. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Invalid URI "http:///auth/..."` | Ambiente não selecionado | Selecionar `Local` |
| `ECONNREFUSED` ou `Could not send request` | Backend fora do ar | Subir o backend (seção 2) |
| `403 CSRF_INVALIDO` em várias requisições | Token CSRF não atualizado | Rodar a coleção pelo Runner, na ordem padrão |
| `401` no login admin | Conta inicial inexistente ou senha diferente | Criar o administrador (seção 3) |
| `409` ao cadastrar usuário | E-mail já existente | Reexecutar a coleção; o e-mail é gerado a cada execução |
| Falhas em cascata nas pastas 6 e 7 | Uma requisição anterior falhou e deixou um id vazio | Corrigir a primeira falha e rodar a coleção inteira de novo |
| `password authentication failed` ao subir o backend | Senha do PostgreSQL incorreta nas variáveis | Conferir `SPRING_DATASOURCE_PASSWORD` |

## 9. Cobertura e limites

A coleção cobre autenticação, usuários, estudos, mudança de estado, protocolo (critérios, visitas e atividades), candidatos, elegibilidade, consentimento e inclusão, cada um com exemplos válidos e inválidos e a resposta esperada nos testes. Cada requisição traz um exemplo de resposta salvo; as mensagens de erro desses exemplos são ilustrativas.

Algumas respostas de consulta (por exemplo, condições de inclusão) não têm corpo descrito no OpenAPI; nesses casos os testes verificam só o status. A coleção deve ser mantida alinhada ao contrato em `http://localhost:8080/v3/api-docs`. As regras de mudança de estado estão descritas em [mudança de estado](../estados-estudo.md).
