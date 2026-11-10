# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Documento de contexto do projeto. Vale para qualquer IA ou dev que trabalhe aqui. Atualize-o quando uma decisão mudar.

@AGENTS.md

---

## 1. Visão geral

**Sistema de gestão de finanças pessoais**, web e responsivo (mobile-first), que roda localmente.

- **Multiusuário com dados isolados:** cada usuário tem login próprio e vê **apenas os próprios dados**. Não há compartilhamento entre contas.
- **Idioma e região:** interface em pt-BR, moeda BRL, fuso `America/Sao_Paulo`.

### Funcionalidades

| Módulo | Rota | O que faz |
|---|---|---|
| **Painel** | `/dashboard` | Resumo do mês (receitas, despesas, saldo, previsto), alertas de orçamento, despesas por categoria, receitas × despesas dos últimos 6 meses e pendências. |
| **Lançamentos** | `/lancamentos` | Despesas e receitas avulsas, com filtros por mês, tipo e categoria. Marcar como pago/pendente. |
| **Gastos fixos** | `/fixos` | Despesas e receitas recorrentes, que geram um lançamento pendente por mês. |
| **Importar** | `/importar` | QR Code da NFC-e, foto de cupom/recibo (Claude API) e extrato OFX/CSV. Tudo passa pela tela de revisão. |
| **Orçamentos e metas** | `/orcamentos` | Limite mensal por categoria, com alerta a partir de 80%, e metas de economia. |
| **Categorias** | `/categorias` | Categorias de despesa e receita (cada conta nova recebe um conjunto padrão). |

