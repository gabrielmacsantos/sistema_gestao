import { expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./support/auth";

// Switching Despesa/Receita in the fixed-expense form must not remount anything: the typed fields and the
// very same <select> element survive, and the indicator moves.

test("switching the type of a fixed expense keeps the fields and the category select in place", async ({ page }, testInfo) => {
  await signUpAndConfirm(page, `e2e-fixos-tipo-${testInfo.project.name}-${Date.now()}@test.dev`);
  await page.goto("/fixos/novo");

  await page.getByLabel("Descrição").fill("Aluguel");
  await page.getByLabel("Valor (R$)").fill("1500");
  await page.getByLabel("Dia do vencimento").fill("12");

  // Tag the nodes: a remount would drop the marker.
  const category = page.getByLabel("Categoria");
  await category.evaluate((el) => el.setAttribute("data-probe", "same"));
  const before = await page.locator("form").boundingBox();

  const type = page.getByRole("group", { name: "Tipo" });
  await type.getByText("Receita").click();
  await expect(type.getByRole("radio", { name: "Receita" })).toBeChecked();
  await type.getByText("Despesa").click();
  await expect(type.getByRole("radio", { name: "Despesa" })).toBeChecked();

  await expect(category).toHaveAttribute("data-probe", "same");
  await expect(page.getByLabel("Descrição")).toHaveValue("Aluguel");
  await expect(page.getByLabel("Valor (R$)")).toHaveValue("1.500,00");
  await expect(page.getByLabel("Dia do vencimento")).toHaveValue("12");
  const after = await page.locator("form").boundingBox();
  expect(after?.height).toBe(before?.height);
});
