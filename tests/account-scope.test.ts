import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The rules live inside the static index.html; load the marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <account-scope>.*\r?\n([\s\S]*?)\/\/ <\/account-scope>/.exec(html)?.[1];
if (!block) throw new Error("account-scope block not found in index.html");
const { scopeOf, storageKey, photoDbName, hasRealData, decideLink, connectivityLabel, OFFLINE_LABEL, sessionAccountChanged } = new Function(
  `${block}\nreturn { scopeOf, storageKey, photoDbName, hasRealData, decideLink, connectivityLabel, OFFLINE_LABEL, sessionAccountChanged };`,
)() as {
  scopeOf: (s: unknown) => string;
  storageKey: (scope: string) => string;
  photoDbName: (scope: string, legacyOwner: string | null) => string;
  hasRealData: (s: unknown) => boolean;
  decideLink: (local: boolean, remote: boolean) => "none" | "ask" | "separate";
  connectivityLabel: (online: boolean, hasSession: boolean) => string | null;
  OFFLINE_LABEL: string;
  sessionAccountChanged: (oldRaw: string | null, newRaw: string | null) => boolean;
};

// A tiny stand-in for localStorage plus the same read/write the app does per scope.
const makeDevice = () => {
  const store = new Map<string, string>();
  return {
    save: (sync: unknown, state: unknown) => store.set(storageKey(scopeOf(sync)), JSON.stringify(state)),
    read: (sync: unknown) => {
      const raw = store.get(storageKey(scopeOf(sync)));
      return raw ? JSON.parse(raw) : { transactions: [] };
    },
  };
};
const userA = { provider: "google", sub: "111", email: "a@example.com" };
const userB = { provider: "google", sub: "222", email: "b@example.com" };
const expense = (amountCents: number) => ({ id: "t1", type: "EXPENSE", amountCents });
const total = (s: { transactions: { amountCents: number }[] }) => s.transactions.reduce((sum, t) => sum + t.amountCents, 0);

describe("scopeOf", () => {
  it("separates Google accounts, GitHub logins and no account", () => {
    expect(scopeOf(userA)).toBe("g:111");
    expect(scopeOf(userB)).toBe("g:222");
    expect(scopeOf({ login: "maria" })).toBe("gh:maria");
    expect(scopeOf(null)).toBe("local");
  });
  it("never falls back to the no-account scope for a session without an id", () => {
    expect(scopeOf({ provider: "google" })).toBe("unknown");
    expect(scopeOf({})).toBe("unknown");
  });
});

describe("storage per account", () => {
  it("scenario 1: user B starts empty after user A recorded R$ 100,00", () => {
    const device = makeDevice();
    device.save(userA, { transactions: [expense(10000)] });
    expect(total(device.read(userA))).toBe(10000);
    // A signs out, B signs in on the same device.
    expect(device.read(userB).transactions).toEqual([]);
    expect(total(device.read(userB))).toBe(0);
  });
  it("keeps what was made without an account apart from every account", () => {
    const device = makeDevice();
    device.save(null, { transactions: [expense(4590)] });
    expect(device.read(userA).transactions).toEqual([]);
    expect(total(device.read(null))).toBe(4590);
  });
  it("never reuses the old single key", () => {
    expect(storageKey("local")).not.toBe("minhas-financas:v1");
    expect(storageKey("g:111")).not.toBe(storageKey("g:222"));
  });
});

describe("photoDbName", () => {
  it("keeps the old database for the scope that owned the old data", () => {
    expect(photoDbName("local", "local")).toBe("minhas-financas");
    expect(photoDbName("g:111", "local")).toBe("minhas-financas:g:111");
  });
  it("uses a database of its own per scope when nothing was migrated", () => {
    expect(photoDbName("local", null)).toBe("minhas-financas:local");
    expect(photoDbName("g:111", null)).not.toBe(photoDbName("g:222", null));
  });
});

describe("hasRealData", () => {
  it("is false for an empty state, the sample and nothing", () => {
    expect(hasRealData(null)).toBe(false);
    expect(hasRealData({ transactions: [], recurrings: [], budgets: [], goals: [], trips: [] })).toBe(false);
    expect(hasRealData({ demo: true, transactions: [expense(100)] })).toBe(false);
  });
  it("is true as soon as a real record exists", () => {
    for (const k of ["transactions", "recurrings", "budgets", "goals", "trips"]) {
      expect(hasRealData({ [k]: [{ id: "x" }] }), k).toBe(true);
    }
  });
});

describe("decideLink", () => {
  it("does not ask when there is nothing made without an account", () => {
    expect(decideLink(false, false)).toBe("none");
    expect(decideLink(false, true)).toBe("none");
  });
  it("asks when the account is new", () => {
    expect(decideLink(true, false)).toBe("ask");
  });
  it("never merges into an account that already has data", () => {
    expect(decideLink(true, true)).toBe("separate");
  });
});

describe("connectivityLabel", () => {
  it("shows the offline notice only with a session and no connection", () => {
    expect(connectivityLabel(false, true)).toBe(OFFLINE_LABEL);
    expect(OFFLINE_LABEL).toBe("Modo offline • Dados salvos no dispositivo");
  });
  it("shows nothing when online or without a session", () => {
    expect(connectivityLabel(true, true)).toBeNull();
    expect(connectivityLabel(false, false)).toBeNull();
  });
});

describe("another tab changing the stored session", () => {
  const session = (extra: object = {}) => JSON.stringify({ provider: "google", sub: "111", email: "a@x.com", ...extra });
  it("does not restart the tab for the same account (token or last-sync updates)", () => {
    expect(sessionAccountChanged(session({ lastSync: 1 }), session({ lastSync: 2 }))).toBe(false);
    expect(sessionAccountChanged(session({ token: { access: "a" } }), session({ token: { access: "b" } }))).toBe(false);
  });
  it("restarts it when someone signs in, signs out or switches account", () => {
    expect(sessionAccountChanged(null, session())).toBe(true);
    expect(sessionAccountChanged(session(), null)).toBe(true);
    expect(sessionAccountChanged(session(), session({ sub: "222" }))).toBe(true);
    expect(sessionAccountChanged(session(), JSON.stringify({ login: "maria" }))).toBe(true);
  });
  it("treats an unreadable value as a change instead of ignoring it", () => {
    expect(sessionAccountChanged(session(), "{not json")).toBe(true);
  });
});
