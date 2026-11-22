import type { Page } from "@playwright/test";
import { expect, fitsWidth, isPhone, startLocal, test } from "./support";

// The test version: a notice on top of every screen with the days left, and a "test ended" screen after 31/01/2027.
// The device clock is fixed per test (America/Sao_Paulo offset -03:00).

const banner = (page: Page) => page.locator("#beta-banner");
const at = (iso: string) => new Date(iso);

test("the notice sits on top of the sign-in screen with the days left", async ({ page }) => {
  await page.clock.setFixedTime(at("2026-12-12T12:00:00-03:00"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toBeVisible();
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText("O app está na versão BETA. Faltam 50 dias para a versão de teste acabar.");
  const box = (await banner(page).boundingBox())!;
  expect(box.y).toBe(0);
  expect(box.width).toBeGreaterThan(300);
  expect(await fitsWidth(page)).toBe(true);
  // The sign-in card is not hidden under it.
  const card = (await page.locator(".auth-card").boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(box.y + box.height);
});

test("the notice stays on every screen of the app and pushes the header down, not under it", async ({ page }, testInfo) => {
  await page.clock.setFixedTime(at("2026-11-22T12:00:00-03:00"));
  await startLocal(page);
  for (const screen of ["painel", "lancamentos", "fixos", "orcamentos", "configuracoes", "perfil"]) {
    await page.goto(`/#/${screen}`);
    await expect(banner(page)).toContainText("Faltam 70 dias");
    const b = (await banner(page).boundingBox())!;
    const header = (await page.locator(".topbar").boundingBox())!;
    expect(header.y, `${screen}: header starts below the notice`).toBeGreaterThanOrEqual(b.y + b.height - 1);
    if (!isPhone(testInfo)) {
      const rail = (await page.locator(".rail").boundingBox())!;
      expect(rail.y, `${screen}: side menu starts below the notice`).toBeGreaterThanOrEqual(b.y + b.height - 1);
    }
    expect(await fitsWidth(page), `${screen}: sideways scroll`).toBe(true);
  }
});

test("phone: the menu drops from right under the header, below the notice", async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), "Phone-only menu.");
  await page.clock.setFixedTime(at("2026-11-22T12:00:00-03:00"));
  await startLocal(page);
  await page.locator('[data-act="menu"]').click();
  const drawer = page.getByRole("dialog", { name: "Menu" });
  await expect(drawer).toBeVisible();
  const header = (await page.locator(".topbar").boundingBox())!;
  await expect.poll(async () => Math.round((await drawer.boundingBox())!.y)).toBeGreaterThanOrEqual(Math.round(header.y + header.height) - 1);
  // The header (hamburger) stays reachable above the open menu, and the notice above it.
  await expect(page.locator('[data-act="menu"]')).toBeVisible();
  await expect(banner(page)).toBeVisible();
});

test("the count goes down day by day, with the singular and the last day", async ({ page }) => {
  await page.clock.setFixedTime(at("2027-01-30T10:00:00-03:00"));
  await page.goto("/");
  await expect(banner(page)).toContainText("Falta 1 dia para a versão de teste acabar.");

  await page.clock.setFixedTime(at("2027-01-31T23:30:00-03:00"));
  await page.reload();
  await expect(banner(page)).toContainText("Hoje é o último dia da versão de teste (até 23h59).");
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toBeVisible(); // still open at 23:30
});

test("after 31/01/2027 the link shows the ended screen, not a 404 and not the app", async ({ page }) => {
  await page.clock.setFixedTime(at("2027-02-01T00:00:00-03:00"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A versão de teste expirou" })).toBeVisible();
  await expect(page.getByText("Logo mais o app estará nas lojas Google Play Store e Apple Store!")).toBeVisible();
  await expect(page.getByText("Obrigado por nos ajudar nesse novo ciclo.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Nexus Financy IA" })).toBeVisible();
  await expect(page).toHaveTitle(/Versão de teste encerrada/);
  await expect(banner(page)).toBeHidden();
  // Nothing of the app is reachable: no sign-in, no menu, and every address ends up here.
  await expect(page.getByRole("button", { name: /Continuar com o Google|Usar sem conta/ })).toHaveCount(0);
  await expect(page.locator(".rail, .bottomnav, .topbar")).toHaveCount(0);
  for (const hash of ["#/painel", "#/lancamentos", "#/entrar"]) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await expect(page.getByRole("heading", { name: "A versão de teste expirou" })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", /privacidade\.html$/);
  expect(await fitsWidth(page)).toBe(true);
});

test("the ended screen also catches someone who was already signed in", async ({ page }) => {
  await page.clock.setFixedTime(at("2027-02-02T09:00:00-03:00"));
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("minhas-financas:github", JSON.stringify({ provider: "google", sub: "1", email: "ana@example.com", name: "Ana", fileId: "f", token: { access: "t", expiresAt: Date.now() + 3600_000 } }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "A versão de teste expirou" })).toBeVisible();
  await expect(page.locator(".rail, .bottomnav, .topbar")).toHaveCount(0);
});

test("the privacy policy and the terms carry the logo and the contact address", async ({ page }) => {
  for (const file of ["privacidade.html", "termos.html"]) {
    await page.goto(`/${file}`);
    await expect(page.getByRole("img", { name: "Nexus Financy IA" }).first()).toBeVisible();
    await expect(page.locator("header svg")).toHaveCount(0); // the old wallet icon is gone
    const mail = page.getByRole("link", { name: "gabrielmac.dossantos@gmail.com" });
    await expect(mail).toHaveAttribute("href", "mailto:gabrielmac.dossantos@gmail.com");
    await expect(page.locator("body")).not.toContainText("github.com/gabrielmacsantos/sistema_gestao/issues");
    expect(await fitsWidth(page)).toBe(true);
  }
  await page.goto("/privacidade.html");
  await expect(page.locator("body")).toContainText("31 de janeiro de 2027");
});

test("the profile shows where to send questions and bugs", async ({ page }) => {
  await page.clock.setFixedTime(at("2026-11-22T12:00:00-03:00"));
  await startLocal(page);
  await page.goto("/#/perfil");
  await expect(page.getByRole("link", { name: "gabrielmac.dossantos@gmail.com" })).toHaveAttribute("href", "mailto:gabrielmac.dossantos@gmail.com");
});
