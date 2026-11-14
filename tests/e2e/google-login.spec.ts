import { expect, test } from "@playwright/test";

// Our notice only: Next.js also has a role="alert" route announcer.
const notice = (page: import("@playwright/test").Page) => page.locator('p[role="alert"]');

// Google itself is never reached here: the E2E server has a made-up client (playwright.config.ts),
// so these tests cover everything on our side of the trip.

test("the welcome screen offers Google first and shows a spinner while leaving", async ({ page }) => {
  await page.clock.install();
  await page.goto("/login");
  const button = page.getByRole("link", { name: "Continuar com o Google" });
  await expect(button).toBeVisible();
  await expect(page.getByText("ou entre com e-mail")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();

  // The trip to Google goes nowhere (an empty answer keeps the browser on this page), as when the
  // connection drops after the click.
  await page.route("**/api/auth/google", (route) => route.fulfill({ status: 204 }));
  await button.click();
  await expect(page.getByText("Conectando ao Google…")).toBeVisible();
  await expect(page.getByRole("link", { name: "Conectando ao Google…" })).toHaveAttribute("aria-busy", "true");

  // After a while the button comes back with a notice instead of spinning forever.
  await page.clock.fastForward(16_000);
  await expect(notice(page)).toContainText("Sem conexão com o Google");
  await expect(page.getByRole("link", { name: "Continuar com o Google" })).toHaveAttribute("aria-busy", "false");
});

test("without internet it says so quietly and the button keeps working", async ({ page, context }) => {
  await page.goto("/login");
  await context.setOffline(true);
  await page.getByRole("link", { name: "Continuar com o Google" }).click();
  await expect(notice(page)).toContainText("Sem conexão com o Google");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Continuar com o Google" })).toHaveAttribute("aria-busy", "false");
  await context.setOffline(false);
});

test("leaving for Google uses PKCE and a state cookie, and never shows the secret", async ({ request }) => {
  const response = await request.get("/api/auth/google", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const location = new URL(response.headers().location);
  expect(location.origin).toBe("https://accounts.google.com");
  expect(location.searchParams.get("client_id")).toBe("e2e-client.apps.googleusercontent.com");
  expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:3100/api/auth/google/callback");
  expect(location.searchParams.get("code_challenge_method")).toBe("S256");
  expect(location.searchParams.get("state")).toBeTruthy();
  expect(location.toString()).not.toContain("e2e-secret");
  const cookie = response.headers()["set-cookie"];
  expect(cookie).toMatch(/fin_oauth=/);
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/Path=\/api\/auth\/google/i);
});

test("cancelling at Google comes back to a friendly message, shown once", async ({ page }) => {
  await page.goto("/api/auth/google/callback?error=access_denied");
  await expect(page).toHaveURL(/\/login/);
  await expect(notice(page)).toContainText("Login com o Google cancelado");
  await expect(page).toHaveURL(/\/login$/); // the code is dropped from the address
  await expect(page.getByRole("link", { name: "Continuar com o Google" })).toBeEnabled();
});

test("a return that did not start here is refused", async ({ page }) => {
  await page.goto("/api/auth/google/callback?code=forged&state=forged");
  await expect(notice(page)).toContainText("demorou demais");
  await expect(page).toHaveURL(/\/login$/);
});

test("a link cannot put its own words on the login page", async ({ page }) => {
  await page.goto("/login?erro=Sua%20conta%20foi%20bloqueada");
  await expect(page.getByRole("link", { name: "Continuar com o Google" })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
});
