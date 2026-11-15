import { expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./support/auth";

test("the side menu collapses to icons, keeps navigating and remembers the choice", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The collapsible rail is a desktop control (lg and up).");
  await page.setViewportSize({ width: 1280, height: 800 });
  await signUpAndConfirm(page, `e2e-rail-${testInfo.project.name}-${Date.now()}@test.dev`);
  await page.goto("/dashboard");

  const rail = page.locator("#app-rail");
  const toggle = page.getByRole("button", { name: "Recolher menu" });
  const width = async () => Math.round((await rail.boundingBox())!.width);

  // Expanded by default: labels, the full "Novo gasto" button and the profile card are shown.
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await width()).toBe(260);
  await expect(rail.getByText("Minhas Finanças")).toBeVisible();
  await expect(rail.getByText("Lançamentos")).toBeVisible();

  // The toggle is at least 44x44.
  const box = (await toggle.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  // Collapse: 80px dock, only icons, content takes the space, no horizontal overflow.
  await toggle.click();
  const expand = page.getByRole("button", { name: "Expandir menu" });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect.poll(width).toBe(80);
  await expect(rail.getByText("Lançamentos")).toBeHidden();
  await expect(rail.getByText("Minhas Finanças")).toBeHidden();
  const main = (await page.locator("main").boundingBox())!;
  expect(main.x).toBeGreaterThanOrEqual(80);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Icons keep names (tooltips) and navigate normally.
  await expect(rail.getByRole("link", { name: "Lançamentos" })).toHaveAttribute("title", "Lançamentos");
  await rail.getByRole("link", { name: "Lançamentos" }).click();
  await expect(page).toHaveURL(/\/lancamentos/);
  await expect(page.getByRole("button", { name: "Expandir menu" })).toBeVisible();

  // The choice survives a reload (and is applied before paint).
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.rail)).toBe("collapsed");
  await expect.poll(width).toBe(80);

  // Expand again: back to 260px with labels.
  await page.getByRole("button", { name: "Expandir menu" }).click();
  await expect.poll(width).toBe(260);
  await expect(rail.getByText("Lançamentos")).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.rail)).toBeUndefined();
});

test("phone menu button swaps hamburger and close with the sheet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone-only control.");
  await signUpAndConfirm(page, `e2e-swap-${testInfo.project.name}-${Date.now()}@test.dev`);
  await page.goto("/dashboard");

  const button = page.getByRole("button", { name: "Mais opções" });
  const swap = button.locator(".t-icon-swap");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(swap).toHaveAttribute("data-state", "a");

  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(swap).toHaveAttribute("data-state", "b");

  await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Fechar" }).click();
  await expect(swap).toHaveAttribute("data-state", "a");
  await expect(button).toHaveAttribute("aria-expanded", "false");

  // Esc closes it too.
  await button.click();
  await expect(swap).toHaveAttribute("data-state", "b");
  await page.keyboard.press("Escape");
  await expect(swap).toHaveAttribute("data-state", "a");
});
