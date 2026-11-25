import { expect, fitsWidth, isPhone, openNewTransaction, startLocal, test, typeAmount } from "./support";
import type { Page } from "@playwright/test";

// "Today" is fixed so the due dates below are always 1 and 2 days away.
const NOW = new Date("2026-11-24T12:00:00-03:00");

const bell = (page: Page) => page.locator('.topbar [data-act="notices"]');
const badge = (page: Page) => bell(page).locator(".bell-badge");

async function addVariableBill(page: Page, opts: { description: string; digits: string; due: string; alert: string }) {
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição").fill(opts.description);
  await typeAmount(page, opts.digits);
  await dialog.getByLabel("Vencimento (opcional)").fill(opts.due);
  await dialog.getByLabel("Avisar quando estiver perto de vencer").selectOption(opts.alert);
  await dialog.getByLabel("Situação").selectOption("PENDING");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function addFixedBill(page: Page, description: string, digits: string, day: string, alert: string) {
  await page.goto("/#/fixos");
  await page.getByRole("button", { name: /Novo fixo/ }).click();
  const dialog = page.getByRole("dialog", { name: "Novo gasto fixo" });
  await dialog.getByLabel("Descrição").fill(description);
  await typeAmount(page, digits);
  await dialog.getByLabel("Dia do vencimento").fill(day);
  await dialog.getByLabel("Avisar quando estiver perto de vencer").selectOption(alert);
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
});

