# Minhas Finanças: app (Android, depois iPhone)

App feito com [Capacitor](https://capacitorjs.com/) em volta do **mesmo `index.html` da raiz**. Não há uma cópia do site para editar: o script `copy-web` copia o `index.html` para `www/` a cada montagem. Toda mudança no site vale também para o app.

## Como é montado

O GitHub Actions (`.github/workflows/mobile-android.yml`) monta o app a cada mudança no `index.html` ou em `mobile/`:

- **Em qualquer branch:** gera o `.apk` como *artifact* da execução.
- **No `main`, com a chave de assinatura:** publica no pré-release `app-v<versão>` o `.apk` (para instalar direto) e o `.aab` (pacote da Play Store).

Para montar no seu computador, você precisa de Node 24, JDK 21 e o Android SDK (Android Studio):

```bash
cd mobile
npm install
npm run sync:android        # copia o index.html e atualiza o projeto Android
cd android && ./gradlew assembleDebug
```

## O que muda dentro do app

No `index.html`, a seção "Native app (Capacitor)" só liga quando `window.Capacitor.isNativePlatform()` é verdadeiro:

| No site | No app |
|---|---|
| Voz pelo `SpeechRecognition` do navegador | Plugin `@capacitor-community/speech-recognition` (o WebView não tem a API) |
| Backup baixado como arquivo | Salvo no cache e entregue à tela **Compartilhar** (salvar no Drive, mandar por e-mail…) |
| Links externos na mesma aba | Navegador dentro do app (`@capacitor/browser`) |
| — | Botão **voltar** do Android fecha a janela aberta, depois volta a página, depois sai |

Os dados ficam no armazenamento do próprio app. Com conta, eles sincronizam pelo Gist como no site. O backup automático do Android está **desligado** (`allowBackup="false"`), porque copiaria para o Google Drive o token do GitHub guardado no aparelho.

## Versões

- `versionName`: em `android/app/build.gradle`. Suba a versão ao lançar.
- `versionCode`: o número da execução do GitHub Actions, sempre maior que o anterior, como a Play Store exige.
