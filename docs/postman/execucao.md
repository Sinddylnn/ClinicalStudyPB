# Como executar a coleção Postman

Instruções para importar e executar a coleção da API ClinicalStudyPB. Todos os dados são fictícios.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `ClinicalStudyPB.postman_collection.json` | Coleção com 29 requisições em 5 pastas |
| `local.postman_environment.json` | Ambiente `Local` (`baseUrl`, credenciais fictícias) |

## 1. Pré-requisitos

- Postman instalado (versão desktop).
- Backend e banco de dados disponíveis na máquina.

## 2. Iniciar banco e backend

> Preencher conforme o README do backend: comando para subir o banco, comando para subir a aplicação e a conta de administrador inicial.

1. Suba o banco de dados: `<comando ou instrução do projeto>`
2. Suba o backend: `<comando do projeto>`
3. Confirme que a API responde em `http://localhost:8080`. A rota `GET http://localhost:8080/auth/csrf` deve retornar `200` com um token.

O ambiente usa a conta de administrador `admin@example.test` (senha fictícia definida no ambiente). Ela precisa existir no banco antes da execução.

## 3. Importar no Postman

1. Clique em **Import**.
2. Selecione os dois arquivos desta pasta: a coleção e o ambiente.
3. No canto superior direito, selecione o ambiente **Local**. Sem ele, `{{baseUrl}}` fica vazio e todas as requisições falham.

## 4. Autenticação e CSRF

- A sessão (`JSESSIONID`) é mantida automaticamente pelo Postman.
- O backend exige token CSRF nas requisições de alteração. Um script no nível da coleção consulta `GET /auth/csrf` antes de cada requisição e grava o token em `{{csrfToken}}`. As requisições enviam o header `X-CSRF-TOKEN`.
- Não é preciso copiar token nem cookie manualmente.
- O login é feito pelas requisições **Login Admin** e **Login Pesquisador**, usando as credenciais do ambiente.

## 5. Executar a coleção

**Execução completa (recomendada)**

1. Clique na coleção **ClinicalStudyPB API** e depois em **Run**.
2. Mantenha a ordem padrão, **Iterations = 1** e **Delay = 0**.
3. Clique em **Run ClinicalStudyPB API**.

**Resultado esperado:** 29 requisições, 36 testes aprovados, 0 falhas.

A coleção cria usuários e estudos de teste com e-mails únicos (timestamp), então pode ser executada várias vezes seguidas.

**Execução manual:** para enviar uma requisição isolada, faça antes **Login Admin - 200** (ou **Login Pesquisador - 200** para as rotas de estudos) e depois envie a requisição desejada.

## 6. Ordem dos cenários

1. **Autenticação:** CSRF, login inválido (401), login admin, sessão.
2. **Usuários (administrador):** cadastrar, duplicado (409), inválido (400), listar, editar, desativar, reativar.
3. **Troca de sessão:** logout do administrador e login como pesquisador.
4. **Estudos (pesquisador):** coordenadores, cadastrar, inválidos (400, 404), listar, atribuir coordenador, acesso sem permissão (403).
5. **Encerrar sessão:** logout (204) e rota protegida (401).

## 7. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Invalid URI "http:///auth/..."` | Ambiente não selecionado | Selecionar `Local` |
| `ECONNREFUSED` | Backend fora do ar | Subir o backend |
| `403 CSRF_INVALIDO` em várias requisições | Token CSRF não atualizado | Rodar a coleção pelo Runner, na ordem padrão |
| `401` no login admin | Conta inicial inexistente | Criar a conta de administrador no banco |
| `409` ao cadastrar usuário | E-mail já existente | Reexecutar a coleção; o e-mail é gerado a cada execução |
