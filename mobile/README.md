# Minhas Finanças: app (Android, depois iPhone)

App feito com [Capacitor](https://capacitorjs.com/) em volta do **mesmo `index.html` da raiz**. Não há uma cópia do site para editar: o script `copy-web` copia o `index.html` para `www/` a cada montagem. Toda mudança no site vale também para o app.

## Como é montado

O GitHub Actions (`.github/workflows/mobile-android.yml`) monta o app a cada mudança no `index.html` ou em `mobile/`:

- **Em qualquer branch:** gera o `.apk` como *artifact* da execução.
- **No `main`, com a chave de assinatura:** troca o pré-release `app-latest` pelo `.apk` (para instalar direto) e pelo `.aab` (pacote da Play Store) da montagem nova.

Link fixo para instalar a versão mais recente: https://github.com/gabrielmacsantos/sistema_gestao/releases/download/app-latest/minhas-financas.apk

## Aviso de atualização

As notas do `app-latest` terminam com `<!-- build:N sha:... -->`. Toda vez que o app abre, e ao voltar para ele no máximo uma vez por hora, `checkAppUpdate()` compara `N` com o `versionCode` instalado (`App.getInfo().build`). Se houver versão mais nova, aparece no topo **"Nova versão do app disponível"**, com **Atualizar** (baixa o `.apk`, e o Android instala por cima, mantendo os dados) e **Agora não** (esconde até sair a próxima). Sem internet, ou se a consulta falhar, nada aparece.

A lista do que mudou sai das linhas `App: <texto em pt-BR>` das mensagens de commit desde a montagem anterior. Sem nenhuma, o aviso diz "Melhorias e correções". Exemplo:

```
Fix the speech plugin flow on Android

App: A voz agora funciona no Android.
```

Para montar no seu computador, você precisa de Node 24, JDK 21 e o Android SDK (Android Studio):

```bash
cd mobile
npm install
npm run sync:android        # copia o index.html e atualiza o projeto Android
cd android && ./gradlew assembleDebug
```

## O que muda dentro do app

O `copy-web` também copia o `capacitor.js` (do `@capacitor/core`) para `www/` e o carrega na cópia do `index.html` do app. Ele fornece o `Capacitor.registerPlugin`; sem isso, o site não alcança os plugins nativos. O site do GitHub Pages não o carrega.

No `index.html`, a seção "Native app (Capacitor)" só liga quando `window.Capacitor.isNativePlatform()` é verdadeiro:

| No site | No app |
|---|---|
| Voz pelo `SpeechRecognition` do navegador | Plugin `@capacitor-community/speech-recognition` (o WebView não tem a API) |
| Backup baixado como arquivo | Salvo no cache e entregue à tela **Compartilhar** (salvar no Drive, mandar por e-mail…) |
| Links externos na mesma aba | Navegador dentro do app (`@capacitor/browser`) |
| — | Botão **voltar** do Android fecha a janela aberta, depois volta a página, depois sai |
| Cartão "Leitor de notificações para Android" (baixar o app separado) | **Notificações do banco neste celular**: o próprio app lê as notificações (plugin `BankNotifications`), só depois de a pessoa habilitar, com o modo "Revisar antes" ou "Lançar sozinho" |

### Notificações do banco no app

A parte nativa fica em `android/app/src/main/java/io/github/gabrielmacsantos/minhasfinancas/`:

- `BankListener`: recebe as notificações do Android e guarda só as dos apps marcados que têm valor em R$, e só com a leitura ligada.
- `NotificationQueue`: a fila, o liga/desliga e os apps marcados, em `SharedPreferences`. Ela também mostra a notificação "N movimentações do banco", que abre o app.
- `BankNotificationsPlugin`: `status`, `setWatching`, `openAccessSettings`, `openAppDetails`, `listApps`, `setApps`, `takeQueue` e o evento `queued`.

O `index.html` pergunta antes de ligar (uma vez ao abrir, depois só em Importar), pega a fila ao abrir ou voltar para o app e usa a mesma revisão do site. Instalado fora da Play Store, o Android 13 ou mais novo exige **Permitir configurações restritas** antes de liberar o acesso às notificações.

Os dados ficam no armazenamento do próprio app. Com conta, eles sincronizam pelo Gist como no site. O backup automático do Android está **desligado** (`allowBackup="false"`), porque copiaria para o Google Drive o token do GitHub guardado no aparelho.

## Versões

- `versionName`: em `android/app/build.gradle`. Suba a versão ao lançar.
- `versionCode`: o número da execução do GitHub Actions, sempre maior que o anterior, como a Play Store exige.
