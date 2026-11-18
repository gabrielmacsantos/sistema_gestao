import type { Page, Request } from "@playwright/test";
import { expect, test } from "./support";

// Profile: identity card, sign out, and the permanent deletion of the account and its data (two steps).

const session = {
  provider: "google", sub: "111", email: "ana@example.com", name: "Ana Souza", fileId: "file-1",
  token: { access: "test-token", expiresAt: Date.now() + 3600_000 },
};
const stateWith = (description: string, amountCents: number) => ({
  version: 1, savedAt: 1731600000000, transactions: [{
    id: "t1", type: "EXPENSE", description, amountCents, date: new Date().toISOString().slice(0, 10),
    status: "PAID", categoryId: null, source: "MANUAL", notes: "", createdAt: 1731600000000,
  }],
});

/** A fake Drive folder with two files; DELETE removes them and the listing follows. */
async function fakeDrive(page: Page, opts: { failDelete?: boolean } = {}) {
  let files = [{ id: "file-1", name: "minhas-financas.json" }, { id: "photo-file", name: "photo-p1.jpg" }];
  const deleted: string[] = [];
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request: Request = route.request(), url = request.url();
    if (request.method() === "DELETE") {
      if (opts.failDelete) return route.fulfill({ status: 500, body: "{}" });
      const id = url.split("/files/")[1].split("?")[0];
      deleted.push(id); files = files.filter((f) => f.id !== id);
      return route.fulfill({ status: 204, body: "" });
    }
    if (url.includes("/drive/v3/files?") && url.includes("spaces=appDataFolder")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ files }) });
    }
    if (url.includes("alt=media")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ app: "minhas-financas", format: "drive-1", savedAt: 1731600000000, state: stateWith("Mercado da Ana", 10000) }) });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "file-1", files: [] }) });
  });
  return { deleted };
}

/** The device as the app leaves it: Ana signed in with her data, plus data made without an account. */
async function openAsAna(page: Page) {
  await page.goto("/");
  await page.evaluate(({ session, state }) => {
    localStorage.clear();
    localStorage.setItem("minhas-financas:github", JSON.stringify(session));
    localStorage.setItem("minhas-financas:v1:g:111", JSON.stringify(state));
    localStorage.setItem("minhas-financas:v1:local", JSON.stringify({ version: 1, transactions: [{ id: "x", amountCents: 4590, description: "Sem conta" }] }));
    localStorage.setItem("goals-celebrated:111", "[]");
    localStorage.setItem("notices-read:111", "[]");
    localStorage.setItem("mf-theme", "dark");
  }, { session, state: stateWith("Mercado da Ana", 10000) });
  await page.reload(); // start the app with the session; a hash change in the page that loaded without one goes back to the sign-in
  await page.goto("/#/perfil");
}

test("the profile shows who is signed in, the documents and a clearly marked danger zone", async ({ page }) => {
  await fakeDrive(page);
  await openAsAna(page);
  await expect(page.getByRole("heading", { name: "Ana Souza" })).toBeVisible();
  await expect(page.locator("main").getByText("ana@example.com")).toBeVisible(); // the menu copy of the e-mail is hidden on the phone
  await expect(page.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", /privacidade\.html/);
  await expect(page.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", /termos\.html/);
  await expect(page.getByRole("heading", { name: "Zona de perigo" })).toBeVisible();

  // Touch targets: at least 44 x 44 px.
  for (const name of ["Sair da conta", "Excluir minha conta e todos os dados"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box!.height, name).toBeGreaterThanOrEqual(44);
    expect(box!.width, name).toBeGreaterThanOrEqual(44);
  }
});

test("scenario 1: deleting the account erases its cloud copy and local data, and leaves the rest alone", async ({ page }) => {
  const { deleted } = await fakeDrive(page);
  await openAsAna(page);
  await page.getByRole("button", { name: "Excluir minha conta e todos os dados" }).click();

  // Step 1: what will go. Step 2: an explicit typed confirmation.
  await expect(page.getByRole("dialog", { name: "Excluir sua conta?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirme a exclusão" });
  await expect(confirm).toBeVisible();
  const final = confirm.getByRole("button", { name: "Excluir definitivamente" });
  await expect(final).toBeDisabled();
  await confirm.getByLabel("Digite EXCLUIR para confirmar").fill("excluir tudo");
  await expect(final).toBeDisabled();
  await confirm.getByLabel("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await expect(final).toBeEnabled();
  await final.click();

  // Back at the login screen, with nothing of the account left.
  await expect(page).toHaveURL(/#\/entrar/);
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toBeVisible();
  expect(deleted.sort()).toEqual(["file-1", "photo-file"]);
  const left = await page.evaluate(() => ({
    session: localStorage.getItem("minhas-financas:github"),
    data: localStorage.getItem("minhas-financas:v1:g:111"),
    celebrated: localStorage.getItem("goals-celebrated:111"),
    notices: localStorage.getItem("notices-read:111"),
    noAccount: localStorage.getItem("minhas-financas:v1:local"),
    theme: localStorage.getItem("mf-theme"),
  }));
  expect(left.session).toBeNull();
  expect(left.data).toBeNull();
  expect(left.celebrated).toBeNull();
  expect(left.notices).toBeNull();
  expect(left.noAccount).not.toBeNull(); // made without an account: not this account's data
  expect(left.theme).toBe("dark"); // a device preference
});

test("if the cloud copy cannot be deleted, nothing is erased from the device and the person can try again", async ({ page }) => {
  await fakeDrive(page, { failDelete: true });
  await openAsAna(page);
  await page.getByRole("button", { name: "Excluir minha conta e todos os dados" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirme a exclusão" });
  await confirm.getByLabel("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await confirm.getByRole("button", { name: "Excluir definitivamente" }).click();

  await expect(page.getByText(/Nada foi apagado deste aparelho/)).toBeVisible();
  await expect(confirm.getByRole("button", { name: "Excluir definitivamente" })).toBeEnabled();
  const left = await page.evaluate(() => ({ session: localStorage.getItem("minhas-financas:github"), data: localStorage.getItem("minhas-financas:v1:g:111") }));
  expect(left.session).not.toBeNull();
  expect(left.data).not.toBeNull();
});

test("cancelling in either step deletes nothing", async ({ page }) => {
  const { deleted } = await fakeDrive(page);
  await openAsAna(page);
  await page.getByRole("button", { name: "Excluir minha conta e todos os dados" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Excluir minha conta e todos os dados" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("dialog", { name: "Confirme a exclusão" }).getByRole("button", { name: "Cancelar" }).click();
  expect(deleted).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("minhas-financas:v1:g:111"))).not.toBeNull();
});

test("scenario 2: signing out only ends the session; the account stays in the cloud", async ({ page }) => {
  const { deleted } = await fakeDrive(page);
  await openAsAna(page);
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar e sair" }).click();
  await expect(page).toHaveURL(/#\/entrar/);
  expect(deleted).toEqual([]); // nothing was deleted from the cloud
  expect(await page.evaluate(() => localStorage.getItem("minhas-financas:github"))).toBeNull();
});