**Versão online simples (`index.html` na raiz):** um único arquivo HTML/JS publicado no GitHub Pages (https://gabrielmacsantos.github.io/sistema_gestao/), sem servidor. Cobre painel, lançamentos, fixos, orçamentos, metas, categorias, importação OFX/CSV e de notificações do banco (com revisão) e backup em JSON. Não tem NFC-e nem foto com IA. Segue o mesmo design system e as mesmas regras de dinheiro em centavos. Ao mudar uma regra de negócio, avalie se ela também vale para o `index.html`.
- **Contas:** telas `#/entrar` e `#/cadastro`. O cadastro pede um token do GitHub (escopo `gist`) e uma senha (mínimo de 10 caracteres) e cria, na conta da pessoa, um Gist **público** com o arquivo `minhas-financas.json`: `{ state, token }` criptografados com AES-256-GCM e chave PBKDF2-SHA256 (310 mil iterações) derivada da senha. O login usa só usuário + senha: lista os gists públicos do usuário, decifra e recupera o token. O repositório é público, então os dados nunca vão para ele. A senha não é guardada; no aparelho ficam o token e a chave derivada (`localStorage`) até "Sair", que envia o pendente e limpa tudo.
- **Viagens:** aba `#/viagens` (lista) e `#/viagens?id=` (detalhe). `state.trips` tem `{ name, destination, startDate, endDate, budgetCents, includeInMain }`, e `Transaction.tripId` liga o lançamento à viagem. `inMain(t)` decide se o lançamento entra na gestão do mês: é aplicado no índice mensal (`ofMonth`), então Painel, Lançamentos e Orçamentos ignoram as viagens com `includeInMain: false`. O Painel mostra quanto ficou separado. Excluir uma viagem permite apagar os gastos dela ou devolvê-los para a gestão.
- **Comprovantes (fotos):** campo "Anexar comprovante" no lançamento (`accept="image/*"`, câmera ou galeria). A foto é reduzida para no máximo 1600px em JPEG, guardada no IndexedDB (`minhas-financas` / `photos`) e, com conta, cifrada com a mesma chave AES-GCM e enviada como `<id>.bin` para um segundo Gist (`state.photosGistId`); `Transaction.attachmentId` aponta para ela. Outros aparelhos baixam pela URL raw só ao abrir. "Sair" envia as fotos pendentes e limpa o IndexedDB. Sem leitura automática no site (sem servidor para a IA).
- **Notificações do banco:** um site não lê notificações de outros apps, então elas chegam coladas em "Importar" ou por `#/notificacao?t=<texto>`, aberto por um app de automação no celular (MacroDroid no Android, Atalhos/Apple Pay no iPhone; guia no README). `captureIncoming` guarda o texto no `sessionStorage` e apaga o hash; `flushIncoming` espera o login, faz `pullIfNewer()` **antes** de gravar (para não sobrescrever outro aparelho) e põe as notificações em `state.inbox` (`{ id, text, date, at }`). `parseBankNotification`/`splitNotifications` (bloco `// <notification-parser>`, testado em `tests/notification-parser.test.ts`) usam o vocabulário comum dos bancos, não um layout por banco. `kind: "IGNORE"` (saldo, fatura a vencer, agendamento, código) nem entra na fila. Carteiras digitais (Google Wallet, Samsung Wallet) entram pelo mesmo caminho: `WALLET` reconhece "R$ X com Visa •••• 1234" como gasto, e a loja sai do título, antes ou depois do valor. Tudo vai para a tela de revisão (`notificationDrafts`): mesmo valor e tipo a até 1 dia de outro lançamento **ou de outra notificação da mesma revisão** (a carteira e o banco avisam a mesma compra) vira "possível duplicado" e já vem desmarcado, e pagamento de fatura também (repetiria as compras do cartão). Confirmar a revisão tira da fila também as notificações desmarcadas. Lançamentos: `source: "NOTIFICATION"`, `externalId: notif:<hash(texto normalizado|data)>`.
- **Lançamento por voz:** botão "Falar o lançamento" no formulário de novo lançamento, só quando o navegador tem `SpeechRecognition` (o Firefox não tem). O reconhecimento é do navegador, que envia o áudio ao Google/Apple; isso é avisado antes do primeiro uso (`localStorage` `mf-voice-ok`). `parseSpokenTransaction` (bloco `// <voice-parser>`, autocontido e testado em `tests/voice-parser.test.ts`) converte o texto em tipo, descrição, centavos, data, categoria e situação. Ele **só preenche o formulário**; quem salva é o usuário.
- **Sem conta:** "Usar sem conta" guarda os dados só no navegador (`minhas-financas:local`); criar conta depois leva esses dados junto.
- **Sincronização:** salvamento automático depois de cada alteração; ao abrir ou voltar para a aba, vale a versão com `savedAt` mais recente.

**Regra de ouro dos dados automáticos:** dados vindos de NFC-e, foto ou extrato **sempre** passam por uma tela de revisão. O usuário confirma ou corrige antes de qualquer lançamento ser salvo.

---

## 2. Stack

A versão completa roda localmente com Node.js. Não depende de Docker nem de banco ou serviço em nuvem, exceto a Claude API para fotos. A versão simples (`index.html`) é estática e fica no GitHub Pages.

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (`strict`) |
| UI | **Tailwind CSS 4** + componentes próprios em `src/components/ui` + ícones `lucide-react`. Design system "Sovereign Financial" (`Design-google/`), com tokens em `globals.css` e fontes Plus Jakarta Sans/Inter via `next/font` |
| Banco | **SQLite** via **Prisma 7** com driver adapter `@prisma/adapter-better-sqlite3` (arquivo `prisma/dev.db`) |
| Autenticação | Sessão própria em cookie criptografado com **iron-session** + senhas com **bcryptjs** |
| Validação | **Zod 4** (`src/lib/validation.ts`), compartilhado entre formulários e servidor |
| Formulários | Server Actions + `useActionState` (sem biblioteca de formulário) |
| Gráficos | HTML/CSS puro, renderizado no servidor (sem biblioteca de gráficos) |
| NFC-e | `jsqr` no navegador (câmera ou foto) + `cheerio` no servidor para ler a página da SEFAZ |
| IA para fotos | `@anthropic-ai/sdk`: `beta.messages.parse` com saída estruturada (Zod), modelo definido em `ANTHROPIC_MODEL` (padrão `claude-opus-5-5`) |
| Extratos | Parser próprio de OFX + `papaparse` para CSV |
| Testes | **Vitest** (unidade e integração com SQLite) + **Playwright** (E2E desktop e mobile) |

### Comandos

```bash
npm install                 # instala dependências e gera o Prisma Client (postinstall)
npm run dev                 # http://localhost:3000 (no celular, use o IP da máquina na rede)
npm run build && npm start  # build de produção local
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npm test                    # Vitest (unidade + integração)
npx vitest run src/lib/money.test.ts     # um único arquivo
npx vitest run -t "parses"               # testes pelo nome
npm run test:e2e            # Playwright (precisa de: npx playwright install chromium)
npm run db:migrate -- --name <descricao> # cria e aplica uma migration
npm run db:generate         # regenera o Prisma Client (o migrate dev do Prisma 7 não faz isso sozinho)
npm run db:studio           # inspeciona o banco
```

### Variáveis de ambiente (`.env`, nunca versionado; mantenha `.env.example` atualizado)

- `DATABASE_URL="file:./prisma/dev.db"`: caminho relativo à raiz do projeto
- `SESSION_SECRET`: 32 caracteres ou mais
- `ANTHROPIC_API_KEY`: opcional; sem ela a aba de foto mostra como configurar
- `ANTHROPIC_MODEL`: modelo de visão para fotos
- `COOKIE_SECURE=true`: só se o app for servido em HTTPS (por padrão fica desligado para funcionar via HTTP na rede local)

---

## 3. Arquitetura

```
src/
  app/
    (auth)/             # login, cadastro e as actions de sessão
    (app)/              # área logada: o layout chama getCurrentUser(); cada rota tem page.tsx + actions.ts
    api/anexos/         # serve fotos de comprovante só para o dono
  proxy.ts              # (era "middleware" antes do Next 16) redireciona quem não tem cookie; não é autorização
  server/
    auth.ts             # Data Access Layer: getCurrentUser() / requireUserId()
    session.ts, db.ts, storage.ts, errors.ts, actions.ts (runAction)
    services/           # regra de negócio
    repositories/       # acesso ao Prisma, todas as funções recebem userId
    integrations/
      nfce/             # qrcode.ts (chave e QR), parsers/ por layout, draft.ts (puro), index.ts (fetch)
      receipt-ai/       # normalize.ts (puro, testável) + extract.ts (chamada à Claude API)
      bank-import/      # ofx.ts, csv.ts, decodificação Windows-1252
  lib/                  # puro (cliente e servidor): money, dates, recurrence, validation, constants
  generated/prisma/     # Prisma Client gerado (fora do git)
prisma/                 # schema.prisma, migrations/, dev.db (fora do git)
storage/                # legado: fotos antigas, antes de irem para o banco (fora do git)
index.html              # versão simples, estática, publicada no GitHub Pages
tests/                  # testes de integração, fixtures e e2e/
```

### Decisões que atravessam vários arquivos

- **Isolamento multiusuário:** o `userId` vem **sempre** de `requireUserId()`/`getCurrentUser()` (sessão no servidor), nunca do cliente. Repositories filtram por `userId` em toda leitura e escrita (`updateMany`/`deleteMany` com `{ id, userId }`). IDs vindos do cliente que apontam para outra entidade (categoria, anexo) passam por `assertCategory`/`isOwnUpload`. Isso é coberto por `tests/services.test.ts`.
- **Dinheiro:** inteiros em centavos (`amountCents`, `...Cents`). `parseMoneyToCents` converte texto ("1.234,56", "1234.56") sem aritmética de ponto flutuante. A formatação acontece só na UI (`formatBRL`).
- **Datas:** salvas em UTC. Uma data de calendário vira meia-noite de São Paulo (`parseDateInput`). Meses são strings `"YYYY-MM"`, e intervalos e agrupamentos usam `lib/dates.ts` com o fuso de São Paulo.
- **Gastos fixos:** `Recurring` é um modelo. `ensureOccurrences(userId)` (chamado ao abrir painel, lançamentos e orçamentos) cria as `Transaction`s `PENDING` até o mês atual, com `@@unique([recurringId, period])`. Meses futuros nunca são gravados: aparecem só como projeção em `monthSummary`. Por isso editar um modelo afeta só o que ainda não foi gerado. Excluir uma ocorrência gerada a transforma em `SKIPPED` (lápide, sempre escondida) para ela não ser recriada. Nada é gerado antes do mês em que o modelo foi criado.
- **Pipeline de importação:** `fonte → parser → TransactionDraft (formato único) → markDuplicates → DraftReview (UI única) → confirmImportAction → confirmDrafts`. O servidor revalida tudo com `confirmedDraftSchema`.
- **Deduplicação:** `@@unique([userId, source, externalId])`. O `externalId` é a chave de acesso da NFC-e, `ofx:<conta>:<FITID>` ou `csv:<hash de data|valor|descrição|nº da ocorrência>`. Uma colisão (P2002) conta como "ignorado".
- **NFC-e:** o QR traz chave (UF, CNPJ, mês), e os QR offline trazem também dia e valor. A página da SEFAZ só é buscada em hosts `*.gov.br`. `parseStandardPortal` cobre o layout comum dos portais. Uma UF com layout diferente ganha um parser em `parsers/` e entra em `PARSERS_BY_UF` (`draft.ts`), sempre com um HTML de fixture anonimizado em `tests/fixtures/`. Se a leitura falhar, o rascunho usa os dados do QR e mostra avisos. **O fixture atual é sintético**: valide com cupons reais de cada UF.
- **IA de fotos:** só no servidor. A foto é reduzida no navegador (máximo de 1600px, JPEG) e salva como comprovante na tabela `Upload`. `Transaction.attachment` guarda o caminho `<userId>/<uuid>.jpg`, que é o id do `Upload`; arquivos antigos em `storage/` ainda são lidos. A resposta é validada por Zod (`receiptSchema`) e convertida por `toDraft`, que avisa em vez de inventar. Usa `effort: "low"` e `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`).
- **Mutações:** Server Actions em `actions.ts` de cada rota. `runAction()` converte `DomainError` em mensagem e chama `revalidatePath("/", "layout")`. Em erro de validação, a action devolve `values` para o formulário ser preenchido de novo (o React 19 reseta o formulário depois da action).
- **Next 16:** `cacheComponents` está **desligado** de propósito (todas as páginas logadas são dinâmicas). `params`/`searchParams` são Promises. Consulte `node_modules/next/dist/docs/` antes de usar uma API do Next.

