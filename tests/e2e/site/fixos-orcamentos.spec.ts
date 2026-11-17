import { expect, startLocal, test, typeAmount } from "./support";

test("a fixed expense appears in Gastos fixos and generates a pending transaction this month", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/fixos");
  await expect(page.getByText("Nenhum gasto fixo cadastrado.")).toBeVisible();

  await page.getByRole("button", { name: /Novo fixo/ }).click();
  const dialog = page.getByRole("dialog", { name: "Novo gasto fixo" });
  await dialog.getByLabel("Descrição").fill("Aluguel E2E");
  await typeAmount(page, "150000");
  await dialog.getByLabel("Dia do vencimento").fill("10");
  await dialog.getByRole("button", { name: /Salvar/ }).click();

  const row = page.locator(".ledger li", { hasText: "Aluguel E2E" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("1.500,00");
  await expect(row).toContainText("sem fim");

  // The model generates this month's occurrence, still pending.
  await page.goto("/#/lancamentos");
  const occurrence = page.locator("#tx-ledger li", { hasText: "Aluguel E2E" });
  await expect(occurrence).toBeVisible();
  await expect(occurrence.getByRole("button", { name: "Marcar como pago" })).toBeVisible();
  await expect(occurrence).toContainText("Gasto fixo");
});

test("sets a monthly limit and a savings goal", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/orcamentos");
  await expect(page.getByText("Nenhum limite definido.")).toBeVisible();
  await expect(page.getByText(/Nenhuma meta ainda/)).toBeVisible();

  await page.getByRole("button", { name: /Definir limite/ }).click();
  const budget = page.getByRole("dialog", { name: "Definir limite mensal" });
  const category = await budget.getByLabel("Categoria").evaluate((el: HTMLSelectElement) => el.selectedOptions[0].textContent);
  await budget.getByLabel("Limite mensal").pressSequentially("50000");
  await budget.getByRole("button", { name: /Salvar/ }).click();
  const meter = page.getByRole("meter", { name: category! });
  await expect(meter).toBeVisible();
  await expect(page.getByText(/500,00/).first()).toBeVisible();

  await page.getByRole("button", { name: /Nova meta/ }).click();
  const goal = page.getByRole("dialog");
  await goal.getByLabel("Nome da meta").fill("Reserva E2E");
  await goal.getByLabel("Valor alvo").pressSequentially("1000000");
  await goal.getByRole("button", { name: /Salvar/ }).click();
  const saved = page.locator("li", { hasText: "Reserva E2E" });
  await expect(saved).toBeVisible();
  await expect(saved).toContainText("10.000,00");
});

test("creates a category and finds it in the transaction form", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/categorias");
  await page.getByRole("button", { name: /Nova/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Pets E2E");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.locator(".ledger li", { hasText: "Pets E2E" })).toBeVisible();

  await page.goto("/#/lancamentos");
  await page.locator('.bottomnav .fab:visible, .topbar [data-act="new-tx"]:visible').first().click();
  await expect(page.getByRole("dialog").getByLabel("Categoria").locator("option", { hasText: "Pets E2E" })).toHaveCount(1);
});
