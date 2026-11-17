import type { Page } from "@playwright/test";
import { expect, test } from "./support";

// Two accounts on one device never see each other's records, and a signed-in session keeps working offline.

const sessionOf = (sub: string, email: string) => ({
  provider: "google", sub, email, name: email.split("@")[0], fileId: "file-1",
  token: { access: "test-token", expiresAt: Date.now() + 3600_000 },
});
const stateWith = (description: string, amountCents: number) => ({
  version: 1, savedAt: Date.now(), transactions: [{
    id: "t1", type: "EXPENSE", description, amountCents, date: new Date().toISOString().slice(0, 10),
    status: "PAID", categoryId: null, source: "MANUAL", notes: "", createdAt: Date.now(),
  }],
});

/** Seeds the device as the app leaves it: the session plus that account's own saved state. */
async function seed(page: Page, sessions: { sub: string; email: string; state?: unknown }[], active: string) {
  await page.goto("/");
  await page.evaluate(({ sessions, active }) => {
    localStorage.clear();
    for (const s of sessions) if (s.state) localStorage.setItem(`minhas-financas:v1:g:${s.sub}`, JSON.stringify(s.state));
    const a = sessions.find((s) => s.sub === active)!;
    localStorage.setItem("minhas-financas:github", JSON.stringify({
      provider: "google", sub: a.sub, email: a.email, name: a.email.split("@")[0], fileId: "file-1",
      token: { access: "test-token", expiresAt: Date.now() + 3600_000 },
    }));
  }, { sessions, active });
}

test("scenario 1: user B starts empty after user A recorded R$ 100,00", async ({ page }) => {
  const a = { sub: "111", email: "ana@example.com", state: stateWith("Mercado da Ana", 10000) };
  const b = { sub: "222", email: "beto@example.com" };
  await seed(page, [a, b], a.sub);
  await page.goto("/#/lancamentos");
  await expect(page.getByText("Mercado da Ana")).toBeVisible();

  // A signs out and B signs in on the same device.
  await seed(page, [a, b], b.sub);
  await page.goto("/#/lancamentos");
  await page.reload();
  await expect(page.getByText("Mercado da Ana")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("minhas-financas:v1:g:222"))).toBeNull();
});

test("scenario 2: a signed-in session stays valid and readable offline", async ({ page, context }) => {
  const a = { sub: "111", email: "ana@example.com", state: stateWith("Mercado da Ana", 10000) };
  await seed(page, [a], a.sub);
  await page.goto("/#/lancamentos");
  await expect(page.getByText("Mercado da Ana")).toBeVisible();

  await context.setOffline(true);
  await expect(page.locator(".sync")).toContainText("Modo offline • Dados salvos no dispositivo");

  // The session stays valid: the sign-in screen never appears and the screen keeps working on the device copy.
  await expect(page).toHaveURL(/#\/lancamentos/);
  await expect(page.getByText("Mercado da Ana")).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("minhas-financas:v1:g:111") || "{}"));
  expect(saved.transactions[0].amountCents).toBe(10000);
  await context.setOffline(false);
});

test("the old single-key data is moved into the account that owned it, once", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(({ session, state }) => {
    localStorage.clear();
    localStorage.setItem("minhas-financas:github", JSON.stringify(session));
    localStorage.setItem("minhas-financas:v1", JSON.stringify(state));
  }, { session: sessionOf("111", "ana@example.com"), state: stateWith("Mercado da Ana", 10000) });
  await page.reload();
  const keys = await page.evaluate(() => ({
    legacy: localStorage.getItem("minhas-financas:v1"),
    moved: localStorage.getItem("minhas-financas:v1:g:111"),
  }));
  expect(keys.legacy).toBeNull();
  expect(JSON.parse(keys.moved!).transactions[0].amountCents).toBe(10000);
});
