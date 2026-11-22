import type { Page } from "@playwright/test";
import { expect, fitsWidth, isPhone, openNewTransaction, startLocal, test, typeAmount } from "./support";

// Money rules in whole cents: values such as 1.250,75 and 130,70 are the ones where a float shows up as 130.70000000000002.

const kpi = (page: Page, label: string) => page.locator(".grid-kpi > *", { hasText: label });

/** Adds a variable entry through the form: `digits` are the cents typed on the till-style mask. */
async function addTx(page: Page, { type, description, digits, category }: { type: "Despesa" | "Receita"; description: string; digits: string; category?: string }) {
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog", { name: /Novo gasto|Nova entrada/ });
  if (type === "Receita") await dialog.getByRole("radio", { name: "Receita" }).click();
  await dialog.getByLabel("Descrição").fill(description);
  await typeAmount(page, digits);
  if (category) await dialog.getByLabel("Categoria").selectOption({ label: category });
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByText("Lançamento salvo.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

/** A fixed expense: it creates a pending transaction for this month. */
async function addFixed(page: Page, description: string, digits: string) {
  await page.goto("/#/fixos");
  await page.getByRole("button", { name: /Novo fixo/ }).first().click();
  const form = page.getByRole("dialog", { name: "Novo gasto fixo" });
  await form.getByLabel("Descrição").fill(description);
  await form.getByLabel("Valor mensal").pressSequentially(digits);
  await form.getByRole("button", { name: /Salvar|Cadastrar/ }).click();
  await expect(page.getByText("Gasto fixo cadastrado.")).toBeVisible();
}

async function seedMonth(page: Page) {
  await startLocal(page);
  await addTx(page, { type: "Receita", description: "Salário E2E", digits: "125075" }); // R$ 1.250,75
  await addTx(page, { type: "Despesa", description: "Mercado E2E", digits: "13070" }); // R$ 130,70
  await addFixed(page, "Aluguel E2E", "8015"); // R$ 80,15, pending
}

test("the Painel totals are exact to the cent: income, spent, fixed, variable and free balance", async ({ page }) => {
  await seedMonth(page);
  await page.goto("/#/painel");
  await expect(kpi(page, "Entradas no mês")).toContainText("R$ 1.250,75");
  await expect(kpi(page, "Total gasto no mês")).toContainText("R$ 210,85"); // 130,70 + 80,15 (a float gives 210,84999…)
  await expect(kpi(page, "Fixos comprometidos")).toContainText("R$ 80,15");
  await expect(kpi(page, "Fixos comprometidos")).toContainText("0 de 1 pagos");
  await expect(kpi(page, "Gastos variáveis")).toContainText("R$ 130,70");
  await expect(kpi(page, "Saldo livre previsto")).toContainText("R$ 1.039,90"); // 1.250,75 − 210,85
  expect(await fitsWidth(page)).toBe(true);
});

test("create, edit and delete keep every total exact", async ({ page }) => {
  await seedMonth(page);
  await page.goto("/#/lancamentos");
  const totals = page.locator("#tx-metrics");
  await expect(totals).toContainText("R$ 1.250,75");
  await expect(totals).toContainText("R$ 210,85");

  // Edit the market entry from 130,70 to 131,05.
  await page.locator("#tx-ledger li", { hasText: "Mercado E2E" }).locator(".row-main").click();
  const edit = page.getByRole("dialog", { name: "Editar lançamento" });
  await edit.getByLabel("Valor", { exact: false }).first().fill("");
  await edit.getByLabel("Valor", { exact: false }).first().pressSequentially("13105");
  await expect(edit.getByLabel("Valor", { exact: false }).first()).toHaveValue("131,05");
  await edit.getByRole("button", { name: /Salvar/ }).click();
  await expect(totals).toContainText("R$ 211,20"); // 131,05 + 80,15
  await page.goto("/#/painel");
  await expect(kpi(page, "Saldo livre previsto")).toContainText("R$ 1.039,55");

  // Delete it: only the fixed expense is left among the spending.
  await page.goto("/#/lancamentos");
  await page.locator("#tx-ledger li", { hasText: "Mercado E2E" }).locator(".row-main").click();
  await page.getByRole("dialog", { name: "Editar lançamento" }).getByRole("button", { name: /Excluir/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Excluir|Confirmar/ }).last().click();
  await expect(page.locator("#tx-ledger li", { hasText: "Mercado E2E" })).toHaveCount(0);
  await expect(totals).toContainText("R$ 80,15");
  await page.goto("/#/painel");
  await expect(kpi(page, "Total gasto no mês")).toContainText("R$ 80,15");
  await expect(kpi(page, "Saldo livre previsto")).toContainText("R$ 1.170,60");
});

test("filters and search change the list and the totals above it", async ({ page }) => {
  await seedMonth(page);
  await page.goto("/#/lancamentos");
  const totals = page.locator("#tx-metrics");
  const rows = page.locator("#tx-ledger li");
  await expect(rows).toHaveCount(3);

  // Type: only the entries (receitas).
  await page.locator("#tx-tipo").getByRole("link", { name: "Entradas" }).click();
  await expect(rows).toHaveCount(1);
  await expect(totals).toContainText("R$ 1.250,75");
  await page.locator("#tx-tipo").getByRole("link", { name: "Todos" }).click();
  await expect(rows).toHaveCount(3);

  // Status: only what is still pending (the fixed expense).
  await page.locator('select[data-filter="status"]').selectOption("pendentes");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Aluguel E2E");
  await expect(totals).toContainText("R$ 80,15");
  await page.locator('select[data-filter="status"]').selectOption("");
  await expect(rows).toHaveCount(3);

  // Search ignores case and accents; also matches by amount.
  await page.locator("#tx-search").fill("SALARIO");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Salário E2E");
  await page.locator("#tx-search").fill("130,70");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Mercado E2E");
  await page.locator("#tx-search").fill("");
  await expect(rows).toHaveCount(3);
  expect(await fitsWidth(page)).toBe(true);
});

test("the Painel flow chart switches between Mensal and Semanal", async ({ page }) => {
  await seedMonth(page);
  await page.goto("/#/painel");
  const bar = page.locator('[data-tabs="flow-view"]');
  await bar.getByRole("tab", { name: "Semanal" }).click();
  await expect(page.locator("#flow-chart")).toContainText(/Sem\.?\s*\d|semana/i);
  await bar.getByRole("tab", { name: "Mensal" }).click();
  await expect(page.locator("#flow-chart .chart-col")).toHaveCount(6);
});

test("everything stays after a reload and while offline (local-first)", async ({ page, context }) => {
  await seedMonth(page);
  await page.goto("/#/lancamentos");
  await page.reload();
  await expect(page.locator("#tx-ledger li")).toHaveCount(3);
  await expect(page.locator("#tx-metrics")).toContainText("R$ 1.250,75");

  // Theme choice is a preference of the device and survives too.
  await page.goto("/#/painel");
  if (isPhone(test.info())) {
    await page.locator('[data-act="menu"]').click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Tema claro" }).click();
  } else {
    await page.getByRole("button", { name: "Tema escuro" }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(kpi(page, "Saldo livre previsto")).toContainText("R$ 1.039,90");

  // No network: the page already loaded keeps working on the device copy.
  await context.setOffline(true);
  await page.goto("/#/lancamentos");
  await expect(page.locator("#tx-ledger li")).toHaveCount(3);
  await context.setOffline(false);
});

test("a budget over its ceiling raises the alert and the audit card follows", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/orcamentos");
  await page.getByRole("button", { name: /Definir limite/ }).click();
  const budget = page.getByRole("dialog", { name: "Definir limite mensal" });
  const category = (await budget.getByLabel("Categoria").evaluate((el: HTMLSelectElement) => el.selectedOptions[0].textContent))!.trim();
  await budget.getByLabel("Limite mensal").pressSequentially("15000"); // R$ 150,00
  await budget.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByRole("meter", { name: category })).toBeVisible();

  // 130,70 of 150,00 is 87%: the warning level (from 80%).
  await addTx(page, { type: "Despesa", description: "Compra 1 E2E", digits: "13070", category });
  await page.goto("/#/painel");
  const alert = page.locator(".alert");
  await expect(alert).toContainText(category);
  await expect(alert).toContainText("87% do orçamento usado");

  // 160,70 of 150,00: over the ceiling by exactly 10,70.
  await addTx(page, { type: "Despesa", description: "Compra 2 E2E", digits: "3000", category });
  await page.goto("/#/painel");
  await expect(alert).toContainText("orçamento estourado em R$ 10,70");

  // The audit card counts what is paid (both entries are) and the page still fits.
  await expect(page.getByRole("heading", { name: "Auditoria & Ritmo Mensal" })).toBeVisible();
  await expect(page.locator(".audit .ring")).toHaveAttribute("aria-label", /100% das saídas do mês já foram pagas/);
  await page.goto("/#/orcamentos");
  await expect(page.locator("main")).toContainText("estourado");
  expect(await fitsWidth(page)).toBe(true);
});
