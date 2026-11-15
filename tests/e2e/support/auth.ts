import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";

const OUTBOX = "prisma/e2e-mail.jsonl";

/** The newest 6-digit code e-mailed to `email` (the server writes each message to the outbox file). */
export async function readCode(email: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const lines = (await readFile(OUTBOX, "utf8").catch(() => "")).split("\n").filter(Boolean);
        for (const line of lines.reverse()) {
          const mail = JSON.parse(line) as { to: string; subject: string };
          if (mail.to === email) {
            code = /\d{6}/.exec(mail.subject)?.[0];
            return code;
          }
        }
        return undefined;
      },
      { timeout: 30_000 },
    )
    .toBeTruthy();
  return code as string;
}

/** Gives the test its own client IP, so the per-IP rate limits never mix tests (or runs) together. */
export async function giveOwnIp(page: Page) {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
}

/** Signs up through the screens, types the e-mailed code and lands on the dashboard. */
export async function signUpAndConfirm(page: Page, email: string, name = "Teste E2E") {
  await giveOwnIp(page);
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/verificar$/);
  await page.getByLabel("Código").fill(await readCode(email));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("heading", { name: "Gestão financeira e despesas" })).toBeVisible();
}

/** Records every `animationstart` so a test can tell whether the shake ran, however brief it is. */
export async function watchShake(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __shakes: string[] };
    w.__shakes = [];
    document.addEventListener("animationstart", (event) => w.__shakes.push(event.animationName), true);
  });
  return () => page.evaluate(() => (window as unknown as { __shakes: string[] }).__shakes);
}
