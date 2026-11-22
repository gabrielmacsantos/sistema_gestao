import { expect, test as base, type Page } from "@playwright/test";

/**
 * `page` for the static site: nothing leaves this machine (the Google script and fonts are blocked)
 * and a test fails if the page throws or logs a console error.
 */
export const test = base.extend<{ withTour: boolean }>({
  // The first-access tour would sit over every other test; only tour.spec.ts turns it on (`test.use({ withTour: true })`).
  withTour: [false, { option: true }],
  page: async ({ page, withTour }, runTest) => {
    if (!withTour) {
      await page.addInitScript(() => {
        const get = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key: string) {
          return key.startsWith("mf-tour-done:") ? "1" : get.call(this, key);
        };
      });
    }
    await page.route(
      (url) => url.protocol.startsWith("http") && !["localhost", "127.0.0.1"].includes(url.hostname),
      (route) => route.abort(),
    );
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("console", (message) => {
      // Blocked requests (Google, fonts) log "Failed to load resource": expected here.
      if (message.type() === "error" && !/Failed to load resource|net::ERR/.test(message.text())) problems.push(message.text());
    });
    await runTest(page);
    expect(problems, "console errors and uncaught exceptions").toEqual([]);
  },
});

export { expect };

/** Opens the site and enters "Usar sem conta": data only in this browser, which starts empty. */
export async function startLocal(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toBeVisible();
  await page.getByRole("button", { name: /Usar sem conta/ }).click();
  await expect(page).toHaveURL(/#\/painel/);
  await expect(page.getByRole("heading", { name: /Bem-vindo ao Nexus Financy IA/ })).toBeVisible();
}

/** Clicks whichever "new transaction" control the layout shows (top bar or rail on desktop, + on the phone). */
export async function openNewTransaction(page: Page) {
  await page.locator('.bottomnav .fab:visible, .topbar [data-act="new-tx"]:visible').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** Types the digits of an amount the way the till-style mask expects them ("4590" becomes 45,90). */
export async function typeAmount(page: Page, digits: string) {
  const field = page.getByRole("dialog").getByLabel("Valor", { exact: false }).first();
  await field.click();
  await field.pressSequentially(digits);
}

/** True when the page does not scroll sideways (a classic mobile layout bug). */
export const fitsWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
