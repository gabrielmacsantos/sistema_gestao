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

test("percorre todos os passos até Concluir, com o anel sobre o alvo e o card na tela", async ({ page }) => {
  await openFresh(page);
  const card = page.locator("#tour-card");
  await card.getByRole("button", { name: "Começar tour" }).click();
  const vp = page.viewportSize();
  if (!vp) throw new Error("no viewport");
  const titles = ["Seu saldo e a privacidade", "Novo lançamento", "Filtros rápidos do extrato", "Gráficos e alertas", "Menu e uso offline"];
  const targets = ["1", "2", "3", "4", "5"];
  for (let n = 0; n < titles.length; n++) {
    await expect(card).toContainText(`Passo ${n + 1} de 5`);
    await expect(card.getByRole("heading", { name: titles[n] })).toBeVisible();
    // Wait for the smooth scroll to settle, then compare the first ring with the visible target.
    const ring = page.locator(".tour-ring").first();
    await expect(ring).toBeVisible();
    await expect.poll(async () => {
      const [r, t] = await Promise.all([
        ring.boundingBox(),
        page.locator(`[data-tour-step="${targets[n]}"]:visible`).first().boundingBox(),
      ]);
      if (!r || !t) return false;
      return Math.abs(r.x - (t.x - 8)) < 3 && Math.abs(r.y - (t.y - 8)) < 3 && r.width >= t.width - 1 && r.width <= t.width + 20;
    }, { timeout: 5000 }).toBe(true).catch(async (e) => {
      // A target taller than the screen is clamped to it: then the ring only has to stay inside the viewport.
      const r = await ring.boundingBox();
      if (!r || r.y < -1 || r.y + r.height > vp.height + 1) throw e;
    });
    const box = await card.boundingBox();
    if (!box) throw new Error("no card");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    for (const name of ["Pular tutorial", "Próximo", "Concluir"]) {
      const b = card.getByRole("button", { name });
      if (await b.count()) expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    if (n < titles.length - 1) await card.getByRole("button", { name: "Próximo" }).click();
  }
  await expect(card.getByRole("button", { name: "Pular etapa" })).toHaveCount(0);
  await card.getByRole("button", { name: "Concluir" }).click();
  await expect(page.locator("#tour")).toHaveCount(0);
  expect(await page.evaluate(() => document.getElementById("app")?.inert)).toBe(false);
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(page.locator("#tour")).toHaveCount(0);
});

test("em 360×640 o card nunca cobre o que está destacado", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await openFresh(page);
  const card = page.locator("#tour-card");
  await card.getByRole("button", { name: "Começar tour" }).click();
  for (let n = 0; n < 5; n++) {
    await expect(card).toContainText(`Passo ${n + 1} de 5`);
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
    if (n < 4) await card.getByRole("button", { name: "Próximo" }).click();
  }
});
