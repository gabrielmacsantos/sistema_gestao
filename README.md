<div align="center">

# 💰 Minhas Finanças

**Gestão de finanças pessoais com controle total do fluxo de caixa: gastos fixos, lançamentos, notas fiscais, extratos e orçamentos, num só lugar.**

### 👉 [Abrir o Minhas Finanças](https://gabrielmacsantos.github.io/sistema_gestao/)

**Não precisa instalar nem criar conta:** abra o link no celular ou no computador e comece a usar. Os dados ficam salvos no seu próprio navegador.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)

<br/>

<img src="docs/screenshots/dashboard-light.png" alt="Painel do Minhas Finanças no tema claro" width="100%"/>

</div>

---

## ✨ Destaques

| | |
|---|---|
| 📊 **Painel completo** | Entradas, total gasto, fixos comprometidos, gastos variáveis e saldo livre previsto, com fluxo de caixa de 6 meses e distribuição por categoria. |
| 🔁 **Gastos fixos inteligentes** | Aluguel, contas e assinaturas geram um lançamento pendente por mês, automaticamente. Editar um fixo nunca altera o passado. |
| 🧾 **NFC-e por QR Code** | Aponte a câmera para o cupom fiscal e os itens da compra são buscados no portal da SEFAZ. |
| 📸 **Foto de cupom com IA** | Tire uma foto do recibo e a Claude API extrai estabelecimento, data, valor e itens. |
| 🏦 **Extrato OFX/CSV** | Importe o extrato do banco sem duplicar o que já foi importado. |
| ✅ **Revisão obrigatória** | Nada vindo de NFC-e, foto ou extrato é salvo sem você conferir e confirmar. |
| 🎯 **Orçamentos e metas** | Limite mensal por categoria com alerta a partir de 80%, e metas de economia. |
| 🌗 **Tema claro e escuro** | Segue o sistema ou a sua escolha, sem piscar ao carregar. |
| 👥 **Multiusuário isolado** | Cada conta vê apenas os próprios dados, com o isolamento garantido no servidor e coberto por testes. |

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

## 🌐 Usando online (mais fácil)

1. Abra **https://gabrielmacsantos.github.io/sistema_gestao/**
2. Clique em **"Ver com dados de exemplo"** para conhecer, ou já lance seu salário e seus gastos fixos.
3. No celular, use *"Adicionar à tela inicial"* do navegador para abrir como um app.

**O que funciona online:** painel, lançamentos, gastos fixos automáticos, orçamentos, metas, categorias, importação de extrato OFX/CSV e tema escuro.

**Bom saber:**
- 🔒 Seus dados ficam **só no navegador** em que você usa. Nada é enviado para servidor nenhum.
- 💾 Celular e computador não compartilham dados. Use **Backup → Baixar backup** para guardar uma cópia ou levar para outro aparelho.
- 🧹 Limpar os dados do navegador apaga os lançamentos. Faça backups de vez em quando.
- A versão online é o arquivo [`index.html`](./index.html), publicado pelo GitHub Pages. A leitura de NFC-e por QR Code e de foto de cupom com IA existe só na versão completa, abaixo.

---

## 🚀 Versão completa (rodando no seu computador)

Tem login com várias contas, banco SQLite, leitura de NFC-e e foto de cupom com IA.

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

### ⚙️ Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Caminho do SQLite. Padrão: `file:./prisma/dev.db` |
| `SESSION_SECRET` | ✅ | 32+ caracteres. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ANTHROPIC_API_KEY` | | Ativa a leitura de fotos de cupom. Sem ela, a aba de foto mostra como configurar |
| `ANTHROPIC_MODEL` | | Modelo de visão. Padrão: `claude-opus-5-5` |
| `COOKIE_SECURE` | | `true` apenas se o app for servido em HTTPS |

### 📲 Usando no celular

Com o computador e o celular na mesma rede, acesse `http://<IP-do-computador>:3000`.

A câmera ao vivo para QR Code exige HTTPS (ou localhost). Pelo IP, use o botão **"Foto do QR Code"**, que abre a câmera do celular do mesmo jeito.

### ⚡ Produção local

```bash
npm run build
npm start
```

O build de produção é bem mais rápido que o modo de desenvolvimento.

### 🌐 Online com um comando

```bash
npm run online                 # build + servidor de produção + link público HTTPS
npm run online -- --no-build   # reaproveita o último build
npm run online -- --port=3005  # usa outra porta local (padrão: 3001)
```

O script gera o build, sobe o servidor e abre um [Cloudflare Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/), mostrando o link `https://...trycloudflare.com` no terminal. O `Ctrl+C` encerra tudo.

- Precisa do `cloudflared` instalado: `winget install --id Cloudflare.cloudflared` no Windows ou `brew install cloudflared` no macOS.
- O site continua rodando no seu computador, então só fica online enquanto o PC estiver ligado. O link muda a cada execução e pode levar até 1 minuto para abrir.
- O cadastro fica aberto para quem tiver o link. Os dados de cada conta continuam isolados.

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
- 🛡️ **Privacidade:** nada de analytics ou bancos em nuvem. Só saem da máquina as fotos de cupom (para a Claude API) e a URL do QR Code (para a SEFAZ).

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
