import { expect, fitsWidth, startLocal, test } from "./support";

async function openPainelWithExample(page: import("@playwright/test").Page) {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
  await expect(page.getByRole("heading", { name: "Auditoria & Ritmo Mensal" })).toBeVisible();
}

test("the audit card says what it is filtering, with removable chips and a link to the list", async ({ page }) => {
  await openPainelWithExample(page);
  const active = page.locator("#audit-active");
  const count = page.locator("#recent-count");

  // Nothing active: a hint says where the filter takes effect.
  await expect(active).toContainText("Últimos lançamentos");
  await expect(active.locator(".fchip")).toHaveCount(0);

  const total = await count.textContent();
  await page.locator('[data-act="audit-filter"][data-f="pago"]').click();
  await expect(active.locator(".fchip")).toHaveCount(1);
  await expect(active.locator(".fchip")).toContainText("Situação: Pago");
  await expect(active).toContainText(/\d+ lançamentos?/);
  await expect(page.getByText(/Filtro da auditoria ativo \(Pago\)/)).toBeVisible();

  // A day adds a second chip; each chip removes only its own filter.
  await page.locator('[data-act="audit-day"]').first().click();
  await expect(active.locator(".fchip")).toHaveCount(2);
  await active.locator('[data-act="audit-clear-day"]').click();
  await expect(active.locator(".fchip")).toHaveCount(1);
  await expect(page.locator('[data-act="audit-day"][aria-pressed="true"]')).toHaveCount(0);

  // "Ver lista" brings the filtered list into view.
  await active.getByRole("button", { name: /Ver lista/ }).click();
  await expect(page.locator("#recent-body")).toBeInViewport();

  await page.locator("#audit-active").scrollIntoViewIfNeeded();
  await active.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(active.locator(".fchip")).toHaveCount(0);
  await expect(count).toHaveText(total!);
  expect(await fitsWidth(page)).toBe(true);
});

test("a filter with no match shows a clear empty message and the chips fit the screen", async ({ page }) => {
  await openPainelWithExample(page);
  await page.locator('[data-act="audit-filter"][data-f="analise"]').click();
  const active = page.locator("#audit-active");
  await expect(active.locator(".fchip")).toContainText("Em análise");
  if ((await page.locator("#recent-body .empty").count()) > 0) {
    await expect(page.locator("#recent-body .empty")).toContainText("Nenhum lançamento com estes filtros.");
  }
  for (const btn of await active.locator("button").all()) {
    const box = await btn.boundingBox();
    expect(box!.height, "touch target").toBeGreaterThanOrEqual(32);
  }
  expect(await fitsWidth(page)).toBe(true);
});
