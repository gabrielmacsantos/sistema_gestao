import type { Page } from "@playwright/test";
import { expect, test } from "./support";

// Google sign-in inside the app (Android), with a fake Capacitor standing in for the phone: the account chooser
// either hands back a token and a profile, or fails with the plugin's own error.

type Mode = "ok" | "cancel" | "developer-error" | "no-token";

async function openAsApp(page: Page, mode: Mode) {
  await page.addInitScript((m) => {
    const calls: unknown[][] = [];
    const plugin = (name: string) => new Proxy({}, {
      get: (_t, method: string) => {
        if (method === "then") return undefined;
        return (...args: unknown[]) => {
          calls.push([name, method, ...args]);
          if (name === "App" && method === "getInfo") return Promise.resolve({ build: "92", version: "1.0.0" });
          if (method === "addListener") return Promise.resolve({ remove() {} });
          if (name === "SocialLogin" && method === "login") {
            if (m === "cancel") return Promise.reject(new Error("User cancelled the login"));
            if (m === "developer-error") return Promise.reject(Object.assign(new Error("[28444] Developer console is not set up correctly."), { code: "10" }));
            if (m === "no-token") return Promise.resolve({ provider: "google", result: { accessToken: null, profile: { id: "123", email: "nova@example.com", name: "Nova Pessoa" } } });
            return Promise.resolve({ provider: "google", result: { accessToken: { token: "tok-123" }, idToken: "x", profile: { id: "123", email: "nova@example.com", name: "Nova Pessoa", imageUrl: null } } });
          }
          return Promise.resolve({});
        };
      },
    });
    (window as unknown as Record<string, unknown>).__calls = calls;
    (window as unknown as Record<string, unknown>).Capacitor = {
      isNativePlatform: () => true,
      PluginHeaders: ["App", "Browser", "Filesystem", "Share", "SocialLogin", "SpeechRecognition", "StatusBar"].map((name) => ({ name })),
      registerPlugin: plugin,
    };
  }, mode);
  // Drive: no file yet, and every upload works.
  await page.route("https://www.googleapis.com/**", (route) => {
    const url = route.request().url();
    if (route.request().method() === "GET" && url.includes("/drive/v3/files")) return route.fulfill({ json: { files: [] } });
    if (url.includes("userinfo")) return route.fulfill({ json: { sub: "123", email: "nova@example.com", name: "Nova Pessoa" } });
    return route.fulfill({ json: { id: "file-1" } });
  });
  await page.route("https://api.github.com/**", (route) => route.fulfill({ status: 404, json: {} }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entre para guardar seus dados" })).toBeVisible();
}
const googleButton = (page: Page) => page.getByRole("button", { name: "Continuar com o Google" });

test("in the app, a Google account that signs in lands on the Painel with the account", async ({ page }) => {
  await openAsApp(page, "ok");
  await googleButton(page).click();
  await expect(page).toHaveURL(/#\/painel/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /Gestão financeira/ })).toBeVisible();
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("minhas-financas:github") || "{}"));
  expect(session).toMatchObject({ provider: "google", sub: "123", email: "nova@example.com" });
  await expect(page.locator("#google-error")).toHaveCount(0); // the sign-in screen is gone
});

test("in the app, when the plugin fails the screen says why and keeps saying it", async ({ page }) => {
  await openAsApp(page, "developer-error");
  await googleButton(page).click();
  const box = page.locator("#google-error");
  await expect(box).toBeVisible();
  await expect(box).toContainText("Não foi possível entrar com o Google");
  await expect(box).toContainText("etapa: conta do Google");
  await expect(box).toContainText("10: [28444] Developer console is not set up correctly.");
  await expect(box).toContainText("gabrielmac.dossantos@gmail.com");
  await page.waitForTimeout(5000); // past the 4.5 s of the toast: the message is still there
  await expect(box).toBeVisible();
  await expect(googleButton(page)).toBeEnabled(); // and the person can try again
  await expect(page).toHaveURL(/#\/entrar/);
});

test("in the app, cancelling the chooser is not shown as an error", async ({ page }) => {
  await openAsApp(page, "cancel");
  await googleButton(page).click();
  await expect(page.getByText("Login com o Google cancelado")).toBeVisible();
  await expect(page.locator("#google-error")).toBeHidden();
  await expect(googleButton(page)).toBeEnabled();
});

test("in the app, a login without Drive permission asks for it, naming the step", async ({ page }) => {
  await openAsApp(page, "no-token");
  await googleButton(page).click();
  const box = page.locator("#google-error");
  await expect(box).toContainText("permita o acesso ao Google Drive");
  await expect(box).toContainText("etapa: conta do Google");
});