---

## 4. Padrões de código

- **Idioma:** código (variáveis, funções, tabelas, commits) em **inglês**. Textos para o usuário e URLs em **pt-BR**.
- **Nomes:** componentes em `PascalCase`, funções e variáveis em `camelCase`, arquivos em `kebab-case`, modelos Prisma no singular em `PascalCase`.
- **TypeScript estrito:** sem `any` (use `unknown` + Zod). Tipos derivados dos schemas Zod e do Prisma, sem duplicar definições.
- **Camadas:** página/componente → server action → service → repository → Prisma. Páginas podem ler direto de repositories (só leitura, sempre com `userId`). Regra de negócio fica nos services. Arquivos em `src/server` começam com `import "server-only"`, exceto os módulos puros testáveis (parsers, `normalize.ts`, `draft.ts`).
- **Server Components por padrão.** Use `"use client"` só quando houver interatividade.
- **Validação dupla:** o mesmo schema Zod no servidor. No cliente, apenas UX.
- **Responsivo:** projete primeiro para ~360px. Barra de navegação inferior no celular e menu lateral a partir de `md`. Inputs com `inputMode` adequado.
- **Gráficos:** cores de série em tokens CSS (`--chart-*` em `globals.css`), validadas para daltonismo em modo claro e escuro. Sempre com legenda e uma tabela `sr-only`.
- **Design system:** siga `Design-google/sovereign_financial/DESIGN.md`. Use os tokens (`bg-surface-container-lowest`, `text-on-surface`, `text-secondary`, `border-hairline`, `text-success`/`warning`/`danger`...) e a escala tipográfica (`text-headline-lg`, `text-body-md`, `text-label-sm`, `text-numeric-data`...), nunca cores fixas do Tailwind (`slate-*`, `emerald-*`). O tema escuro troca os tokens via `data-theme` em `<html>`, então não é preciso `dark:` para cores. `cn()` usa tailwind-merge: um `className` passado a um componente sobrescreve o padrão.
- **Testes obrigatórios para:** parsers (NFC-e por UF, OFX, CSV, resposta da IA), cálculos de dinheiro, datas, saldo, orçamento e recorrência, e isolamento entre usuários. Testes de integração usam `prisma/test.db` (recriado a cada execução), e o E2E usa `prisma/e2e.db`.
- **Migrations:** toda mudança de schema gera uma migration nova via `npm run db:migrate -- --name <descricao>`, seguida de `npm run db:generate`.
- **Erros:** mensagens em pt-BR via `DomainError`. Detalhes técnicos só no log do servidor.

