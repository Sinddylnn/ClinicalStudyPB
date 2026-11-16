# Guia de execução do aplicativo mobile — ClinicalStudyPB

Este guia explica como rodar o aplicativo do participante (React Native + Expo) integrado ao backend (Spring Boot) e ao banco de dados, no emulador ou no celular.

> Os trechos marcados com **[PREENCHER]** dependem de informações da equipe (por exemplo, o login de teste) e não devem ser versionados com dados reais.

---

## 1. Visão geral

Para o login funcionar, três partes precisam estar no ar ao mesmo tempo:

| Parte | Como roda | Porta |
|---|---|---|
| Banco de dados e backend | Docker (`docker compose`), na pasta `backend` | 8080 (API) |
| Aplicativo mobile | Expo, na pasta `mobile` | 8081 (Metro) |
| Emulador ou celular | Android Studio ou app Expo Go | — |

O aplicativo conversa com a API pelo endereço definido em `EXPO_PUBLIC_API_URL`. Se a variável não existir, ele usa `http://10.0.2.2:8080` no Android e `http://localhost:8080` no iOS.

---

## 2. Pré-requisitos

Instale antes de começar:

- **Git**
- **Node.js** (versão LTS compatível com o Expo SDK 58) e **npm**
- **Docker Desktop** (no Windows, com WSL 2 ativado)
- Uma das opções para ver o app:
  - **Emulador Android**, pelo Android Studio; ou
  - **Expo Go** instalado no celular (Android ou iOS)

Confira as instalações:

```powershell
git --version
node --version
npm --version
docker --version
docker compose version
```

Todos os comandos devem mostrar uma versão.

---

## 3. Clonar o repositório

```powershell
git clone <URL-DO-REPOSITORIO>
cd ClinicalStudyPB
```

Troque `<URL-DO-REPOSITORIO>` pela URL do repositório da equipe. Se a funcionalidade ainda estiver em uma branch, entre nela:

```powershell
git checkout <NOME-DA-BRANCH>
```

---

## 4. Subir o banco e o backend (Docker)

### 4.1 Abrir o Docker Desktop

Abra o **Docker Desktop** e espere terminar de iniciar. No canto inferior esquerdo da janela deve aparecer **Engine running**.

Se o Docker Desktop estiver fechado, o comando seguinte falha com o erro:

```
error during connect: ... open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

Esse erro significa que o Docker não está rodando. Abra o Docker Desktop e tente de novo.

### 4.2 Subir os serviços

Na pasta `backend`:

```powershell
cd backend
docker compose up -d
```

Na primeira vez pode demorar alguns minutos, porque o Docker baixa e constrói as imagens.

### 4.3 Conferir se subiu

```powershell
docker compose ps
```

Os serviços do projeto devem aparecer como `running`. Para acompanhar os logs:

```powershell
docker compose logs -f
```

Procure uma linha informando que a aplicação iniciou. Para sair dos logs, use `Ctrl + C` (isso não derruba os containers).

### 4.4 Testar a API

No navegador do computador, abra:

```
http://localhost:8080/swagger-ui.html
```

Se a página do Swagger aparecer, o backend está funcionando na porta 8080.

---

## 5. Instalar as dependências do mobile

Em outro terminal, na pasta `mobile` (a que contém o `package.json` e a pasta `app`):

```powershell
cd mobile
npm install
```

Rode esse comando sempre dentro da pasta `mobile`. Se for rodado na raiz do repositório, o Expo não encontra o `package.json`.

---

## 6. Configurar o endereço da API (`mobile/.env`)

O único `.env` do fluxo mobile é o `mobile/.env`, e ele guarda apenas o endereço da API. Só é necessário para testar no celular.

### Emulador Android

Não precisa de nada. O aplicativo usa `http://10.0.2.2:8080`, que é o endereço da sua máquina visto de dentro do emulador.

### Celular (Expo Go)

O celular não enxerga `10.0.2.2`. É preciso informar o IP do computador na rede Wi-Fi.

1. Descubra o IP do computador:

   ```powershell
   ipconfig
   ```

   Use o **Endereço IPv4** do adaptador **Wi-Fi** (por exemplo, `192.168.0.4`). Ignore os adaptadores `vEthernet` e WSL, que são redes internas.

