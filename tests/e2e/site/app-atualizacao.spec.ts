import type { Page } from "@playwright/test";
import { expect, test } from "./support";

// The installed app compares its own build with the one in the published download and offers the update.
// A fake Capacitor stands in for the phone: it reports the installed build and records what the app asks of the system.

const APK = "https://github.com/gabrielmacsantos/sistema_gestao/releases/download/app-latest/minhas-financas.apk";
const release = (build: number) => ({
  body: `Versão de teste do app (1.0.0, build ${build}). O .apk instala direto no celular.\n\n- Corrigido o recarregamento infinito da tela quando o app está aberto em mais de uma aba.\n- Aviso BETA com a contagem de dias.\n\n<!-- build:${build} sha:181e0a8 -->\n`,
  assets: [{ name: "minhas-financas.aab", browser_download_url: "https://example.com/x.aab" }, { name: "minhas-financas.apk", browser_download_url: APK }],
});

async function openAsApp(page: Page, installed: number, published: number) {
  await page.addInitScript((build) => {
    const calls: unknown[][] = [];
    const plugin = (name: string) => new Proxy({}, {
      get: (_t, method: string) => {
        if (method === "then") return undefined; // a plugin proxy must never look like a promise
        return (...args: unknown[]) => {
          calls.push([name, method, ...args]);
          if (name === "App" && method === "getInfo") return Promise.resolve({ build: String(build), version: "1.0.0" });
          if (method === "addListener") return Promise.resolve({ remove() {} });
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
  }, installed);
  await page.route("https://api.github.com/**", (route) => route.fulfill({ json: release(published) }));
  await page.goto("/");
  await page.getByRole("button", { name: /Usar sem conta/ }).click();
  await expect(page).toHaveURL(/#\/painel/);
}
const notice = (page: Page) => page.locator(".notice", { hasText: "Nova versão do app disponível" });

test("an app on build 88 is offered build 91, with what changed, and Atualizar opens the download", async ({ page }) => {
  await openAsApp(page, 88, 91);
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText("Corrigido o recarregamento infinito da tela");
  await expect(notice(page)).toContainText("Aviso BETA com a contagem de dias");
  await notice(page).getByRole("button", { name: "Atualizar" }).click();
  const opened = await page.evaluate(() => (window as unknown as { __calls: unknown[][] }).__calls.filter((c) => c[0] === "Browser" && c[1] === "open"));
  expect(opened).toHaveLength(1);
  expect(opened[0][2]).toEqual({ url: APK }); // the .apk, not the .aab
});

test("an app already on the latest build is not bothered", async ({ page }) => {
  await openAsApp(page, 91, 91);
  await page.waitForTimeout(1200);
  await expect(notice(page)).toHaveCount(0);
});

test("'Agora não' hides it for that build only; the next build offers it again", async ({ page }) => {
  await openAsApp(page, 88, 91);
  await notice(page).getByRole("button", { name: "Agora não" }).click();
  await expect(notice(page)).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(1200);
  await expect(notice(page)).toHaveCount(0); // same build 91: stays quiet

  // A newer build is published: the notice comes back.
  await page.unroute("https://api.github.com/**");
  await page.route("https://api.github.com/**", (route) => route.fulfill({ json: release(92) }));
  await page.evaluate(() => localStorage.setItem("mf-app-update", JSON.stringify({ ...JSON.parse(localStorage.getItem("mf-app-update") || "{}"), checkedAt: 0 })));
  await page.reload();
  await expect(notice(page)).toBeVisible();
});

test("offline: no error and no notice, the app keeps working", async ({ page }) => {
  await openAsApp(page, 88, 91);
  await page.unroute("https://api.github.com/**");
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.evaluate(() => localStorage.removeItem("mf-app-update"));
  await page.reload();
  await page.waitForTimeout(1200);
  await expect(notice(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Gestão financeira/ })).toBeVisible();
});