---

## 5. O que a IA NUNCA deve fazer aqui

1. **Nunca** consultar ou alterar dados sem filtrar por `userId` vindo da sessão, nem aceitar `userId` enviado pelo cliente.
2. **Nunca** usar `float`/`number` decimal para dinheiro. Sempre inteiros em centavos.
3. **Nunca** salvar um lançamento vindo de NFC-e, foto ou extrato sem a confirmação do usuário na tela de revisão.
4. **Nunca** expor `ANTHROPIC_API_KEY`, `SESSION_SECRET` ou outro segredo ao navegador (nada de `NEXT_PUBLIC_` para segredos, nenhuma chamada à IA a partir do cliente).
5. **Nunca** versionar `.env`, `prisma/*.db` ou `storage/`, nem colocar chaves e dados reais em código, testes ou fixtures (anonimize CPF, CNPJ e nomes).
6. **Nunca** apagar ou resetar `prisma/dev.db` (`prisma migrate reset`, deletar o arquivo), nem editar migrations já aplicadas, sem autorização explícita. Os bancos de teste (`test.db`, `e2e.db`) podem ser recriados.
7. **Nunca** enviar dados do usuário a serviços externos além da Claude API (só fotos de cupom), das páginas públicas da SEFAZ (só a URL do QR Code) e, no `index.html`, do Gist do próprio usuário (só criptografado e só se ele conectar) e do reconhecimento de voz do navegador (só o áudio do lançamento falado, com aviso antes do primeiro uso). Nada de analytics, CDNs de tracking ou bancos em nuvem.
8. **Nunca** adicionar dependência que obrigue Docker, um serviço pago extra ou infraestrutura externa. O projeto precisa rodar com `npm install && npm run dev`.
9. **Nunca** registrar em log o conteúdo de notas, fotos, extratos, senhas ou tokens.
10. **Nunca** colocar regra de negócio em componentes de UI ou fazer escrita no Prisma fora da camada de repositories.
11. **Nunca** alterar ocorrências passadas ao editar um gasto fixo, nem duplicar lançamentos já importados.
12. **Nunca** desativar o TypeScript estrito, o lint ou os testes (`@ts-ignore`, `eslint-disable`, `.skip`) para "fazer passar".
