// Takes the screenshots used by the README: the current site (index.html) with the example data, in both themes,
// on a desktop and on a phone. Nothing leaves the machine: the site is served locally and external requests are blocked.
// Usage: npm run docs:screenshots      (needs: npx playwright install chromium)
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, devices } from "@playwright/test";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "docs", "screenshots");
const PORT = 3310;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, [join(ROOT, "scripts", "serve-site.mjs"), String(PORT)], { stdio: "ignore" });
await new Promise((ok) => setTimeout(ok, 800));

const browser = await chromium.launch();
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const PHONE = { ...devices["Pixel 7"], deviceScaleFactor: 1.5 };
// The BETA countdown is temporary: it must not appear in pictures that stay in the README.
const HIDE_BETA = "#beta-banner { display: none !important; } :root { --beta-h: 0px !important; }";

async function context(options, { theme = "dark", tourDone = true } = {}) {
  const ctx = await browser.newContext({ ...options, locale: "pt-BR", timezoneId: "America/Sao_Paulo", colorScheme: theme });
  await ctx.route((url) => url.protocol.startsWith("http") && url.hostname !== "localhost", (route) => route.abort());
  await ctx.addInitScript(([t, done]) => {
    try { localStorage.setItem("mf-theme", t); if (done) localStorage.setItem("mf-tour-done:local", "1"); } catch {}
  }, [theme, tourDone]);
  return ctx;
}
async function open(ctx, { demo = true } = {}) {
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await page.addStyleTag({ content: HIDE_BETA });
  await page.getByRole("button", { name: /Usar sem conta/ }).click();
  if (demo) await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: HIDE_BETA });
  return page;
}
const go = async (page, path) => { await page.evaluate((h) => { location.hash = h; }, `#/${path}`); await page.waitForTimeout(1300); await page.evaluate(() => window.scrollTo(0, 0)); };
// Toasts and the floating balloon are noise in a still picture.
const clean = (page) => page.addStyleTag({ content: "#toast-region { display: none !important; }" });
const shot = async (page, name, opts = {}) => { await page.waitForTimeout(350); await page.screenshot({ path: join(OUT, `${name}.png`), ...opts }); console.log("•", name); };

try {
  // ---- Desktop, dark ----
  let ctx = await context(DESKTOP, { theme: "dark" });
  let page = await open(ctx); await clean(page);
  await shot(page, "painel-desktop-escuro");
  await page.locator(".audit").scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
  await page.locator(".audit").screenshot({ path: join(OUT, "auditoria-desktop-escuro.png") }); console.log("• auditoria-desktop-escuro");
  await go(page, "lancamentos"); await shot(page, "lancamentos-desktop-escuro");
  await go(page, "fixos"); await shot(page, "fixos-desktop-escuro");
  await go(page, "orcamentos"); await shot(page, "orcamentos-desktop-escuro");
  await go(page, "viagens"); await shot(page, "viagens-desktop-escuro");
  await ctx.close();

  // ---- Desktop, light ----
  ctx = await context(DESKTOP, { theme: "light" });
  page = await open(ctx); await clean(page);
  await shot(page, "painel-desktop-claro");
  await go(page, "lancamentos"); await shot(page, "lancamentos-desktop-claro");
  await ctx.close();

  // ---- Phone, dark ----
  ctx = await context(PHONE, { theme: "dark" });
  page = await open(ctx); await clean(page);
  await shot(page, "painel-celular-escuro");
  await page.locator(".audit").scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
  await page.locator(".audit").screenshot({ path: join(OUT, "auditoria-celular-escuro.png") }); console.log("• auditoria-celular-escuro");
  await go(page, "lancamentos"); await shot(page, "lancamentos-celular-escuro");
  await go(page, "orcamentos"); await shot(page, "orcamentos-celular-escuro");
  // Quick assistant: the chat with an entry written in a sentence, then the calculator.
  await go(page, "painel");
  await page.getByRole("button", { name: /Atalhos rápidos/ }).click();
  await page.getByRole("button", { name: /Chat de lançamentos/ }).click();
  const chat = page.getByRole("dialog", { name: "Chat de lançamentos" });
  await chat.getByLabel("Escreva o lançamento").fill("gastei 45,90 no almoço hoje");
  await chat.getByRole("button", { name: "Enviar" }).click();
  await page.waitForTimeout(900);
  await shot(page, "chat-celular-escuro");
  await page.getByRole("button", { name: "Voltar ao menu" }).click();
  await page.getByRole("button", { name: /Calculadora/ }).click();
  for (const k of ["1", "2", "0", "Mais", "4", "5", "Igual"]) await page.getByRole("dialog", { name: "Calculadora" }).getByRole("button", { name: k, exact: /^\d$/.test(k) }).click();
  await shot(page, "calculadora-celular-escuro");
  await ctx.close();

  // ---- Phone: sign-in, new entry with the voice assistant, and the tutorial (no example data, as a new person sees them) ----
  ctx = await context(PHONE, { theme: "dark" });
  page = await ctx.newPage(); await page.goto(BASE + "/"); await page.addStyleTag({ content: HIDE_BETA }); await page.waitForTimeout(900);
  await shot(page, "entrada-celular-escuro");
  await page.getByRole("button", { name: /Usar sem conta/ }).click(); await page.waitForTimeout(900);
  await page.locator('.bottomnav .fab').click();
  await page.waitForTimeout(900);
  await shot(page, "novo-gasto-celular-escuro");
  await ctx.close();

  ctx = await context(PHONE, { theme: "dark", tourDone: false });
  page = await ctx.newPage(); await page.goto(BASE + "/"); await page.addStyleTag({ content: HIDE_BETA });
  await page.getByRole("button", { name: /Usar sem conta/ }).click();
  await page.locator("#tour-card").getByRole("button", { name: "Começar tour" }).click();
  await page.waitForTimeout(1600);
  await shot(page, "tutorial-celular-escuro");
  await ctx.close();

  // ---- Phone, light ----
  ctx = await context(PHONE, { theme: "light" });
  page = await open(ctx); await clean(page);
  await shot(page, "painel-celular-claro");
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
