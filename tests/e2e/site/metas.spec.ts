import type { Page } from "@playwright/test";
import { expect, startLocal, test } from "./support";

// Goal confetti: one burst when a deposit or an edit takes a goal to its target (whole cents), then it falls and removes itself.

const confetti = (page: Page) => page.locator("#goal-confetti");

async function newGoal(page: Page, name: string, targetDigits: string, savedDigits?: string) {
  await page.getByRole("button", { name: /Nova meta/ }).click();
  const dialog = page.getByRole("dialog", { name: "Nova meta de economia" });
  await dialog.getByLabel("Nome da meta").fill(name);
  await dialog.getByLabel("Valor alvo").pressSequentially(targetDigits);
  if (savedDigits) await dialog.getByLabel("Já guardado").pressSequentially(savedDigits);
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(dialog).toBeHidden();
}

async function deposit(page: Page, name: string, digits: string) {
  await page.locator("[data-goal]", { hasText: name }).getByRole("button", { name: /Guardar/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Quanto você guardou?").pressSequentially(digits);
  await dialog.getByRole("button", { name: /Confirmar/ }).click();
  await expect(dialog).toBeHidden();
}

async function setSaved(page: Page, name: string, digits: string) {
  await page.locator("[data-goal]", { hasText: name }).getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar meta" });
  const saved = dialog.getByLabel("Já guardado");
  await saved.fill("");
  if (digits) await saved.pressSequentially(digits);
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(dialog).toBeHidden();
}

async function startOnGoals(page: Page) {
  await startLocal(page);
  await page.goto("/#/orcamentos");
  await expect(page.getByText(/Nenhuma meta ainda/)).toBeVisible();
}

test("reaching the target with a deposit fires one burst that never blocks the screen and removes itself", async ({ page }) => {
  await startOnGoals(page);
  await newGoal(page, "Viagem E2E", "100000", "90000"); // R$ 1.000,00 target, R$ 900,00 saved
  await expect(confetti(page)).toHaveCount(0);

  await deposit(page, "Viagem E2E", "10000"); // + R$ 100,00 = exactly the target
  await expect(confetti(page)).toHaveCount(1);
  await expect(page.locator("#live")).toContainText('Meta "Viagem E2E" atingida!');
  expect(await confetti(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  expect(await confetti(page).getAttribute("aria-hidden")).toBe("true");

  // It does not block: a button under the falling pieces still works.
  await page.getByRole("button", { name: /Nova meta/ }).click();
  await expect(page.getByRole("dialog", { name: "Nova meta de economia" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  // And it cleans up by itself in a few seconds.
  await expect(confetti(page)).toHaveCount(0, { timeout: 8000 });
});

test("one cent short does not celebrate; the last cent does (whole cents)", async ({ page }) => {
  await startOnGoals(page);
  await newGoal(page, "Centavos E2E", "100000", "90000");
  await deposit(page, "Centavos E2E", "9999"); // R$ 999,99
  const row = page.locator("[data-goal]", { hasText: "Centavos E2E" });
  await expect(row).toContainText("999,99"); // the percentage rounds to 100%, but the goal is one cent short
  await expect(row).not.toContainText("meta atingida");
  await page.waitForTimeout(400);
  await expect(confetti(page)).toHaveCount(0);

  await deposit(page, "Centavos E2E", "1"); // + R$ 0,01 = R$ 1.000,00
  await expect(confetti(page)).toHaveCount(1);
  await expect(row).toContainText("meta atingida");
});

test("it does not repeat: more savings, a new visit and a reload stay quiet", async ({ page }) => {
  await startOnGoals(page);
  await newGoal(page, "Unica E2E", "100000", "99000");
  await deposit(page, "Unica E2E", "1000");
  await expect(confetti(page)).toHaveCount(1);
  await expect(confetti(page)).toHaveCount(0, { timeout: 8000 });

  await deposit(page, "Unica E2E", "5000"); // beyond the target
  await page.waitForTimeout(400);
  await expect(confetti(page)).toHaveCount(0);

  await page.goto("/#/painel");
  await page.goto("/#/orcamentos");
  await page.reload();
  await expect(page.locator("[data-goal]", { hasText: "Unica E2E" })).toBeVisible();
  await page.waitForTimeout(400);
  await expect(confetti(page)).toHaveCount(0);

  // The mark lives on this device, in one list per account ("local" without an account).
  const id = await page.locator("[data-goal]").first().getAttribute("data-goal");
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("goals-celebrated:local") ?? "[]"))).toEqual([id]);
});

test("falling under the target clears the mark, so a real new completion celebrates again", async ({ page }) => {
  await startOnGoals(page);
  await newGoal(page, "Volta E2E", "100000", "99000");
  await deposit(page, "Volta E2E", "1000");
  await expect(confetti(page)).toHaveCount(1);
  await expect(confetti(page)).toHaveCount(0, { timeout: 8000 });

  await setSaved(page, "Volta E2E", "50000"); // edited down to R$ 500,00
  await page.waitForTimeout(400);
  await expect(confetti(page)).toHaveCount(0);
  await deposit(page, "Volta E2E", "50000"); // back to R$ 1.000,00
  await expect(confetti(page)).toHaveCount(1);
});

test("a goal created already complete celebrates, and deleting it forgets the mark", async ({ page }) => {
  await startOnGoals(page);
  await newGoal(page, "Pronta E2E", "50000", "50000");
  await expect(confetti(page)).toHaveCount(1);
  await expect(confetti(page)).toHaveCount(0, { timeout: 8000 });
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("goals-celebrated:local") ?? "[]"))).toHaveLength(1);

  await page.locator("[data-goal]", { hasText: "Pronta E2E" }).getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Excluir/ }).click();
  await page.getByRole("dialog", { name: "Excluir meta?" }).getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator("[data-goal]")).toHaveCount(0);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("goals-celebrated:local") ?? "[]"))).toEqual([]);
});

test("reduced motion: no confetti, the message is still announced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startOnGoals(page);
  await newGoal(page, "Calma E2E", "100000", "99000");
  await deposit(page, "Calma E2E", "1000");
  await expect(page.locator("#live")).toContainText('Meta "Calma E2E" atingida!');
  await page.waitForTimeout(400);
  await expect(confetti(page)).toHaveCount(0);
});

test("the burst never follows the cursor or the finger: no move listeners are added while it plays", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __added: string[] };
    w.__added = [];
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type: string, ...rest: [EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions)?]) {
      w.__added.push(type);
      return original.call(this, type, ...rest);
    };
  });
  await startOnGoals(page);
  await newGoal(page, "Listeners E2E", "100000", "99000");
  await page.evaluate(() => { (window as unknown as { __added: string[] }).__added = []; });
  await deposit(page, "Listeners E2E", "1000");
  await expect(confetti(page)).toHaveCount(1);
  await page.mouse.move(50, 50);
  const added = await page.evaluate(() => (window as unknown as { __added: string[] }).__added);
  expect(added.filter((type) => /^(mouse|touch|pointer)move$/.test(type))).toEqual([]);
  await expect(confetti(page)).toHaveCount(0, { timeout: 8000 });
});

test("the Painel never shows the confetti", async ({ page }) => {
  await startOnGoals(page);
  await newGoal(page, "Painel E2E", "100000", "99000");
  await page.goto("/#/painel");
  await expect(page.getByRole("heading", { name: /Bem-vindo|Fluxo de caixa/ }).first()).toBeVisible();
  await expect(confetti(page)).toHaveCount(0);
});
