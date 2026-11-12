# Consentimento e inclusão de participantes

Esta entrega implementa RF10 e RF11 com as regras do Kickoff. O coordenador
vinculado registra o consentimento simulado e inclui o candidato durante o
recrutamento. O pesquisador responsável pode consultar os registros.

## Rotas e dados

Os caminhos abaixo começam com `/estudos/{estudoId}/candidatos/{candidatoId}`.

| Método | Caminho | Resultado |
|---|---|---|
| GET | `/consentimento` | Candidato, observação, coordenador e instante do registro atual |
| PUT | `/consentimento` | Registra ACEITOU ou RECUSOU, preservando o histórico |
| GET | `/consentimento/historico` | Registros e correções, do mais recente ao mais antigo |
| GET | `/inclusao` | Candidato, datas, total histórico de incluídos e conta disponível |
| POST | `/inclusao` | Inclui e devolve o candidato com a data de inclusão |

As consultas retornam 200. O PUT retorna 200 e o POST de inclusão retorna 201.
As alterações exigem sessão de coordenador e CSRF. Os GETs permitem também o
pesquisador responsável, inclusive após o recrutamento.

Exemplo de consentimento:

```json
{
  "resposta": "ACEITOU",
  "observacao": "Aceite fictício registrado para a demonstração."
}
```

A observação é opcional, aceita até 500 caracteres após remover espaços das
pontas e vira nula quando estiver vazia. PENDENTE indica que ainda não existe
registro; não é uma resposta válida para o PUT. O backend define o autor e o
instante, sem recebê-los da tela. Não há upload ou assinatura digital.

Para acompanhar o fluxo já previsto pela web, o consentimento exige uma avaliação
registrada. Essa avaliação pode estar incompleta ou inelegível: o consentimento,
por si só, não autoriza a inclusão. A elegibilidade completa é exigida no RF11.

Exemplo de inclusão:

```json
{
  "contaId": 12
}
```

O GET de inclusão oferece somente a conta ativa de participante cujo e-mail
corresponde ao candidato. Ele não expõe a gestão administrativa de contas nem
reserva vagas. A conta precisa ser cadastrada pelo administrador previamente.

## O que o backend confere ao incluir

1. A conta do coordenador está ativa, possui o perfil correto e está vinculada ao estudo
2. O estudo está em RECRUTAMENTO e o candidato pertence a ele
3. A conta escolhida está ativa, tem perfil PARTICIPANTE e seu e-mail corresponde ao candidato
4. Não existe inclusão anterior do candidato nem da mesma conta nesse estudo
5. Existe avaliação completa e elegível, confirmada pelas respostas persistidas
6. O consentimento mais recente é ACEITOU e o resumo do candidato está consistente
7. O total histórico de inclusões é menor que o limite do estudo

A comparação de e-mails ignora diferenças de maiúsculas e espaços das pontas.
O serviço reconfere as respostas dos critérios, sem confiar apenas no campo
`elegibilidade` devolvido anteriormente à web.

## Transação e operações simultâneas

As contas são bloqueadas em ordem de ID antes do estudo, seguindo o padrão já
usado pelo projeto. O bloqueio do estudo é o mesmo das avaliações e mudanças de
estado. As verificações e a gravação acontecem na mesma transação.

Assim, duas inclusões não ocupam a última vaga ao mesmo tempo. Se o estado ou o
perfil da conta mudar enquanto a operação aguarda o bloqueio, as condições atuais
são verificadas antes de gravar.

Uma retirada futura deve preservar a participação. Ela não libera vaga nem
permite uma segunda inclusão no mesmo estudo. A conta pode participar de outros
estudos, desde que cumpra as condições de cada um.

A gestão de usuários agora impede retirar o perfil PARTICIPANTE de contas que
possuem inclusões históricas. Desativar uma conta continua preservando seus dados.

## Histórico e persistência

A V10 cria `consentimentos`. Cada correção acrescenta um registro com candidato,
resposta, observação, coordenador e instante. O último registro define a resposta
atual; registros antigos não são sobrescritos ou apagados pela API.

