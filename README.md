<div align="center">

# 💰 Minhas Finanças

**Controle financeiro pessoal para você e quem você quiser: gastos fixos, lançamentos, extratos, orçamentos e metas, num só lugar.**

### 👉 [Abrir o Minhas Finanças](https://gabrielmacsantos.github.io/sistema_gestao/)

**Cada pessoa entra com a própria conta do GitHub e vê só as próprias finanças.**<br/>
Funciona no celular e no computador, sem instalar nada e sem servidor: tudo roda dentro do GitHub.

![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-online-222222?logo=github&logoColor=white)
![Criptografia](https://img.shields.io/badge/dados-AES--256_criptografados-00685f)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)

<br/>

<img src="docs/screenshots/dashboard-light.png" alt="Painel do Minhas Finanças no tema claro" width="100%"/>

</div>

---

## 👥 Como funciona com várias pessoas

Todo mundo usa **o mesmo link**. O que separa uma pessoa da outra é a **conta do GitHub** de cada uma:

```
            https://gabrielmacsantos.github.io/sistema_gestao/   (o mesmo site para todos)
                    │                     │                     │
              entra com              entra com             entra com
             GitHub da Ana        GitHub do Bruno       GitHub da Carla
                    │                     │                     │
        🔒 Gist secreto da Ana  🔒 Gist secreto do Bruno  🔒 Gist secreto da Carla
          (senha da Ana)          (senha do Bruno)         (senha da Carla)
```

- 🔑 **O login de cada pessoa é a conta do GitHub dela** + uma **senha** que ela mesma cria.
- 🗄️ **Os dados ficam na conta do GitHub de cada um**, num *Gist secreto*, e não neste repositório nem num servidor.
- 🔒 **Tudo é criptografado no próprio aparelho** (AES-256) antes de ir para o GitHub. Sem a senha da pessoa, ninguém lê, nem você, nem o GitHub.
- 📱 **Vale em qualquer aparelho:** entrando com a mesma conta e senha no celular e no computador, os dados são os mesmos.
- 🆓 **Grátis:** só precisa de uma conta gratuita do GitHub.

Para convidar alguém, **basta mandar o link**. A pessoa não precisa de acesso a este repositório.

---

## 🚀 Passo a passo para quem vai usar

### 1. Primeiro acesso (uma vez por pessoa, uns 2 minutos)

1. **Tenha uma conta no GitHub.** Se não tiver, crie grátis em [github.com/signup](https://github.com/signup).
2. Abra **https://gabrielmacsantos.github.io/sistema_gestao/** e clique em **Entrar com meu GitHub**. No celular, também dá para chegar em **☰ → Backup**.
3. Na janela que abrir, clique no link **"Abra esta página do GitHub"**. Ele já vem com a permissão certa (**gist**) marcada.
4. No GitHub, em *Expiration*, escolha **No expiration**, desça até o fim e clique em **Generate token**.
5. Copie o código que aparece (começa com `ghp_`) e cole no site.
6. **Crie uma senha** para os seus dados (mínimo 8 caracteres) e clique em **Conectar**.

> 📝 **Guarde o código `ghp_...` e a senha** nas suas notas ou no gerenciador de senhas. Você vai precisar deles para entrar em outro aparelho.

Pronto! O topo do site passa a mostrar **"Salvo no GitHub ✓"**, e cada alteração é salva sozinha.

### 2. No dia a dia

- Abra o link e use normalmente: lance gastos, marque contas como pagas, acompanhe o painel.
- Não precisa entrar de novo no mesmo aparelho: o site lembra de você.
- No celular, use **"Adicionar à tela inicial"** no menu do navegador para abrir como um app.

### 3. Em outro aparelho, ou depois de limpar o navegador

Abra o link, clique em **Entrar com meu GitHub** e informe **o mesmo código e a mesma senha**. Seus dados voltam na hora.

### 4. Em computador compartilhado

Ao terminar, vá em **Backup → Sair desta conta**. O site salva tudo no seu GitHub e deixa o navegador **vazio** para a próxima pessoa.

### Quer só conhecer antes?

Clique em **"Ver com dados de exemplo"** na tela inicial. Os dados fictícios ficam só no navegador; para recomeçar, use **Backup → Apagar dados**.

---

## ❓ Perguntas frequentes

<details>
<summary><b>Esqueci a senha. E agora?</b></summary>

A senha não fica guardada em lugar nenhum, e é isso que garante a privacidade. Sem ela, **o backup não pode ser aberto**. Se o site ainda estiver aberto em algum aparelho seu, vá em **Backup → Baixar backup** para salvar uma cópia em arquivo. Depois, apague o Gist antigo em [gist.github.com](https://gist.github.com) e conecte de novo com uma senha nova.
</details>

<details>
<summary><b>Perdi o código <code>ghp_...</code>.</b></summary>

Sem problema: os dados continuam no GitHub. Gere um código novo pelo mesmo link do passo 3 e entre com ele e com a **mesma senha** de antes.
</details>

<details>
<summary><b>O dono do site ou do repositório consegue ver minhas finanças?</b></summary>

Não. Os dados não passam por nenhum servidor nem por este repositório: vão direto do seu aparelho para a **sua** conta do GitHub, já criptografados com a **sua** senha.
</details>

<details>
<summary><b>O que é esse "Gist secreto"?</b></summary>

É um arquivo guardado na sua conta do GitHub, que não aparece no seu perfil nem em buscas. Você o vê em [gist.github.com](https://gist.github.com) com o nome *"Backup criptografado do Minhas Finanças"*. O conteúdo é ilegível sem a sua senha. Não edite esse arquivo.
</details>

<details>
<summary><b>Posso usar sem conectar ao GitHub?</b></summary>

Pode, mas os dados ficam **só naquele navegador**: limpar os dados de navegação apaga tudo, e eles não aparecem em outros aparelhos. Dá para guardar uma cópia manual em **Backup → Baixar backup**.
</details>

<details>
<summary><b>Celular e computador ao mesmo tempo funciona?</b></summary>

Sim. Ao abrir o site (ou voltar para a aba), ele busca a versão mais recente no GitHub. Se você alterar nos dois aparelhos ao mesmo tempo, vale a versão salva por último.
</details>

---

## ✨ O que dá para fazer

| | |
|---|---|
| 📊 **Painel completo** | Entradas, total gasto, fixos comprometidos, gastos variáveis e saldo livre previsto, com fluxo de caixa de 6 meses e distribuição por categoria. |
| 🔁 **Gastos fixos automáticos** | Aluguel, contas e assinaturas geram um lançamento pendente por mês, sozinhos. Editar um fixo nunca altera o passado. |
| 🏦 **Extrato OFX/CSV** | Importe o extrato do banco, revise antes de salvar e sem duplicar o que já foi importado. |
| 🎯 **Orçamentos e metas** | Limite mensal por categoria, com alerta a partir de 80%, e metas de economia. |
| 🔐 **Login pelo GitHub** | Cada pessoa com os próprios dados, criptografados na própria conta. |
| 🌗 **Tema claro e escuro** | Segue o sistema ou a sua escolha. |
| 🧾 **NFC-e e 📸 foto com IA** | Leitura do QR Code do cupom fiscal e de fotos de recibo. *Só na versão completa, que roda num computador (veja abaixo).* |

---

## 📱 Telas

<table>
  <tr>
    <td width="68%"><img src="docs/screenshots/dashboard-dark.png" alt="Painel no tema escuro"/></td>
    <td width="16%"><img src="docs/screenshots/mobile-dashboard.png" alt="Painel no celular"/></td>
    <td width="16%"><img src="docs/screenshots/mobile-lancamentos-dark.png" alt="Lançamentos no celular, tema escuro"/></td>
  </tr>
  <tr>
    <td align="center"><sub>Painel · tema escuro</sub></td>
    <td align="center"><sub>Celular</sub></td>
    <td align="center"><sub>Celular · escuro</sub></td>
  </tr>
</table>

<img src="docs/screenshots/lancamentos.png" alt="Lista de lançamentos com filtros e status" width="100%"/>
<p align="center"><sub>Lançamentos com filtros por mês, tipo, status e categoria. Um toque marca como pago.</sub></p>

> As capturas usam dados fictícios.

---

## 🛠️ Para quem mantém o projeto

### Como o site online é publicado

O site é o arquivo [`index.html`](./index.html): um único arquivo HTML/JS, sem build e sem servidor, publicado pelo **GitHub Pages** a partir da raiz da branch `main`. **Qualquer push na `main` atualiza o site** em cerca de 1 minuto.

- **Dados:** ficam no `localStorage` do navegador e, quando a pessoa conecta, num Gist secreto da conta dela, criptografado com AES-256-GCM. A chave é derivada da senha com PBKDF2-SHA256 (310 mil iterações) e nunca sai do aparelho.
- **Por que Gist e não este repositório:** o repositório é público. Gravar dados nele exporia as finanças de todos.
- **Por que um código de acesso e não um botão "Entrar com GitHub":** o login OAuth do GitHub exige um servidor para guardar o *client secret*, e o GitHub Pages não executa código no servidor. O código de acesso com permissão só de **gist** é a forma de autenticar 100% dentro do GitHub.
- **Requisito para publicar:** em *Settings → Pages*, deixe *Source: Deploy from a branch*, *Branch: `main` / `(root)`*.

### Versão completa (rodando no seu computador)

Tem login próprio com e-mail e senha, banco SQLite, leitura de NFC-e e foto de cupom com IA. Os dados ficam no computador onde ela roda.

**Requisito:** Node.js 20.19+ (testado com Node 24). Não precisa de Docker nem de banco em nuvem.

```bash
git clone https://github.com/gabrielmacsantos/sistema_gestao.git
cd sistema_gestao
npm install
cp .env.example .env          # preencha o SESSION_SECRET (veja abaixo)
npx prisma migrate deploy     # cria o banco em prisma/dev.db
npm run dev
```

Abra **http://localhost:3000** e crie sua conta. Cada conta nova já recebe um conjunto de categorias padrão.

#### ⚙️ Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Caminho do SQLite. Padrão: `file:./prisma/dev.db` |
| `SESSION_SECRET` | ✅ | 32+ caracteres. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ANTHROPIC_API_KEY` | | Ativa a leitura de fotos de cupom. Sem ela, a aba de foto mostra como configurar |
| `ANTHROPIC_MODEL` | | Modelo de visão. Padrão: `claude-opus-5-5` |
| `COOKIE_SECURE` | | `true` apenas se o app for servido em HTTPS |

#### 📲 Usando no celular

Com o computador e o celular na mesma rede, acesse `http://<IP-do-computador>:3000`.

A câmera ao vivo para QR Code exige HTTPS (ou localhost). Pelo IP, use o botão **"Foto do QR Code"**, que abre a câmera do celular do mesmo jeito.

#### ⚡ Produção local

```bash
npm run build
npm start
```

O build de produção é bem mais rápido que o modo de desenvolvimento.


---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Server Actions) + React 19 |
| Linguagem | TypeScript estrito, validação com Zod 4 compartilhada entre cliente e servidor |
| UI | Tailwind CSS 4 + design system próprio *Sovereign Financial* + ícones Lucide |
| Banco | SQLite via Prisma 7 (`better-sqlite3`), em modo WAL |
| Autenticação | Sessão em cookie criptografado (iron-session) + senhas com bcrypt |
| Gráficos | HTML/CSS renderizado no servidor, sem JavaScript no navegador |
| Importação | `jsqr` (QR Code), `cheerio` (SEFAZ), parser OFX próprio, `papaparse` (CSV) |
| IA | Claude API (`@anthropic-ai/sdk`), com saída estruturada e validada |
| Testes | Vitest (unidade + integração) e Playwright (E2E desktop e mobile) |

---

## 🗂️ Arquitetura

```
src/
├── app/
│   ├── (auth)/          # login e cadastro
│   ├── (app)/           # área logada: painel, lançamentos, fixos, importar, orçamentos, categorias
│   └── api/anexos/      # serve comprovantes apenas para o dono
├── components/          # UI compartilhada (cards, badges, tabela de lançamentos, formulários)
├── server/
│   ├── auth.ts          # Data Access Layer: o userId vem sempre da sessão
│   ├── services/        # regras de negócio
│   ├── repositories/    # acesso ao Prisma, sempre filtrado por userId
│   └── integrations/    # NFC-e, foto com IA, extratos OFX/CSV
└── lib/                 # funções puras: dinheiro, datas, recorrência, fluxo de caixa, validação
```

**Fluxo de uma mutação:** `página → server action → service → repository → Prisma`

**Pipeline de importação:** `fonte → parser → rascunho → detecção de duplicados → tela de revisão → confirmação → salvar`

### Princípios

- 💵 **Dinheiro em centavos inteiros**, sem ponto flutuante. A formatação em BRL acontece só na tela.
- 🕐 **Datas em UTC**, com meses e agrupamentos no fuso `America/Sao_Paulo`.
- 🔒 **Isolamento por usuário em toda leitura e escrita**, coberto por testes de integração.
- 🛡️ **Privacidade:** nada de analytics ou bancos em nuvem. Na versão completa, só saem da máquina as fotos de cupom (para a Claude API) e a URL do QR Code (para a SEFAZ). No site online, os dados só saem criptografados, para o Gist da própria pessoa.

Detalhes, padrões de código e regras do projeto: veja o [CLAUDE.md](./CLAUDE.md).

---

## 🎨 Design system

A interface segue o **Sovereign Financial** ([`Design-google/sovereign_financial/DESIGN.md`](./Design-google/sovereign_financial/DESIGN.md)), um minimalismo preciso com toques de fintech:

- **Cores:** verde-azulado profundo nas ações, verde-esmeralda para fluxo positivo e rosa para déficits e alertas.
- **Tipografia:** Plus Jakarta Sans nos títulos e números de destaque e Inter no corpo, com algarismos tabulares nos valores.
- **Superfícies:** painéis brancos com bordas finas, cabeçalho translúcido e cantos de 16px nos cards.
- **Layout:** menu lateral de 260px no desktop, dock de ícones no tablet e barra inferior com botão de ação no celular.

Todas as cores são tokens CSS, então os temas claro e escuro trocam a paleta inteira sem duplicar estilos.

---

## 🧪 Testes e qualidade

```bash
npm run typecheck                 # TypeScript
npm run lint                      # ESLint
npm test                          # unidade + integração (usa prisma/test.db)
npx playwright install chromium   # uma vez
npm run test:e2e                  # E2E desktop e mobile (usa prisma/e2e.db)
```

Os testes cobrem os parsers de NFC-e, OFX, CSV e da resposta da IA, os cálculos de dinheiro, datas, recorrência e fluxo de caixa, e o isolamento entre usuários. Os bancos de teste são separados do seu banco real.

### Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run db:migrate -- --name <descricao>` | Cria e aplica uma migration |
| `npm run db:generate` | Regenera o Prisma Client |
| `npm run db:studio` | Abre o Prisma Studio para inspecionar o banco |

---

<div align="center">

Feito com ☕ e TypeScript por [Gabriel Santos](https://github.com/gabrielmacsantos)

</div>
