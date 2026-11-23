# Execução Postman da Release 2

A coleção `docs/postman/ClinicalStudyPB.postman_collection.json` reúne as pastas **1 a 8** (Release 1) e as pastas **9 a 14** (24 requisições referentes aos requisitos **RF12 a RF18** na Release 2).

## Observações de execução

- **Sessões e perfis:** as requisições das pastas **9 a 13** exigem sessão autenticada com perfil compatível (como `Pesquisador`) e a pasta **14** exige sessão de `Participante` (após encerrar a sessão anterior).
- **IDs e Runner sequencial:** vários cenários das pastas **9 a 13** utilizam identificadores fixos (ex.: `/estudos/6/participacoes/2/...`) e pressupõem dados pré-existentes no banco local, podendo retornar `403` ou `404` quando executados em sequência no Collection Runner sem o estado correspondente na base ou sem a sessão adequada.
- **Capturas e detalhamento:** consulte os resultados consolidados em [tabela de testes da Release 2](../../tabela-de-testes.md) e os roteiros/evidências em `releases/release2/evidencias/backend/`.