import { expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./support/auth";

// Goal confetti in the Next.js version: only on /orcamentos, once, when a deposit takes a goal to its target.

test("a deposit that completes a goal fires one confetti burst that does not block and does not repeat", async ({ page }, testInfo) => {
  await signUpAndConfirm(page, `e2e-confetti-${testInfo.project.name}-${Date.now()}@test.dev`);
  await page.goto("/dashboard");
  await expect(page.locator("#goal-confetti")).toHaveCount(0);

  await page.goto("/orcamentos");
  await page.getByLabel("Nome da meta").fill("Viagem E2E");
  await page.getByLabel("Valor alvo (R$)").pressSequentially("100000"); // R$ 1.000,00
  await page.getByLabel("Já guardado (R$)").pressSequentially("90000"); // R$ 900,00
  await page.getByRole("button", { name: "Criar meta" }).click();
  await expect(page.getByText("Meta criada.")).toBeVisible();
  await expect(page.locator("#goal-confetti")).toHaveCount(0);

  const goal = page.getByRole("listitem").filter({ hasText: "Viagem E2E" });
  await goal.getByLabel("Valor a guardar").pressSequentially("9999"); // R$ 99,99: one cent short
  await goal.getByRole("button", { name: "Guardar" }).click();
  await expect(goal).toContainText("999,99");
  await expect(goal).not.toContainText("concluída");
  await goal.getByLabel("Valor a guardar").fill(""); // the amount stays in the box after a deposit: clear it
  await page.waitForTimeout(400);
  await expect(page.locator("#goal-confetti")).toHaveCount(0);

  await goal.getByLabel("Valor a guardar").pressSequentially("1"); // + R$ 0,01 = exactly the target
  await goal.getByRole("button", { name: "Guardar" }).click();
  await expect(page.locator("#goal-confetti")).toHaveCount(1);
  expect(await page.locator("#goal-confetti").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  await expect(goal).toContainText("concluída");

  // The other screens and the same button keep working while the pieces fall.
  // (The click goes straight to the link: the dev-mode indicator of Next covers the first link of the phone's bottom bar.)
  await page.getByRole("link", { name: /Painel/ }).first().evaluate((el) => (el as HTMLElement).click());
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator("#goal-confetti")).toHaveCount(0, { timeout: 8000 });

  // Coming back, and saving more, does not celebrate again.
  await page.goto("/orcamentos");
  const again = page.getByRole("listitem").filter({ hasText: "Viagem E2E" });
  await again.getByLabel("Valor a guardar").fill("");
  await again.getByLabel("Valor a guardar").pressSequentially("500");
  await again.getByRole("button", { name: "Guardar" }).click();
  await expect(again).toContainText("1.005,00");
  await page.waitForTimeout(400);
  await expect(page.locator("#goal-confetti")).toHaveCount(0);
});
