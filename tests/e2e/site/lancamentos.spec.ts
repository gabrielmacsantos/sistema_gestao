import { expect, fitsWidth, openNewTransaction, startLocal, test, typeAmount } from "./support";

test("adds an expense with the amount mask, sees it in Lançamentos and on the Painel", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);

  const dialog = page.getByRole("dialog", { name: "Novo gasto" });
  await dialog.getByLabel("Descrição").fill("Almoço E2E");
  await typeAmount(page, "4590");
  // The digits typed are the cents: "4590" reads 45,90.
  await expect(dialog.getByLabel("Valor", { exact: false }).first()).toHaveValue("45,90");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByText("Lançamento salvo.")).toBeVisible();

  await page.goto("/#/lancamentos");
  const row = page.locator("#tx-ledger li", { hasText: "Almoço E2E" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("45,90");
  await expect(page.locator("#tx-metrics")).toContainText("45,90");
  expect(await fitsWidth(page)).toBe(true);

  await page.goto("/#/painel");
  await expect(page.getByRole("heading", { name: "Últimos lançamentos" })).toBeVisible();
  await expect(page.getByText("Almoço E2E").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Bem-vindo/ })).toHaveCount(0);
});

test("switching between Despesa and Receita keeps the dialog and what was typed", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Novo gasto" })).toBeVisible();

  await dialog.getByLabel("Descrição").fill("Salário E2E");
  await dialog.getByRole("radio", { name: "Receita" }).click();
  await expect(dialog.getByRole("heading", { name: "Nova entrada" })).toBeVisible();
  await expect(dialog.getByLabel("Descrição")).toHaveValue("Salário E2E");
  await expect(dialog.getByLabel("Situação")).toContainText("Recebido");

  await typeAmount(page, "250000");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await page.goto("/#/lancamentos");
  const row = page.locator("#tx-ledger li", { hasText: "Salário E2E" });
  await expect(row).toContainText("2.500,00");
  await expect(row).toContainText("+");
});

test("an empty form shows the errors and keeps the dialog open", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(dialog.getByText("Informe uma descrição.")).toBeVisible();
  await expect(dialog.getByText("Informe um valor maior que zero.")).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("marks as paid, searches without accents and deletes a transaction", async ({ page }) => {
  await startLocal(page);
  for (const [name, digits] of [["Padaria E2E", "1250"], ["Cinema E2E", "4000"]] as const) {
    await openNewTransaction(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Descrição").fill(name);
    await typeAmount(page, digits);
    await dialog.getByLabel("Situação").selectOption("PENDING");
    await dialog.getByRole("button", { name: /Salvar/ }).click();
    await expect(dialog).toBeHidden();
  }
  await page.goto("/#/lancamentos");

  // Pending -> paid with the circle.
  const padaria = page.locator("#tx-ledger li", { hasText: "Padaria E2E" });
  await padaria.getByRole("button", { name: "Marcar como pago" }).click();
  await expect(padaria.getByRole("button", { name: "Marcar como pendente" })).toBeVisible();

  // Search ignores case and accents ("cinéma" would also match; the stored name has none).
  await page.getByPlaceholder("Buscar no extrato…").fill("CINEMA");
  await expect(page.locator("#tx-ledger li", { hasText: "Cinema E2E" })).toBeVisible();
  await expect(page.locator("#tx-ledger li", { hasText: "Padaria E2E" })).toHaveCount(0);
  await page.getByPlaceholder("Buscar no extrato…").fill("nada disso");
  await expect(page.getByText(/Nenhum lançamento encontrado/)).toBeVisible();
  await page.getByPlaceholder("Buscar no extrato…").fill("");

  // Edit opens the form with the data; delete asks first.
  await page.locator("#tx-ledger li", { hasText: "Cinema E2E" }).locator(".row-main").click();
  const edit = page.getByRole("dialog", { name: "Editar lançamento" });
  await expect(edit.getByLabel("Descrição")).toHaveValue("Cinema E2E");
  await edit.getByRole("button", { name: /Excluir/ }).click();
  await page.getByRole("dialog", { name: "Excluir lançamento?" }).getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator("#tx-ledger li", { hasText: "Cinema E2E" })).toHaveCount(0);
  await expect(page.locator("#tx-ledger li", { hasText: "Padaria E2E" })).toBeVisible();
});

test("the data survives a reload (kept in this browser)", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição").fill("Persistente E2E");
  await typeAmount(page, "999");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await page.goto("/#/lancamentos");
  await page.reload();
  await expect(page.locator("#tx-ledger li", { hasText: "Persistente E2E" })).toBeVisible();
});
