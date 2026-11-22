import type { Page } from "@playwright/test";
import { expect, test } from "./support";

// Two tabs of the app open at once (common on the desktop). Every sync writes the session (last-sync time, token);
// that must never make the other tab reload, or the two tabs reload each other forever ("the screen keeps refreshing").

const SYNC_KEY = "minhas-financas:github";
const session = (extra: object = {}) => ({ provider: "google", sub: "111", email: "ana@example.com", name: "Ana", fileId: "f1", token: { access: "t", expiresAt: Date.now() + 3600_000 }, ...extra });

async function openSecondTab(page: Page) {
  const other = await page.context().newPage();
  await other.route((url) => url.protocol.startsWith("http") && !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
  return other;
}
// A tab in the middle of reloading has lost the marker too: "not alive" is the answer then.
async function alive(page: Page) { return page.evaluate(() => (window as unknown as { __alive?: number }).__alive === 1).catch(() => false); }

test("a same-account session update in one tab never reloads the other", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(([key, s]) => { localStorage.setItem(key as string, JSON.stringify(s)); localStorage.setItem("mf-tour-done:g:111", "1"); }, [SYNC_KEY, session()]);
  await page.reload();
  const other = await openSecondTab(page);
  await other.goto("/#/painel");
  await expect(other.locator("#app")).not.toContainText("Carregando");
  for (const p of [page, other]) await p.evaluate(() => { (window as unknown as { __alive: number }).__alive = 1; });
  let navs = 0;
  for (const p of [page, other]) p.on("framenavigated", () => navs++);

  // Ten rounds of "sync" written alternately by each tab (what markSynced does after every pull or push).
  for (let i = 1; i <= 10; i++) {
    const writer = i % 2 ? page : other;
    await writer.evaluate(([key, s, n]) => localStorage.setItem(key as string, JSON.stringify({ ...(s as object), lastSync: Date.now() + (n as number), token: { access: `t${n}`, expiresAt: Date.now() + 3600_000 } })), [SYNC_KEY, session(), i]);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1200);
  expect(navs, "no tab navigated").toBe(0);
  expect(await alive(page)).toBe(true);
  expect(await alive(other)).toBe(true);
  // The other tab took the fresher session.
  expect(await other.evaluate((key) => JSON.parse(localStorage.getItem(key)!).token.access, SYNC_KEY)).toBe("t10");
});

test("signing out or switching account in one tab does restart the other", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(([key, s]) => { localStorage.setItem(key as string, JSON.stringify(s)); localStorage.setItem("mf-tour-done:g:111", "1"); }, [SYNC_KEY, session()]);
  await page.reload();
  const other = await openSecondTab(page);
  await other.goto("/#/painel");
  await other.evaluate(() => { (window as unknown as { __alive: number }).__alive = 1; });

  // Another account signs in on this device: the other tab starts over with it.
  await page.evaluate(([key, s]) => localStorage.setItem(key as string, JSON.stringify(s)), [SYNC_KEY, session({ sub: "222", email: "beto@example.com" })]);
  await expect.poll(() => alive(other), { timeout: 8000 }).toBe(false);

  // Signing out: the other tab goes to the sign-in screen.
  await other.waitForLoadState("load");
  await expect(other.locator("#app")).not.toContainText("Carregando");
  await other.evaluate(() => { (window as unknown as { __alive: number }).__alive = 1; });
  await page.evaluate((key) => localStorage.removeItem(key), SYNC_KEY);
  await expect.poll(() => alive(other), { timeout: 8000 }).toBe(false);
  await expect(other).toHaveURL(/#\/entrar/);
  await other.close();
});
