import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The flags live inside the static index.html; load the marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <feature-flags>.*\r?\n([\s\S]*?)\/\/ <\/feature-flags>/.exec(html)?.[1];
if (!block) throw new Error("feature-flags block not found in index.html");
const { ENABLE_IMPORT_FEATURE, ENABLE_BANK_NOTIFICATIONS, FEATURE_FLAGS, visibleRoutes } = new Function(
  `${block}\nreturn { ENABLE_IMPORT_FEATURE, ENABLE_BANK_NOTIFICATIONS, FEATURE_FLAGS, visibleRoutes };`,
)() as {
  ENABLE_IMPORT_FEATURE: boolean;
  ENABLE_BANK_NOTIFICATIONS: boolean;
  FEATURE_FLAGS: Record<string, boolean>;
  visibleRoutes: (routes: { path: string }[], flags: Record<string, boolean>) => { path: string }[];
};

const routes = [{ path: "painel" }, { path: "importar" }, { path: "configuracoes" }];

describe("feature flags", () => {
  it("ships the test build with Importar and bank notifications off", () => {
    expect(ENABLE_IMPORT_FEATURE).toBe(false);
    expect(ENABLE_BANK_NOTIFICATIONS).toBe(false);
    expect(FEATURE_FLAGS.importar).toBe(false);
  });

  it("leaves a route out of the menus when its flag is off", () => {
    expect(visibleRoutes(routes, { importar: false }).map((r) => r.path)).toEqual(["painel", "configuracoes"]);
  });

  it("brings the route back when the flag is on, and keeps routes without a flag", () => {
    expect(visibleRoutes(routes, { importar: true })).toHaveLength(3);
    expect(visibleRoutes(routes, {})).toHaveLength(3);
  });

  it("never registers the native notification plugin while its flag is off", () => {
    expect(html).toContain('...(ENABLE_BANK_NOTIFICATIONS ? ["BankNotifications"] : [])');
  });
});
