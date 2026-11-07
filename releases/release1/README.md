# Release 1: Estrutura e recrutamento
 
**Data de entrega:** 09/11/2026
**Tag:** `release1`
**Sprints abrangidas:** Sprint 1 (13/10 a 26/10) e Sprint 2 (27/10 a 09/11)
 
## 1. Objetivo da entrega
 
Entregar a aplicação web funcional permitindo cadastrar um estudo, avaliar candidatos e incluir participantes, com a estrutura inicial do backend, da web e do mobile.
 
## 2. Requisitos
 
| ID | Requisito | Sprint | Situação | Justificativa |
|----|-----------|--------|----------|---------------|
| RF01 | Cadastrar e gerenciar usuários | 1 | <Concluído / Parcial / Não implementado> | <...> |
| RF02 | Autenticação e encerramento de sessão | 1 | <...> | <...> |
| RF03 | Restringir funcionalidades por perfil | 1 | <...> | <...> |
| RF04 | Cadastrar estudos | 1 | <...> | <...> |
| RF05 | Definir critérios de inclusão e exclusão | 2 | <...> | <...> |
| RF06 | Definir visitas previstas e atividades | 2 | <...> | <...> |
| RF07 | Gerenciar estados do estudo | 2 | <...> | <...> |
| RF08 | Cadastrar candidatos | 2 | <...> | <...> |
| RF09 | Registrar avaliação de elegibilidade | 2 | <...> | <...> |
| RF10 | Registrar consentimento simulado | 2 | <...> | <...> |
| RF11 | Incluir candidatos elegíveis, respeitando o limite de vagas | 2 | <...> | <...> |
 
## 3. Funcionalidades entregues
 
Para cada requisito, incluir ao menos uma captura de sucesso e uma de erro ou validação. Nomear as imagens pelo requisito e pelo resultado, por exemplo `rf05-criterios-sucesso.png` e `rf09-elegibilidade-erro.png`. Não incluir vídeos.
 
### 3.1 Web
**Responsável:** <nome>
 
<Descrever os fluxos entregues e linkar as capturas em [`evidencias/web/`](evidencias/web/).>
 
### 3.2 Mobile
**Responsável:** <nome>
 
<Descrever o que foi entregue no mobile (app executável e navegação entre telas) e linkar [`evidencias/mobile/`](evidencias/mobile/), incluindo o teste da Sprint 2 em [`teste-mobile-sprint2.md`](evidencias/mobile/teste-mobile-sprint2.md).>
 
### 3.3 Backend
**Responsável:** <nome>
 
<Descrever endpoints e regras de negócio entregues. Evidências em [`evidencias/backend/`](evidencias/backend/): [Docker](evidencias/backend/docker/) e [Postman](evidencias/backend/postman/).>
 
## 4. Diagramas
 
Os diagramas desta release estão em [`diagramas/`](diagramas/).
 
<Listar e linkar cada diagrama: casos de uso, classes, sequência e arquitetura.>
 
## 5. Alterações na arquitetura e no stack
 
<Descrever alterações em relação ao planejado, ou escrever "Nenhuma alteração nesta release".>
 
## 6. Resultados dos testes e cobertura
 
**Responsável:** <nome>
 
- Testes unitários: <resultado>
- Testes de integração: <resultado>
- Testes de componentes (web e mobile): <resultado>
- Cobertura de linhas do código de negócio do backend: <percentual> (mínimo exigido: 80%)
<Linkar o relatório de testes e a evidência de cobertura.>
## 7. Problemas conhecidos e pendências
 
- <Problema ou pendência, com o requisito afetado>
## 8. Processo de desenvolvimento
 
### Sprint 1 (13/10 a 26/10)
 
<Resumo de uma ou duas linhas do que foi planejado e entregue.>
- [Planning](sprints/sprint01/planning.md)
- [Review](sprints/sprint01/review.md)
- [Burndown](sprints/sprint01/burndown.png)
### Sprint 2 (27/10 a 09/11)
 
<Resumo de uma ou duas linhas do que foi planejado e entregue.>
- [Planning](sprints/sprint02/planning.md)
- [Review](sprints/sprint02/review.md)
- Burndown: <linkar quando exportado do Azure DevOps>
### Organização da equipe
 
| Integrante | Papel | Contribuições na release |
|------------|-------|--------------------------|
| <nome> | Líder técnico / Gerente | <...> |
| <nome> | Desenvolvedor Backend | <...> |
| <nome> | Desenvolvedor Web | <...> |
| <nome> | Desenvolvedor Web | <...> |
| Horlan Lacerda | Desenvolvedor Mobile | <...> |
| <nome> | QA / DevOps | <...> |
 
Testes, documentação e revisão de código são responsabilidades compartilhadas por toda a equipe.