2. Crie o arquivo `mobile/.env` com esta linha, trocando pelo seu IP:

   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.4:8080
   ```

   O arquivo se chama apenas `.env`. Não deixe espaços ao redor do `=`.

3. Condições para funcionar:
   - O celular e o computador precisam estar **na mesma rede Wi-Fi**. Redes de universidade costumam bloquear essa comunicação. Se isso acontecer, use o Wi-Fi de casa ou o roteamento do celular.
   - O IP muda quando você troca de rede. Ao mudar de Wi-Fi, rode `ipconfig` de novo e atualize o `.env`.
   - O `.env` não vai para o Git (não faça commit dele).

4. Teste antes de abrir o app. No navegador do **celular**, abra:

   ```
   http://192.168.0.4:8080/swagger-ui.html
   ```

   Se o Swagger abrir, o celular alcança o backend. Se não abrir, veja a seção 9 (firewall e rede).

---

## 7. Iniciar o aplicativo

Na pasta `mobile`:

```powershell
npx expo start -c
```

O parâmetro `-c` limpa o cache e faz o Expo ler o `.env` atualizado. Use-o sempre que alterar o `.env`.

Depois:

- **Emulador Android:** abra o emulador pelo Android Studio e, no terminal do Expo, aperte `a`.
- **Celular:** abra o Expo Go e escaneie o QR code que aparece no terminal.
- **Simulador iOS (só em Mac):** aperte `i`.

Evite a opção `w` (navegador) para testar o login: o backend só aceita a origem da aplicação web da equipe, então o login não funciona por lá.

Se o celular não conectar ao Expo, tente o modo túnel:

```powershell
npx expo start --tunnel
```

---

## 8. Testar o login e o logout

O aplicativo abre na tela de login. Não existe cadastro pelo app: a conta de participante é criada pela equipe (administrador, pela aplicação web).

Use a conta de participante de teste fornecida pela equipe:

- **E-mail:** **[PREENCHER]**
- **Senha:** **[PREENCHER]**

### Roteiro de verificação

| # | Ação | Resultado esperado |
|---|---|---|
| 1 | Tocar em **Entrar** com os campos vazios | Aviso "E-mail ou senha inválidos. Confira os dados e tente novamente." (o app não chama a API) |
| 2 | Informar um e-mail sem formato válido | O mesmo aviso, porque o backend recusa o formato e o app mostra a mensagem genérica |
| 3 | Informar e-mail e senha incorretos | O mesmo aviso |
| 4 | Informar o login correto | O app abre nas abas (Início, Estudos, Visitas, Perfil) |
| 5 | Abrir a aba **Perfil** | Nome, e-mail e o selo "Participante" |
| 6 | Tocar em **Sair** | Volta para a tela de login |
| 7 | Entrar de novo | O login funciona novamente |
| 8 | Tentar entrar com o backend desligado | Aviso "Não foi possível entrar agora. Tente novamente." |

Ao fechar o aplicativo por completo, a sessão em memória é perdida e o app volta ao login. Isso é esperado nesta versão.

Tire capturas de tela dos casos de sucesso e de erro para as evidências da sprint.

---

## 9. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `docker compose up` falha com `dockerDesktopLinuxEngine` | Docker Desktop fechado | Abrir o Docker Desktop e esperar "Engine running" |
| Docker Desktop não inicia | WSL desatualizado ou virtualização desligada | Rodar `wsl --update` e reiniciar; verificar a virtualização na BIOS |
| `ConfigError: package.json path` ao rodar o Expo | Comando rodado na pasta errada | Entrar na pasta `mobile` e rodar de novo |
| Botão **Entrar** gira por muito tempo | A requisição não chega ao backend | Conferir backend no ar, `.env` com o IP correto e reiniciar o Expo com `-c` |
| Login funciona no emulador e não no celular | `.env` ausente ou firewall | Criar o `.env` com o IP do Wi-Fi e liberar a porta 8080 no firewall |
| Swagger não abre no celular | Redes diferentes ou firewall | Usar a mesma rede Wi-Fi e liberar a porta 8080 de entrada (TCP) |
| "E-mail ou senha inválidos" com a conta certa | Conta inexistente no banco ou desativada | Confirmar com a equipe que a conta de participante existe e está ativa |
| App abre direto nas abas | Layout raiz desatualizado ou cache | Conferir `app/_layout.tsx` e reiniciar com `npx expo start -c` |
| Erro vermelho de módulo não encontrado | Arquivo fora do lugar ou dependências ausentes | Rodar `npm install` na pasta `mobile` e conferir `config`, `contexts` e `services` |
| Android bloqueia a conexão HTTP | Tráfego sem HTTPS em build de release | Em desenvolvimento (Expo Go ou dev build) costuma funcionar; em release é preciso permitir tráfego em texto claro |

### Firewall do Windows

Se o celular não alcança a porta 8080, libere a entrada:

1. Firewall do Windows, **Configurações avançadas**.
2. **Regras de Entrada**, **Nova Regra**.
3. Tipo **Porta**, protocolo **TCP**, porta **8080**.
4. **Permitir a conexão** e aplicar a todos os perfis.

Se o Windows exibir um aviso pedindo permissão para Java ou Docker, permita.

---

## 10. Encerrar

Pare o Expo com `Ctrl + C` no terminal do mobile.

Para parar o banco e o backend, na pasta `backend`:

```powershell
docker compose down
```

Para parar sem remover os containers:

```powershell
docker compose stop
```

---

## 11. Resumo dos comandos

| O que | Onde | Comando |
|---|---|---|
| Subir banco e backend | `backend` | `docker compose up -d` |
| Ver o estado dos serviços | `backend` | `docker compose ps` |
| Ver os logs | `backend` | `docker compose logs -f` |
| Instalar dependências | `mobile` | `npm install` |
| Iniciar o app | `mobile` | `npx expo start -c` |
| Descobrir o IP | qualquer | `ipconfig` |
| Parar os serviços | `backend` | `docker compose down` |
