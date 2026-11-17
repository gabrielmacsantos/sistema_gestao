import { expect, startLocal, test } from "./support";

const trigger = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Atalhos rápidos: chat de lançamentos e calculadora" });

test("the floating balloon opens a menu with chat and calculator, and Esc closes it", async ({ page }) => {
  await startLocal(page);
  await expect(trigger(page)).toBeVisible();
  const box = (await trigger(page).boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(48);

  await trigger(page).click();
  const menu = page.getByRole("dialog", { name: "Atalhos rápidos" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: /Chat de lançamentos/ })).toBeVisible();
  await expect(menu.getByRole("button", { name: /Calculadora/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
});

test("the calculator adds in whole cents and sends the value to the form", async ({ page }) => {
  await startLocal(page);
  await trigger(page).click();
  await page.getByRole("button", { name: /Calculadora/ }).click();
  const calc = page.getByRole("dialog", { name: "Calculadora" });
  await expect(calc).toBeVisible();
  const value = calc.locator("output");
  await expect(value).toHaveText("0,00");

  for (const key of ["1", "2", "Mais", "3", "Igual"]) {
    const button = /^\d$/.test(key) ? calc.getByRole("button", { name: key, exact: true }) : calc.getByRole("button", { name: key });
    await button.click();
  }
  const shown = (await value.textContent())!;
  expect(shown).toMatch(/^\d{1,3}(\.\d{3})*,\d{2}$/);

  await calc.getByRole("button", { name: /Usar valor no lançamento/ }).click();
  const form = page.getByRole("dialog", { name: /Novo gasto|Nova entrada/ });
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Valor", { exact: false }).first()).toHaveValue(shown);
});

test("the chat records an expense typed in a sentence and lets the person delete it", async ({ page }) => {
  await startLocal(page);
  await trigger(page).click();
  await page.getByRole("button", { name: /Chat de lançamentos/ }).click();
  const chat = page.getByRole("dialog", { name: "Chat de lançamentos" });
  await expect(chat).toBeVisible();
  await expect(chat.getByText(/Oi! Diga ou escreva um lançamento/)).toBeVisible();

  await chat.getByLabel("Escreva o lançamento").fill("Gastei 45,90 no almoço E2E hoje");
  await chat.getByRole("button", { name: "Enviar" }).click();
  // When the category is not obvious, the chat asks for it with chips.
  const noCategory = chat.getByRole("button", { name: "Sem categoria" });
  if (await noCategory.isVisible().catch(() => false)) await noCategory.click();

  await expect(chat.getByText("Despesa lançada.")).toBeVisible();
  const card = chat.locator(".asst-card");
  await expect(card).toContainText("45,90");
  await expect(card).toContainText("Despesa");

  await page.goto("/#/lancamentos");
  await expect(page.locator("#tx-ledger li", { hasText: "45,90" })).toBeVisible();

  // The chat stays open and keeps the conversation through the page redraw; deleting from the card asks first.
  await expect(chat).toBeVisible();
  await expect(card).toContainText("45,90");
  await chat.getByRole("button", { name: "Excluir" }).click();
  await chat.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(chat.getByText("Esse lançamento foi excluído.")).toBeVisible();
});

test("the chat asks for the missing amount and can be cancelled", async ({ page }) => {
  await startLocal(page);
  await trigger(page).click();
  await page.getByRole("button", { name: /Chat de lançamentos/ }).click();
  const chat = page.getByRole("dialog", { name: "Chat de lançamentos" });
  await chat.getByLabel("Escreva o lançamento").fill("gastei no mercado");
  await chat.getByRole("button", { name: "Enviar" }).click();
  await expect(chat.getByText(/qual foi o valor/)).toBeVisible();
  await chat.getByRole("button", { name: "Cancelar" }).click();
  await expect(chat.getByText(/Tudo bem, cancelei/)).toBeVisible();
});
