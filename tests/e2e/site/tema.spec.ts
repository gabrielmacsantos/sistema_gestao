import { expect, startLocal, test } from "./support";

const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("a first visit opens in the dark urban theme", async ({ page }) => {
  await startLocal(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bg(page)).toBe("rgb(9, 13, 22)"); // #090d16
});

test("switching to light uses the light tokens and the choice survives a reload", async ({ page }, testInfo) => {
  await startLocal(page);
  if (testInfo.project.name === "site-mobile") {
    await page.locator('[data-act="menu"]').click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Tema claro" }).click();
  } else {
    await page.getByRole("button", { name: "Tema escuro" }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => bg(page)).toBe("rgb(248, 250, 252)"); // #f8fafc, after the 200 ms fade
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f8fafc");
});
