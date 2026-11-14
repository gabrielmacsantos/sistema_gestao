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

  // Cash flow: the weekly tab splits the chosen month into calendar weeks, and the choice sticks.
  await expect(page.getByRole("table", { name: "Entradas e saídas por mês" })).toBeAttached();
  await page.getByRole("button", { name: "Semanal" }).click();
  await expect(page.getByRole("button", { name: "Semanal" })).toHaveAttribute("aria-pressed", "true");
  const weeks = page.getByRole("table", { name: /^Entradas e saídas por semana de / });
  await expect(weeks).toBeAttached();
  expect(await weeks.getByRole("row").count()).toBeGreaterThanOrEqual(5); // header + 4 to 6 weeks
  // Padaria (today) and Internet (this month) both fall in some week of the month.
  await expect(weeks).toContainText(/R\$\s(12,50|112,40)/);
  await expect(page.getByRole("button", { name: /^\d+( a \d+)? de .+: entradas/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Semanal" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Mensal" }).click();
  await expect(page.getByRole("table", { name: "Entradas e saídas por mês" })).toBeAttached();

  // Recent ledger: the chip filters the list in place and updates the count.
  const expenses = page.getByRole("button", { name: "Saídas", exact: true });
  await expenses.click();
  await expect(expenses).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/^Mostrando 2 de 2 saídas$/)).toBeVisible();
  await page.getByRole("button", { name: "Entradas", exact: true }).click();
  await expect(page.getByText("Nenhuma entrada neste mês.")).toBeVisible();

  // Search on Lançamentos: ignores accents, keeps the term in the URL, and can be cleared.
  await page.goto("/lancamentos");
  const search = page.getByRole("searchbox", { name: "Buscar lançamentos" });
  await search.fill("PADARÍA");
  await expect(page).toHaveURL(/busca=PADAR/);
  await expect(page.getByText("Mostrando 1 de 1 lançamento")).toBeVisible();
  await expect(page.getByText("Padaria").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Internet").filter({ visible: true })).toHaveCount(0);
  await search.fill("xyz-nada");
  await expect(page.getByText("Nenhum lançamento encontrado para “xyz-nada”.")).toBeVisible();
  await page.getByRole("link", { name: "Limpar filtros" }).click();
  await expect(page.getByText("Mostrando 2 de 2 lançamentos")).toBeVisible();
});

test("amount mask and switching between expense and income", async ({ page }, testInfo) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Teste");
  await page.getByLabel("E-mail").fill(`e2e-mask-${testInfo.project.name}-${Date.now()}@test.dev`);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Gestão financeira e despesas" })).toBeVisible();

  await page.goto("/lancamentos/novo");
  const description = page.getByLabel("Descrição");
  const amount = page.getByLabel("Valor (R$)");
  await description.fill("Mercado");
  await amount.pressSequentially("5230");
  await expect(amount).toHaveValue("52,30");

  // Switching keeps what was typed and only changes what depends on the type.
  await page.getByText("Receita", { exact: true }).click();
  await expect(description).toHaveValue("Mercado");
  await expect(amount).toHaveValue("52,30");
  await expect(description).toHaveAttribute("placeholder", "Ex.: Salário, Freela, Bônus");
  await expect(page.getByLabel("Situação").locator("option").first()).toHaveText("Recebido");
  await page.getByText("Despesa", { exact: true }).click();
  await expect(amount).toHaveValue("52,30");

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/lancamentos\?mes=/);
  await expect(page.getByText("− R$ 52,30").filter({ visible: true })).toBeVisible();

  // The eye hides every amount, survives a reload, and shows them again.
  const amount5230 = page.getByText("R$ 52,30", { exact: true }).first();
  const eye = page.getByRole("button", { name: "Ocultar valores" });
  await eye.click();
  await expect(eye).toHaveAttribute("aria-pressed", "true");
  await expect(amount5230).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button", { name: "Ocultar valores" })).toHaveAttribute("aria-pressed", "true");
  await expect(amount5230).toBeHidden();
  await page.getByRole("button", { name: "Ocultar valores" }).click();
  await expect(amount5230).toBeVisible();

  // Phone header: the menu sheet lists every page and keeps the month being viewed.
  if (testInfo.project.name === "mobile") {
    await page.goto("/lancamentos?mes=2026-01");
    await page.getByRole("button", { name: "Mais opções" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("button", { name: /^Sair/ })).toBeVisible();
    await menu.getByRole("link", { name: "Orçamentos" }).click();
    await expect(page).toHaveURL(/\/orcamentos\?mes=2026-01$/);
    await expect(menu).toBeHidden();
  }
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
  await expect(page.getByLabel("Valor (R$)")).toHaveValue(""); // the mask keeps digits only
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Informe um valor maior que zero")).toBeVisible();
  await expect(page.getByLabel("Descrição")).toHaveValue("Sem valor");
});
