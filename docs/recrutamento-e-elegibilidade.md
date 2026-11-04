# Candidatos e avaliação de elegibilidade

O cadastro e a avaliação são feitos pelo coordenador vinculado, durante o
recrutamento. O pesquisador responsável também pode consultar os candidatos e
suas avaliações, inclusive depois do recrutamento. Nenhum dos dois perfis pode
consultar estudos fora de seu vínculo.

| Método | Rota | Permissão |
|---|---|---|
| POST | `/estudos/{estudoId}/candidatos` | Coordenador vinculado |
| GET | `/estudos/{estudoId}/candidatos` | Pesquisador responsável ou coordenador vinculado |
| PUT | `/estudos/{estudoId}/candidatos/{candidatoId}/elegibilidade` | Coordenador vinculado, antes da inclusão |
| GET | `/estudos/{estudoId}/candidatos/{candidatoId}/elegibilidade` | Pesquisador responsável ou coordenador vinculado |

As alterações exigem sessão e CSRF. Dados inválidos retornam 400, ausência de
sessão retorna 401, perfil sem permissão ou CSRF inválido retorna 403 e registros
inexistentes ou fora do vínculo permitido retornam 404.

## Preservação após a inclusão

A inclusão histórica é identificada por `Participacao.candidato`. Ao salvar uma
avaliação, o backend bloqueia primeiro o estudo e consulta esse vínculo. Se já
houver uma participação, retorna 400 com `CANDIDATO_JA_INCLUIDO`, preservando as
respostas, a situação de elegibilidade, o coordenador e a data da avaliação.

O bloqueio vale mesmo que o estudo ainda esteja recrutando outras pessoas.
As consultas permanecem disponíveis. Uma futura retirada deve preservar a
participação e, portanto, também preservar esse bloqueio.

## Integração com a task AB#3423

O serviço de inclusão deverá:

1. Usar o mesmo bloqueio do estudo, dentro da transação de inclusão
2. Revalidar elegibilidade, consentimento, conta, vínculo e vagas
3. Criar a participação com `new Participacao(candidato, participante, instante)`

Esse construtor obtém o estudo do próprio candidato, evitando trocar o vínculo
por engano. O construtor antigo com `Estudo` permanece para compatibilidade com
registros legados e cenários de teste; não deve ser usado nas novas inclusões.

A V9 acrescenta `candidato_id` com chave estrangeira e unicidade. Ela recupera
vínculos legados quando estudo e e-mail da conta correspondem a um candidato.
Registros sem candidato correspondente permanecem com o campo nulo e não são
apagados. As migrações anteriores não foram alteradas.

Esta correção não implementa o consentimento nem o endpoint de inclusão.

## Envio de avaliações parciais

O PUT substitui o conjunto de respostas: critérios omitidos ou com resposta
nula deixam de ter resposta salva. A web deve enviar todas as respostas que
deseja manter. É necessário pelo menos um critério respondido; enquanto houver
pendências, a situação permanece INCOMPLETA.

## Como conferir

Com JDK 21, na pasta backend:

```bash
./mvnw -B verify
```

Para incluir os testes PostgreSQL, configurar um banco exclusivo de testes nas
variáveis `CLINICALSTUDYPB_TEST_DB_URL`, `CLINICALSTUDYPB_TEST_DB_USER` e
`CLINICALSTUDYPB_TEST_DB_PASSWORD`, e executar:

```bash
./mvnw -B clean '-Dtest=*Test,*IT' verify
```

Os testes verificam as permissões de leitura e escrita, a preservação da
avaliação após uma inclusão confirmada e a aplicação da V9 sobre registros V8.

### Validação em 04/11/2026

A suíte completa passou com 221 testes, sem falhas, erros ou testes ignorados,
usando JDK 21.0.12.1 e PostgreSQL 17.11 descartável. A cobertura de linhas dos
serviços foi de 97,55%, acima do mínimo de 80%.

Depois foi acrescentado o teste de migração V8 → V9 e reexecutada a classe
AvaliacaoElegibilidadePersistenciaIT: seus três testes passaram, incluindo a
preservação da avaliação após inclusão. Ao todo, foram validados 222 testes
distintos. O banco de desenvolvimento não foi utilizado.
