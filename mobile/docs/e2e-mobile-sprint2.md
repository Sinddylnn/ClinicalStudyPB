# Teste E2E da aplicação mobile - Sprint 2

**Task:** 3419 - Automatizar fluxo básico E2E da aplicação mobile existente
**Responsável:** Horlan de Lacerda
**Data:** 03/11/2026

## Objetivo
Criar um teste automatizado de ponta a ponta para um fluxo básico já disponível na aplicação mobile, utilizando apenas funcionalidades efetivamente implementadas até a Release 1.

## Ferramenta
[Maestro](https://maestro.mobile.dev), executando no emulador Android via Expo Go.

## Escolha da ferramenta
Optou-se pelo Maestro em vez do Detox por exigir configuração mínima, funcionar com o app no Expo Go sem alterações no código e ser adequado ao escopo atual (navegação entre abas). O Detox pode ser reavaliado se a suíte E2E crescer.

## Fluxo coberto
Navegação básica entre as abas, única funcionalidade implementada até a Release 1:

1. Abrir o app e verificar a tela Início
2. Navegar para Estudos e verificar o conteúdo
3. Navegar para Visitas e verificar o conteúdo
4. Navegar para Perfil e verificar o conteúdo
5. Voltar para Início

As demais telas estão previstas para a Sprint 3, quando o teste será expandido.

## Arquivo do teste
`.maestro/navegacao-basica.yaml`

## Pré-requisitos
- Java 17 ou superior
- Maestro instalado (`maestro --version`)
- Emulador Android aberto (`adb devices` deve listá-lo)
- Expo Go instalado no emulador

## Como executar
1. Abrir o emulador Android
2. Rodar `npx expo start` na raiz do projeto
3. Ajustar o IP no `openLink` de `.maestro/navegacao-basica.yaml` para o endereço exibido pelo Expo (ex.: `exp://192.168.0.4:8081`)
4. Executar: `maestro test .maestro/navegacao-basica.yaml`

## Resultado
Todos os passos foram concluídos com sucesso no emulador Android, sem alteração no código da aplicação.

## Critério de conclusão
Atendido: o fluxo E2E mobile pode ser executado automaticamente e finaliza com sucesso no ambiente definido pelo projeto.
