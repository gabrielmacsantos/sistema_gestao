import { expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./support/auth";

test("bell shows unread notices, marks them as read per user and remembers it", async ({ page, context }, testInfo) => {
  const stamp = `${testInfo.project.name}-${Date.now()}`;
  await signUpAndConfirm(page, `e2e-bell-a-${stamp}@test.dev`);
  await page.goto("/dashboard");

  const bell = page.getByRole("button", { name: /^Notificações, \d+ não lidas?$/ });
  await expect(bell).toBeVisible();
  const box = await bell.boundingBox();
  expect(box!.width + 12).toBeGreaterThanOrEqual(48); // 36px button + 6px touch area on each side
  await expect(bell).toHaveAttribute("aria-label", "Notificações, 3 não lidas");

  await bell.click();
  const panel = page.getByRole("dialog", { name: "Notificações" });
  await expect(panel.getByRole("heading", { level: 3 }).first()).toHaveText(/^Entrar com o Google/); // newest first
  await expect(panel.getByRole("link")).toHaveCount(0); // actionUrl is inactive: no links in this phase

  await panel.getByRole("button", { name: "Marcar como lida" }).first().click();
  await expect(page.getByRole("button", { name: "Notificações, 2 não lidas" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  await page.reload();
  await expect(page.getByRole("button", { name: "Notificações, 2 não lidas" })).toBeVisible();
  await page.getByRole("button", { name: "Notificações, 2 não lidas" }).click();
  await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await expect(page.getByRole("button", { name: "Notificações", exact: true })).toBeVisible();

  // Another account on the same browser starts with its own unread notices.
  await context.clearCookies();
  await signUpAndConfirm(page, `e2e-bell-b-${stamp}@test.dev`);
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Notificações, 3 não lidas" })).toBeVisible();
});
