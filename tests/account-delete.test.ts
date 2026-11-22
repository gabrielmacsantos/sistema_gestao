import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The rules live inside the static index.html; load the marked blocks (delete uses the scope helpers) and evaluate them.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = (name: string) => {
  const code = new RegExp(`// <${name}>.*\\r?\\n([\\s\\S]*?)// </${name}>`).exec(html)?.[1];
  if (!code) throw new Error(`${name} block not found in index.html`);
  return code;
};
const api = new Function(
  `${block("account-scope")}\n${block("account-delete")}\nreturn { scopeOf, storageKey, deletionPlan, deletionBlocker, confirmationMatches, DELETE_PHRASE };`,
)() as {
  scopeOf: (s: unknown) => string;
  storageKey: (scope: string) => string;
  deletionPlan: (sync: unknown, legacyPhotoOwner: string | null) => null | {
    scope: string; localStorageKeys: string[]; photoDatabases: string[]; clearPhotoOwner: boolean;
  };
  deletionBlocker: (c: { online: boolean; hasSession: boolean }) => string | null;
  confirmationMatches: (typed: string) => boolean;
  DELETE_PHRASE: string;
};

const userA = { provider: "google", sub: "111", email: "ana@example.com" };
const userB = { provider: "google", sub: "222", email: "beto@example.com" };

// A stand-in for localStorage holding two accounts, the no-account scope and device preferences.
function device() {
  const store = new Map<string, string>([
    [api.storageKey("g:111"), "A-data"], ["goals-celebrated:111", "[]"], ["notices-read:111", "[]"],
    [api.storageKey("g:222"), "B-data"], ["goals-celebrated:222", "[]"], ["notices-read:222", "[]"],
    [api.storageKey("local"), "no-account-data"],
    ["mf-theme", "dark"], ["mf-hide-values", "1"], ["mf-rail-collapsed", "1"], ["mf-voice-ok", "1"],
  ]);
  return { store, wipe: (sync: unknown, owner: string | null = null) => { for (const k of api.deletionPlan(sync, owner)!.localStorageKeys) store.delete(k); } };
}

describe("deletionPlan", () => {
  it("lists only the signed-in account's own keys and photo database", () => {
    const plan = api.deletionPlan(userA, null)!;
    expect(plan.scope).toBe("g:111");
    expect(plan.localStorageKeys.sort()).toEqual([api.storageKey("g:111"), "goals-celebrated:111", "notices-read:111", "mf-tour-done:g:111"].sort());
    expect(plan.photoDatabases).toEqual(["minhas-financas:g:111"]);
    expect(plan.clearPhotoOwner).toBe(false);
  });

  it("scenario 1: wipes the account's records and marks, and nothing of anyone else", () => {
    const d = device();
    d.wipe(userA);
    expect(d.store.has(api.storageKey("g:111"))).toBe(false);
    expect(d.store.has("goals-celebrated:111")).toBe(false);
    expect(d.store.has("notices-read:111")).toBe(false);
    // Another account on the same device, the no-account data and the device preferences stay.
    expect(d.store.get(api.storageKey("g:222"))).toBe("B-data");
    expect(d.store.get("goals-celebrated:222")).toBe("[]");
    expect(d.store.get("notices-read:222")).toBe("[]");
    expect(d.store.get(api.storageKey("local"))).toBe("no-account-data");
    for (const pref of ["mf-theme", "mf-hide-values", "mf-rail-collapsed", "mf-voice-ok"]) expect(d.store.has(pref), pref).toBe(true);
  });

  it("deleting one account never touches the other, in either direction", () => {
    const d = device();
    d.wipe(userB);
    expect(d.store.get(api.storageKey("g:111"))).toBe("A-data");
    expect(d.store.has(api.storageKey("g:222"))).toBe(false);
  });

  it("uses the old photo database only for the scope that owned it, and then forgets that owner", () => {
    expect(api.deletionPlan(userA, "g:111")).toMatchObject({ photoDatabases: ["minhas-financas"], clearPhotoOwner: true });
    expect(api.deletionPlan(userA, "local")).toMatchObject({ photoDatabases: ["minhas-financas:g:111"], clearPhotoOwner: false });
  });

  it("covers an older GitHub account by its login", () => {
    const plan = api.deletionPlan({ login: "maria" }, null)!;
    expect(plan.scope).toBe("gh:maria");
    expect(plan.localStorageKeys).toContain("goals-celebrated:maria");
  });

  it("refuses to plan a wipe of the no-account scope or of a session without an id", () => {
    expect(api.deletionPlan(null, null)).toBeNull();
    expect(api.deletionPlan({ provider: "google" }, null)).toBeNull();
    expect(api.deletionPlan({}, null)).toBeNull();
  });
});

describe("confirmationMatches", () => {
  it("accepts the phrase in any case with surrounding spaces", () => {
    expect(api.DELETE_PHRASE).toBe("EXCLUIR");
    for (const typed of ["EXCLUIR", "excluir", " Excluir ", "ExCLuiR\n"]) expect(api.confirmationMatches(typed), typed).toBe(true);
  });
  it("refuses anything else, so a stray tap or a near miss deletes nothing", () => {
    for (const typed of ["", "excluir tudo", "EXCLUI", "EXCLUIRR", "sim", "ana@example.com", "EXCLU IR"]) expect(api.confirmationMatches(typed), typed).toBe(false);
  });
});

describe("deletionBlocker", () => {
  it("needs the connection, because the copy in the cloud is deleted too", () => {
    expect(api.deletionBlocker({ online: false, hasSession: true })).toBe("offline");
    expect(api.deletionBlocker({ online: true, hasSession: true })).toBeNull();
  });
  it("has nothing to delete without an account", () => {
    expect(api.deletionBlocker({ online: true, hasSession: false })).toBe("no-account");
  });
});

describe("the screen", () => {
  it("wipes the cloud before the device, so a failed cloud deletion leaves everything in place", () => {
    const run = /async function runDeleteAccount\(\)[\s\S]*?\n}\n/.exec(html)?.[0] ?? "";
    const order = ["deleteCloudData()", "revokeGoogleAccess()", "wipeAccountFromDevice(plan)"].map((s) => run.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
