import { expect, test } from "./support";

// First-access product tour: welcome dialog, spotlight steps, skipping, and not coming back.
test.use({ withTour: true });

async function openFresh(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Usar sem conta/ }).click();
  await expect(page).toHaveURL(/#\/painel/);
}

test("abre sozinho no primeiro acesso e percorre os passos", async ({ page }) => {
  await openFresh(page);
  const card = page.locator("#tour-card");
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { name: /Bem-vindo/ })).toBeVisible();
  await card.getByRole("button", { name: "Começar tour" }).click();
  await expect(card).toContainText(/Passo 1 de \d/);
  await expect(page.locator(".tour-ring").first()).toBeVisible();
  await card.getByRole("button", { name: "Pular etapa" }).click();
  await expect(card).toContainText(/Passo 2 de \d/);
  const box = await card.boundingBox();
  const vp = page.viewportSize();
  if (!box || !vp) throw new Error("no layout");
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
});

test("Pular tutorial encerra e não volta no próximo acesso", async ({ page }) => {
  await openFresh(page);
  await page.locator("#tour-card").getByRole("button", { name: "Pular tutorial" }).click();
  await expect(page.locator("#tour")).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(page.locator("#tour")).toHaveCount(0);
});

test("Esc encerra o tour e o Perfil permite refazer", async ({ page }) => {
  await openFresh(page);
  await expect(page.locator("#tour-card")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#tour")).toHaveCount(0);
  await page.evaluate(() => { location.hash = "#/configuracoes"; });
  await page.getByRole("button", { name: "Refazer tutorial" }).click();
  await expect(page).toHaveURL(/#\/painel/);
  await expect(page.locator("#tour-card")).toBeVisible();
});
