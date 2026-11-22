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
  await card.getByRole("button", { name: "Próximo", exact: true }).click();
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

test("percorre todos os passos, de tela em tela, até Concluir", async ({ page }) => {
  test.setTimeout(240_000);
  await openFresh(page);
  const card = page.locator("#tour-card");
  await card.getByRole("button", { name: "Começar tour" }).click();
  const vp = page.viewportSize();
  if (!vp) throw new Error("no viewport");
  const seenPaths = new Set<string>();
  let steps = 0;
  for (let guard = 0; guard < 60; guard++) {
    await expect(card).toContainText(/Passo \d+ de \d+/);
    const label = (await card.locator(".metric-label").textContent()) ?? "";
    const [n, total] = (label.match(/\d+/g) ?? []).map(Number);
    expect(total).toBeGreaterThanOrEqual(20);
    steps++;
    seenPaths.add(new URL(page.url()).hash.split("?")[0]);
    // Let the smooth scroll settle, then the card must be fully on the screen with 44px buttons.
    let last = "";
    await expect.poll(async () => { const now = JSON.stringify(await card.boundingBox()); const still = now === last; last = now; return still; }, { timeout: 6000, intervals: [150] }).toBe(true);
    const box = await card.boundingBox();
    if (!box) throw new Error("no card");
    expect(box.x, `step ${n}`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `step ${n}`).toBeLessThanOrEqual(vp.width);
    expect(box.y, `step ${n}`).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, `step ${n}`).toBeLessThanOrEqual(vp.height + 1);
    for (const name of ["Pular tutorial", "Voltar", "Próximo", "Concluir"]) {
      const b = card.getByRole("button", { name, exact: true });
      if (await b.count()) expect((await b.boundingBox())?.height ?? 0, `${name} @${n}`).toBeGreaterThanOrEqual(44);
    }
    if (n === total) break;
    await card.getByRole("button", { name: "Próximo", exact: true }).click();
    await expect(card).not.toContainText(new RegExp(`Passo ${n} de`));
  }
  expect(steps).toBeGreaterThanOrEqual(20);
  for (const h of ["#/painel", "#/lancamentos", "#/fixos", "#/orcamentos", "#/viagens", "#/categorias", "#/configuracoes", "#/backup", "#/perfil"]) expect(seenPaths, h).toContain(h);
  await card.getByRole("button", { name: "Concluir" }).click();
  await expect(page.locator("#tour")).toHaveCount(0);
  await expect(page).toHaveURL(/#\/painel/);
  expect(await page.evaluate(() => document.getElementById("app")?.inert)).toBe(false);
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(page.locator("#tour")).toHaveCount(0);
});

test("o botão Voltar retorna ao passo anterior, mesmo em outra tela", async ({ page }) => {
  await openFresh(page);
  const card = page.locator("#tour-card");
  await card.getByRole("button", { name: "Começar tour" }).click();
  await expect(card.getByRole("button", { name: "Voltar" })).toHaveCount(0);
  await card.getByRole("button", { name: "Próximo", exact: true }).click();
  await expect(card).toContainText("Passo 2 de");
  await card.getByRole("button", { name: "Voltar" }).click();
  await expect(card).toContainText("Passo 1 de");
});

test("se uma janela estiver na frente, o tour espera e abre quando ela fecha", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Usar sem conta/ }).click();
  await expect(page).toHaveURL(/#\/painel/);
  // Whatever happened first (the tour or not), a dialog now takes the screen.
  await page.locator('.bottomnav .fab:visible, .topbar [data-act="new-tx"]:visible').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator("#tour")).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  await expect(page.locator("#tour-card")).toBeVisible({ timeout: 8000 });
});

test("em 360×640 o card nunca cobre o que está destacado", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await openFresh(page);
  const card = page.locator("#tour-card");
  await card.getByRole("button", { name: "Começar tour" }).click();
  for (let n = 0; n < 8; n++) {
    await expect(card).toContainText(`Passo ${n + 1} de`);
    // The target may be docked and scrolled under the header: wait until the ring and the card stop moving.
    let last = "";
    await expect.poll(async () => {
      const [r, c] = await Promise.all([page.locator(".tour-ring").first().boundingBox(), card.boundingBox()]);
      const now = JSON.stringify([r, c]);
      const still = now === last; last = now;
      return still;
    }, { timeout: 6000, intervals: [300] }).toBe(true);
    const [ring, box] = await Promise.all([page.locator(".tour-ring").first().boundingBox(), card.boundingBox()]);
    if (!ring || !box) throw new Error("no layout");
    const overlap = Math.min(ring.y + ring.height, box.y + box.height) - Math.max(ring.y, box.y);
    expect(overlap, `step ${n + 1}: the card covers the highlighted area`).toBeLessThanOrEqual(1);
    if (n < 7) await card.getByRole("button", { name: "Próximo", exact: true }).click();
  }
});