test("variable and fixed bills with an alert reach the bell and the calendar, and paying clears them", async ({ page }) => {
  await startLocal(page);
  await expect(bell(page)).toHaveCount(0); // nothing due yet, no account: no bell

  await addVariableBill(page, { description: "Conta de luz", digits: "18990", due: "2026-11-26", alert: "3" });
  await expect(badge(page)).toHaveText("1");
  await addFixedBill(page, "Internet", "9990", "25", "1");
  await expect(badge(page)).toHaveText("2");

  // The bell lists amount, due text and date, with a quick "pay" action.
  await bell(page).click();
  const sheet = page.getByRole("dialog");
  const luz = sheet.locator(".due-item", { hasText: "Conta de luz" });
  await expect(luz).toContainText("189,90");
  await expect(luz).toContainText("vence em 2 dias");
  await expect(luz).toContainText("26/11/2026");
  await expect(sheet.locator(".due-item", { hasText: "Internet" })).toContainText("vence amanhã");
  await luz.getByRole("button", { name: /Marcar como lida/ }).click();
  await expect(badge(page)).toHaveText("1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Calendar: days with bills are marked, the detail lists exactly that day.
  await page.goto("/#/calendario");
  await expect(page.getByRole("heading", { name: "Calendário", level: 1 })).toBeVisible();
  const day26 = page.locator('[data-act="cal-day"][data-day="2026-11-26"]');
  await expect(day26).toHaveAttribute("aria-label", /1 conta, perto de vencer/);
  await expect(day26.locator(".cal-dot")).toHaveAttribute("data-tone", "soon");
  await page.locator('[data-act="cal-day"][data-day="2026-11-25"]').click();
  const detail = page.locator("#cal-detail");
  await expect(detail).toContainText("Internet");
  await expect(detail).toContainText("Fixo");
  await expect(detail).toContainText("99,90");
  await expect(detail).not.toContainText("Conta de luz");
  await day26.click();
  await expect(detail).toContainText("Conta de luz");
  await expect(detail).toContainText("Variável");
  await expect(detail).toContainText("Pendente");
  await expect(detail).toContainText("189,90");
  await page.locator('[data-act="cal-day"][data-day="2026-11-10"]').click();
  await expect(detail).toContainText("Nenhuma conta neste dia.");

  // Paying updates the calendar mark and the bell at once.
  await day26.click();
  await detail.getByRole("button", { name: /Dar baixa/ }).click();
  await expect(day26.locator(".cal-dot")).toHaveAttribute("data-tone", "paid");
  await expect(detail).toContainText("Pago");
  await expect(badge(page)).toHaveText("1"); // only Internet is left (and it is unread)
  await bell(page).click();
  await expect(page.getByRole("dialog")).not.toContainText("Conta de luz");
  await page.getByRole("dialog").locator(".due-item", { hasText: "Internet" }).getByRole("button", { name: /Marcar como pago/ }).click();
  await expect(bell(page)).toHaveCount(0);
  await page.keyboard.press("Escape");

  // The paid bill shows as paid in the ledger totals.
  await page.goto("/#/lancamentos?mes=2026-11");
  await expect(page.locator("#tx-ledger li", { hasText: "Conta de luz" })).toContainText("Pago");
});

test("adding an expense from a calendar day pre-fills that day, and a bill without a due date needs one for the alert", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/calendario?mes=2026-11&dia=2026-11-28");
  await page.getByRole("button", { name: /Adicionar gasto/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Data da despesa")).toHaveValue("2026-11-28");
  await expect(dialog.getByLabel("Vencimento (opcional)")).toHaveValue(""); // clean by default, even from a calendar day
  await expect(dialog.getByLabel("Situação")).toHaveValue("PENDING");
  await dialog.getByLabel("Descrição").fill("Seguro");
  await typeAmount(page, "50000");
  await dialog.getByLabel("Avisar quando estiver perto de vencer").selectOption("7");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(dialog.getByText("Informe o vencimento para receber o aviso.")).toBeVisible();
  await dialog.getByLabel("Vencimento (opcional)").fill("2026-11-28");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#cal-detail")).toContainText("Seguro");
  await expect(page.locator('[data-act="cal-day"][data-day="2026-11-28"] .cal-dot')).toHaveAttribute("data-tone", "soon");
  await expect(badge(page)).toHaveText("1"); // 4 days away, inside the 7-day window
});

test("a new expense starts with no due date and stays off the calendar until one is filled", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Data da despesa")).toHaveValue("2026-11-24");
  await expect(dialog.getByLabel("Vencimento (opcional)")).toHaveValue("");
  await expect(dialog.getByLabel("Avisar quando estiver perto de vencer")).toHaveValue("");
  await expect(dialog.getByRole("group", { name: "Vencimento e aviso" })).toBeVisible();
  await dialog.getByLabel("Descrição").fill("Mercado");
  await typeAmount(page, "8000");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/#/calendario?mes=2026-11");
  await expect(page.locator(".cal-dot")).toHaveCount(4); // only the legend dots: nothing on the grid
  await expect(page.locator("#cal-detail")).toContainText("Nenhuma conta neste dia.");
});

test("due date and alert sit side by side, level with each other, on every screen", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  // Both boxes are read in one go: the dialog may scroll between two separate measurements.
  const [x, y] = await page.evaluate(() => ["f-dueDate", "f-alertDays"].map((id) => { const r = document.getElementById(id)!.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
  expect(Math.abs(x.y - y.y)).toBeLessThan(1);
  expect(Math.abs(x.height - y.height)).toBeLessThan(1);
  expect(y.x).toBeGreaterThan(x.x + x.width - 1);
  expect(await fitsWidth(page)).toBe(true);
});

test("the date field is named after the type: despesa or entrada", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Data da despesa")).toBeVisible();
  await dialog.getByRole("radio", { name: "Receita" }).click();
  await expect(dialog.getByLabel("Data da entrada")).toBeVisible();
  await expect(dialog.getByLabel("Data da despesa")).toHaveCount(0);
  await dialog.getByRole("radio", { name: "Despesa" }).click();
  await expect(dialog.getByLabel("Data da despesa")).toBeVisible();
});

test("the Calendário entry is reachable from the menu and the page fits both themes", async ({ page }, testInfo) => {
  await startLocal(page);
  if (isPhone(testInfo)) {
    await page.locator('[data-act="menu"]').click();
    await page.locator('.drawer-nav a, #modal a, .drawer a', { hasText: "Calendário" }).first().click();
  } else {
    await page.locator("#rail a", { hasText: "Calendário" }).click();
  }
  await expect(page).toHaveURL(/#\/calendario/);
  await expect(page.locator(".cal-d.today")).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    expect(await fitsWidth(page)).toBe(true);
    const dot = page.locator(".cal-legend .cal-dot.overdue");
    const color = await dot.evaluate((el) => getComputedStyle(el).backgroundColor);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(color).not.toBe(bg);
  }
});
