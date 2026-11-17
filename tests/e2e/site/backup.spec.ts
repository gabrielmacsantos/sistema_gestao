import { readFile } from "node:fs/promises";
import { expect, openNewTransaction, startLocal, test, typeAmount } from "./support";

test("exports a JSON backup with the data in whole cents", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição").fill("Backup E2E");
  await typeAmount(page, "1234");
  await dialog.getByRole("button", { name: /Salvar/ }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/#/backup");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Baixar backup/ }).click()]);
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  const tx = backup.transactions.find((t: { description: string }) => t.description === "Backup E2E");
  expect(tx).toBeTruthy();
  expect(tx.amountCents).toBe(1234);
});

test("wipes everything after a confirmation, and 'dados de exemplo' fills it back", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/backup");
  await page.getByRole("button", { name: /Carregar exemplo/ }).click();
  await page.goto("/#/lancamentos");
  await expect(page.locator("#tx-ledger li").first()).toBeVisible();

  await page.goto("/#/backup");
  await page.getByRole("button", { name: /Apagar dados/ }).click();
  await page.getByRole("dialog", { name: "Apagar todos os dados?" }).getByRole("button", { name: "Apagar tudo" }).click();
  await expect(page.getByText("Dados apagados.")).toBeVisible();
  await page.goto("/#/lancamentos");
  await expect(page.getByText(/Nenhum lançamento em/)).toBeVisible();
});
