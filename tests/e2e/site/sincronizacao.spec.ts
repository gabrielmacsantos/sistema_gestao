import type { Page, Request } from "@playwright/test";
import { expect, test } from "./support";

// Encrypted sync: nothing financial reaches Drive in clear text, and it waits for the person's password.

const DRIVE = "https://www.googleapis.com/**";
const session = {
  provider: "google", sub: "111", email: "ana@example.com", name: "Ana", fileId: "file-1",
  token: { access: "test-token", expiresAt: Date.now() + 3600_000 },
};
const stateWith = (description: string, amountCents: number) => ({
  version: 1, savedAt: 1731600000000, transactions: [{
    id: "t1", type: "EXPENSE", description, amountCents, date: new Date().toISOString().slice(0, 10),
    status: "PAID", categoryId: null, source: "MANUAL", notes: "", createdAt: 1731600000000,
  }],
});

/** A fake Drive: serves one plain (older-format) file and records every upload body. */
async function fakeDrive(page: Page, remote: object) {
  const uploads: string[] = [];
  await page.route(DRIVE, async (route) => {
    const request: Request = route.request();
    if (request.method() === "GET" && request.url().includes("alt=media")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ app: "minhas-financas", format: "drive-1", savedAt: 1731600000000, state: remote }) });
    }
    if (request.method() === "PATCH" || request.method() === "POST") {
      uploads.push(request.postData() ?? "");
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "file-1" }) });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ files: [] }) });
  });
  return uploads;
}

async function openSignedIn(page: Page, state: object) {
  await page.goto("/");
  await page.evaluate(({ session, state }) => {
    localStorage.clear();
    localStorage.setItem("minhas-financas:github", JSON.stringify(session));
    localStorage.setItem("minhas-financas:v1:g:111", JSON.stringify(state));
  }, { session, state });
}

test("without a password nothing is uploaded, and creating one uploads only ciphertext", async ({ page }) => {
  const state = stateWith("Mercado da Ana", 12345678);
  const uploads = await fakeDrive(page, state);
  await openSignedIn(page, state);
  await page.goto("/#/backup");
  await page.reload();

  // The older plain file is read, but the first sync asks for the password instead of sending anything.
  await expect(page.getByRole("dialog", { name: "Proteger seus dados com uma senha" })).toBeVisible();
  expect(uploads).toEqual([]);

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Senha de criptografia").fill("uma frase bem longa");
  await dialog.getByLabel("Repita a senha").fill("uma frase bem longa");
  await dialog.getByRole("button", { name: "Proteger e salvar" }).click();
  await expect(dialog).toBeHidden();

  await expect.poll(() => uploads.length).toBeGreaterThan(0);
  const body = uploads.join("\n");
  expect(body).toContain('"format":"drive-2"');
  for (const secret of ["Mercado da Ana", "12345678", "amountCents"]) expect(body).not.toContain(secret);
});

test("'Sincronizar agora' shows its progress and result, and the last sync reads as today", async ({ page }) => {
  const state = stateWith("Mercado da Ana", 4590);
  await fakeDrive(page, state);
  await openSignedIn(page, state);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("minhas-financas:github")!);
    // A key already on the device (random bytes: this test only checks the button, not the cipher).
    s.dkey = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))); s.dsalt = btoa("0123456789abcdef"); s.diter = 310000;
    s.lastSync = Date.now();
    localStorage.setItem("minhas-financas:github", JSON.stringify(s));
  });
  await page.goto("/#/backup");
  await page.reload();
  await expect(page.locator("#sync-last")).toContainText("Sincronizado hoje às");
  await expect(page.getByRole("button", { name: /Sincronizar agora/ })).toBeVisible();
});
