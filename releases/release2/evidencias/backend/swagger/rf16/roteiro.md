# RF16, retirada do participante

## Pré-requisitos

- Backend iniciado e banco saudável
- Sessão autenticada como coordenador vinculado ao estudo
- Estudo em RECRUTAMENTO ou EXECUCAO
- Participação ATIVA com pelo menos uma visita AGENDADA

## Dados de teste

- Estudo: Estudo de Acompanhamento Cardiovascular | ID: 01
- Participação: 01
- Motivo: Participante solicitou a retirada do estudo

## Sucesso: registrar retirada

- Requisição: POST /estudos/{estudoId}/participacoes/{participacaoId}/retirada
- Resultado esperado: 200 OK, situação RETIRADA
- Resultado observado: A participação foi retirada com sucesso
- Evidência: [01-rf16-retirada-sucesso.png](01-rf16-retirada-sucesso.png)

## Verificação: visitas pendentes

- Requisição: GET /estudos/{estudoId}/participacoes/{participacaoId}/historico
- Resultado esperado: visitas antes AGENDADA agora aparecem CANCELADA, com o motivo automático
- Resultado observado: A situação é registrada como RETIRADA e não há mais consultas agendadas
- Evidência: [02-rf16-visitas-pendentes-canceladas.png](02-rf16-visitas-pendentes-canceladas.png)

## Erro: tentar retirar novamente

- Requisição: repetir o POST para a mesma participação
- Resultado esperado: 400 Bad Request, PARTICIPACAO_JA_RETIRADA
- Resultado observado: Erro retornado com sucesso
- Evidência: [03-rf16-retirada-erro-ja-retirada.png](03-rf16-retirada-erro-ja-retirada.png)

## Testes Spring

- Classes: RetiradaParticipanteControllerTest e RetiradaParticipanteServiceTest
- Comando: ./mvnw -Dtest=RetiradaParticipanteControllerTest,RetiradaParticipanteServiceTest test
- Resultado: 31 testes, 0 falhas e 0 erros
- Evidência: [rf16-testes-spring.png](../../spring/rf16-testes-spring.png)