Após a inclusão, não é permitido corrigir consentimento nem avaliação. As consultas
continuam disponíveis. O vínculo `Participacao.candidato`, criado na V9, identifica
essa inclusão e preserva o histórico.

A participação continua guardando o instante de inclusão. O campo `dataInclusao`
do candidato é calculado a partir dela, no fuso America/Recife, como data
AAAA-MM-DD para manter o contrato da web. Não há uma segunda data independente
que possa divergir da participação.

## Erros principais

| HTTP | Código | Motivo |
|---|---|---|
| 400 | VALIDACAO_INVALIDA | Entrada ausente ou inválida |
| 400 | ESTADO_INVALIDO | Estudo fora do recrutamento |
| 400 | AVALIACAO_PENDENTE | Consentimento solicitado sem avaliação registrada |
| 400 | CANDIDATO_JA_INCLUIDO | Tentativa de corrigir consentimento ou avaliação após incluir |
| 400 | ELEGIBILIDADE_INVALIDA | Avaliação ausente, incompleta, inelegível ou inconsistente |
| 400 | CONSENTIMENTO_NAO_ACEITO | Sem aceite atual comprovado pelo histórico |
| 400 | CONTA_INVALIDA | Conta ausente, inativa, com outro perfil ou outro e-mail |
| 409 | INCLUSAO_DUPLICADA | Candidato ou conta já incluídos no estudo |
| 409 | LIMITE_ATINGIDO | Limite histórico de participantes atingido |

Sessão ausente ou desativada retorna 401; perfil sem permissão ou CSRF inválido
retorna 403; estudo ou candidato inexistente ou fora do vínculo permitido retorna
404. As respostas mantêm o formato `codigo`, `mensagem` e `errosCampos`.

## Como testar

Com JDK 21, na pasta backend:

```bash
./mvnw -B verify
```

Para executar também os testes de banco e concorrência, configure um PostgreSQL
exclusivo de testes com `CLINICALSTUDYPB_TEST_DB_URL`,
`CLINICALSTUDYPB_TEST_DB_USER` e `CLINICALSTUDYPB_TEST_DB_PASSWORD`:

```bash
./mvnw -B clean '-Dtest=*Test,*IT' verify
```

A CI passa a executar todos os testes `*IT`, incluindo o teste desta entrega.

Os exemplos estão em
[Consentimento-inclusao.postman_collection.json](../postman/Consentimento-inclusao.postman_collection.json).
Prepare um estudo em recrutamento, candidato elegível ainda não incluído, uma
conta ativa de participante com o mesmo e-mail e ao menos uma vaga disponível.
Na coleção, informe os IDs e as credenciais fictícias do coordenador vinculado.

O fluxo registra recusa, confirma o bloqueio, corrige para aceite, inclui e
confirma os bloqueios de duplicidade e correção após inclusão. Ao terminar, esse
candidato estará incluído; para repetir o fluxo completo, prepare outro candidato.

## Integração com a web

As rotas e os DTOs seguem o contrato de `web/src/api/candidatos.ts`, incluindo
`contaId`, `registradoPor`, `registradoEm` e `dataInclusao`.
A web continua escolhendo o serviço real por `VITE_CANDIDATOS_API=real`.
Esta task não altera a configuração local da interface nem substitui sua
validação integrada com a equipe.

## Validação em 04/11/2026

A execução completa com JDK 21.0.12.1 e PostgreSQL 17.11 descartável terminou
com **266 testes, zero falhas, zero erros e zero ignorados; BUILD SUCCESS**.
A cobertura de linhas nos serviços foi de **97.65%**, acima
do mínimo de 80%.

Foram executados 36 testes novos de API e seis de integração desta task,
incluindo histórico persistido, duplicidade, limite de vagas e concorrência.
Também foram validados o contrato OpenAPI e a proteção do perfil de participante.

A coleção Postman foi conferida estruturalmente. O Runner e a interface web
não foram executados nesta validação. O banco de desenvolvimento não foi usado.
