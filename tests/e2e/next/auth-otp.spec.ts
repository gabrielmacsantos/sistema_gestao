import { expect, test } from "@playwright/test";
import { readCode, signUpAndConfirm, giveOwnIp, watchShake } from "./support/auth";

const stamp = (testInfo: { project: { name: string } }) => `${testInfo.project.name}-${Date.now()}`;

test("Scenario 1: sign up by e-mail, confirm with the 6-digit code and reach the dashboard", async ({ page }, testInfo) => {
  const email = `e2e-otp-${stamp(testInfo)}@test.dev`;
  await giveOwnIp(page);
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Teste OTP");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  // No session yet: the dashboard stays closed until the code is typed.
  await expect(page).toHaveURL(/\/verificar$/);
  await expect(page.getByText("e2***@test.dev")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/verificar");
  const code = await readCode(email);
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel("Código").fill(code);
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("heading", { name: "Gestão financeira e despesas" })).toBeVisible();
});

test("an unconfirmed account that signs in gets a code instead of a session", async ({ page }, testInfo) => {
  const email = `e2e-unconfirmed-${stamp(testInfo)}@test.dev`;
  await giveOwnIp(page);
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Sem confirmar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/verificar$/);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/verificar$/);
  await page.getByLabel("Código").fill(await readCode(email));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("heading", { name: "Gestão financeira e despesas" })).toBeVisible();
});

test("Scenario 2: a wrong code shakes the field and marks it invalid", async ({ page }, testInfo) => {
  const email = `e2e-shake-code-${stamp(testInfo)}@test.dev`;
  await giveOwnIp(page);
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Shake");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/verificar$/);

  const code = await readCode(email);
  const shakes = await watchShake(page);
  await page.getByLabel("Código").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Código incorreto.")).toBeVisible();
  await expect(page.getByLabel("Código")).toHaveAttribute("aria-invalid", "true");
  await expect.poll(shakes).toContain("t-input-shake");
});

test("Scenario 2: a wrong password or an invalid field shakes the login fields", async ({ page }, testInfo) => {
  const email = `e2e-shake-login-${stamp(testInfo)}@test.dev`;
  await signUpAndConfirm(page, email);
  await page.context().clearCookies();

  await page.goto("/login");
  await expect(page.getByPlaceholder("voce@exemplo.com")).toBeVisible();
  await expect(page.getByPlaceholder("Sua senha")).toBeVisible();
  const shakes = await watchShake(page);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expect(page.getByLabel("Senha")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("E-mail")).toHaveValue(email); // kept after the failure
  await expect.poll(async () => (await shakes()).filter((name) => name === "t-input-shake").length).toBe(2);

  // A field that fails validation: only that one shakes.
  await page.getByLabel("Senha").fill("x");
  await page.getByLabel("E-mail").fill("isso-nao-e-email");
  await page.getByLabel("E-mail").evaluate((input: HTMLInputElement) => (input.type = "text")); // skip the browser check
  const before = (await shakes()).length;
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail inválido")).toBeVisible();
  await expect.poll(async () => (await shakes()).length - before).toBe(1);
});

test("with reduced motion the field is marked but does not shake", async ({ page }, testInfo) => {
  await giveOwnIp(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  const shakes = await watchShake(page);
  await page.getByLabel("E-mail").fill(`nao-existe-${stamp(testInfo)}@test.dev`);
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expect(page.getByLabel("Senha")).toHaveAttribute("aria-invalid", "true");
  expect(await shakes()).not.toContain("t-input-shake");
});
