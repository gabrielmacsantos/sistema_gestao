import { expect, test } from "@playwright/test";

test("sign up, add an expense, a fixed expense and see them on the dashboard", async ({ page }, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${Date.now()}@test.dev`;

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("link", { name: "Cadastre-se" }).click();
  await page.getByLabel("Nome").fill("Teste E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Gestão financeira e despesas" })).toBeVisible();

  await page.goto("/lancamentos/novo");
  await page.getByLabel("Descrição").fill("Padaria");
  await page.getByLabel("Valor (R$)").fill("12,50");
  await page.getByLabel("Categoria", { exact: true }).selectOption({ label: "Alimentação" });
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/lancamentos\?mes=/);
  // The ledger renders a list on phones and a table from md; only one is visible.
  await expect(page.getByText("Padaria").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("− R$ 12,50").filter({ visible: true })).toBeVisible();

  await page.goto("/fixos/novo");
  await page.getByLabel("Descrição").fill("Internet");
  await page.getByLabel("Valor (R$)").fill("99,90");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/fixos$/);
  await expect(page.getByText("Internet")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("R$ 99,90 a pagar")).toBeVisible();
  await expect(page.getByText("Alimentação").filter({ visible: true }).first()).toBeVisible();
});

test("validation errors keep what the user typed", async ({ page }, testInfo) => {
  const email = `e2e-val-${testInfo.project.name}-${Date.now()}@test.dev`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Gestão financeira e despesas" })).toBeVisible();

  await page.goto("/lancamentos/novo");
  await page.getByLabel("Descrição").fill("Sem valor");
  await page.getByLabel("Valor (R$)").fill("abc");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Informe um valor maior que zero")).toBeVisible();
  await expect(page.getByLabel("Descrição")).toHaveValue("Sem valor");
});
