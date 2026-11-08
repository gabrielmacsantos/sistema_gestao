# Minhas Finanças

Sistema local de gestão de finanças pessoais: gastos fixos mensais, lançamentos avulsos, receitas,
leitura de NFC-e por QR Code, leitura de foto de cupom com IA, importação de extrato (OFX/CSV),
orçamentos por categoria e metas. Web e responsivo para celular.

## Como rodar

Requisitos: Node.js 20.19+ (testado com Node 24).

```bash
npm install
cp .env.example .env        # depois preencha SESSION_SECRET (veja o comentário no arquivo)
npx prisma migrate deploy   # cria prisma/dev.db
npm run dev
```

Abra http://localhost:3000 e crie sua conta.

**No celular:** com o computador e o celular na mesma rede, acesse `http://<IP-do-computador>:3000`.
A leitura de QR Code pela câmera ao vivo exige HTTPS (ou localhost). Pelo IP, use o botão
"Foto do QR Code", que abre a câmera do celular do mesmo jeito.

**Leitura de fotos de cupom:** defina `ANTHROPIC_API_KEY` no `.env` e reinicie o servidor. A foto
é enviada à Claude API (Anthropic) só para extrair os dados, e cada leitura tem um custo pequeno.

## Testes

```bash
npm test                          # unidade + integração (usa prisma/test.db)
npx playwright install chromium   # uma vez
npm run test:e2e                  # E2E desktop e mobile (usa prisma/e2e.db)
```

Arquitetura, padrões e regras do projeto: veja [CLAUDE.md](./CLAUDE.md).
