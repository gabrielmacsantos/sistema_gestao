import { expect, fitsWidth, startLocal, test } from "./support";

test("the first screen offers Google and 'sem conta', and fits the screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Entrar · Minhas Finanças/);
  await expect(page).toHaveURL(/#\/entrar/);
  await expect(page.getByRole("heading", { name: "Minhas Finanças", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Usar sem conta/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", /privacidade/);
  expect(await fitsWidth(page)).toBe(true);
});

test("'#/cadastro' shows the same screen as '#/entrar'", async ({ page }) => {
  await page.goto("/#/cadastro");
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toBeVisible();
});

test("the theme toggle works on the login screen and is remembered", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: "Alternar tema claro/escuro" }).click();
  const chosen = await html.getAttribute("data-theme");
  expect(["light", "dark"]).toContain(chosen);
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", chosen!);
});

test("'Usar sem conta' opens the Painel with the welcome card, and a reload stays inside", async ({ page }) => {
  await startLocal(page);
  await expect(page).toHaveTitle(/Painel · Minhas Finanças/);
  await expect(page.getByRole("button", { name: /Lançar salário/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cadastrar gasto fixo/ })).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { name: /Bem-vindo ao Minhas Finanças/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toHaveCount(0);
});

test("the privacy policy page opens", async ({ page }) => {
  await page.goto("/privacidade.html");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/privacidade/i);
});
