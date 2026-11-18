import { expect, fitsWidth, startLocal, test } from "./support";

test("the example data fills the Painel and it fits the screen", async ({ page }) => {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();

  for (const name of ["Fluxo de caixa", "Distribuição de gastos", "Últimos lançamentos"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: /Bem-vindo/ })).toHaveCount(0);
  expect(await fitsWidth(page)).toBe(true);
});

test("the month arrows change the month in the address and the page title keeps the section", async ({ page }) => {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
  const group = page.getByRole("group", { name: "Mês" });
  const before = await group.getByRole("button").textContent();
  await group.getByRole("link", { name: /^Mês anterior/ }).click();
  await expect(page).toHaveURL(/mes=\d{4}-\d{2}/);
  await expect(group.getByRole("button")).not.toHaveText(before!);
  await expect(page).toHaveTitle(/Painel · Minhas Finanças/);
  // The chosen month travels to the other tabs.
  await page.getByRole("link", { name: /Lançamentos/ }).first().click();
  await expect(page).toHaveURL(/#\/lancamentos\?mes=\d{4}-\d{2}/);
});

test("'Ocultar valores' masks the amounts and 'Tema escuro' switches the theme", async ({ page }, testInfo) => {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
  await expect(page.locator("main")).not.toContainText("R$ •••••");

  const eye = page.getByRole("button", { name: "Ocultar valores" });
  await eye.click();
  await expect(eye).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main").getByText("R$ •••••").first()).toBeVisible();
  await eye.click();
  await expect(page.locator("main")).not.toContainText("R$ •••••");

  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  if (testInfo.project.name === "site-mobile") {
    // Below 768px the theme control lives in the menu drawer, not in the header.
    await page.locator('[data-act="menu"]').click();
    await page.locator(".drawer-theme").click();
  } else {
    await page.getByRole("button", { name: "Tema escuro" }).click();
  }
  await expect(html).not.toHaveAttribute("data-theme", before ?? "");
  expect(await fitsWidth(page)).toBe(true);
});
