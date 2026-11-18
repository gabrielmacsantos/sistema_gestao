import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The rules live inside the static index.html; load the marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <workspace-core>.*\r?\n([\s\S]*?)\/\/ <\/workspace-core>/.exec(html)?.[1];
if (!block) throw new Error("workspace-core block not found in index.html");

type Rec = { id: string; updatedAt?: number; [k: string]: unknown };
type State = Record<string, any> & { transactions: Rec[]; members: Rec[]; deleted: Record<string, number> };
const core = new Function(
  "hasValidMoney",
  `${block}\nreturn { wsScope, wsSnapshot, wsStampChanges, wsMerge, wsContentKey, wsSharedState, wsFileText, wsReadFile, wsIsOwner, wsRole, wsMemberFor, wsFirstName, wsParseInvite, wsItemKey };`,
)((s: any) => !JSON.stringify(s, (k, v) => (/Cents$/.test(k) && !(Number.isInteger(v) && v >= 0) ? "BAD" : v)).includes('"BAD"')) as {
  wsScope: (base: string, id: string) => string;
  wsSnapshot: (s: State) => Record<string, string>;
  wsStampChanges: (s: State, known: Record<string, string> | null, now: number, author?: { sub: string; name: string }) => Record<string, string>;
  wsMerge: (a: State, b: State) => State;
  wsContentKey: (s: State) => string;
  wsSharedState: (s: State) => State;
  wsFileText: (ws: { name: string; ownerSub: string }, s: State) => string;
  wsReadFile: (text: string) => { name: string; ownerSub: string; savedAt: number; state: State };
  wsIsOwner: (ws: { ownerSub: string } | null, sub: string) => boolean;
  wsRole: (ws: { ownerSub: string }, sub: string) => string;
  wsMemberFor: (me: { sub: string; email: string; name: string }, now: number) => Rec;
  wsFirstName: (n: string) => string;
  wsParseInvite: (t: string) => string | null;
  wsItemKey: (c: string, id: string) => string;
};

const empty = (): State => ({ version: 1, categories: [], transactions: [], recurrings: [], budgets: [], goals: [], trips: [], members: [], deleted: {}, savedAt: 0 });
const tx = (id: string, amountCents: number, extra: Record<string, unknown> = {}): Rec => ({ id, type: "EXPENSE", amountCents, description: id, ...extra });
const total = (s: State) => s.transactions.reduce((sum, t) => sum + (t.amountCents as number), 0);
const ana = { sub: "A", email: "ana@example.com", name: "Ana Souza" };
const beto = { sub: "B", email: "beto@example.com", name: "Beto Lima" };

describe("scope and roles", () => {
  it("keeps every panel in its own scope, apart from the personal one", () => {
    expect(core.wsScope("g:1", "file-x")).toBe("g:1~ws:file-x");
    expect(core.wsScope("g:1", "file-x")).not.toBe(core.wsScope("g:1", "file-y"));
    expect(core.wsScope("g:1", "file-x")).not.toBe(core.wsScope("g:2", "file-x"));
  });
  it("makes only the owner the administrator", () => {
    const ws = { ownerSub: "A" };
    expect(core.wsIsOwner(ws, "A")).toBe(true);
    expect(core.wsIsOwner(ws, "B")).toBe(false);
    expect(core.wsIsOwner(null, "A")).toBe(false);
    expect(core.wsRole(ws, "A")).toBe("ADMIN");
    expect(core.wsRole(ws, "B")).toBe("MEMBER");
  });
});

describe("stamping changes", () => {
  it("stamps changed records, tombstones removed ones and signs new transactions", () => {
    const s = empty();
    s.transactions = [tx("t1", 1000, { updatedAt: 1 }), tx("t2", 2000, { updatedAt: 1 })];
    const known = core.wsSnapshot(s);
    s.transactions[0].amountCents = 1500;
    s.transactions = s.transactions.filter((t) => t.id !== "t2");
    s.transactions.push(tx("t3", 8550));
    core.wsStampChanges(s, known, 100, { sub: "A", name: "Ana" });
    expect(s.transactions.find((t) => t.id === "t1")!.updatedAt).toBe(100);
    expect(s.deleted["transactions:t2"]).toBe(100);
    const t3 = s.transactions.find((t) => t.id === "t3")!;
    expect(t3.updatedAt).toBe(100);
    expect(t3.authorSub).toBe("A");
    expect(t3.authorName).toBe("Ana");
  });
  it("does not touch records that did not change", () => {
    const s = empty();
    s.transactions = [tx("t1", 1000, { updatedAt: 5 })];
    const known = core.wsSnapshot(s);
    core.wsStampChanges(s, known, 100, { sub: "A", name: "Ana" });
    expect(s.transactions[0].updatedAt).toBe(5);
  });
  it("never lets a generated fixed occurrence beat what a person did to it", () => {
    const mine = empty(), theirs = empty();
    const known = core.wsSnapshot(mine);
    mine.transactions = [tx("occ-r1-2026-11", 5000, { source: "RECURRING", recurringId: "r1", status: "PENDING" })];
    core.wsStampChanges(mine, known, 900, { sub: "A", name: "Ana" });
    expect(mine.transactions[0].authorSub).toBeUndefined();
    theirs.transactions = [tx("occ-r1-2026-11", 5000, { source: "RECURRING", recurringId: "r1", status: "PAID", updatedAt: 500 })];
    const merged = core.wsMerge(mine, theirs);
    expect(merged.transactions).toHaveLength(1);
    expect(merged.transactions[0].status).toBe("PAID");
  });
});

describe("merging two copies of a panel", () => {
  it("keeps both people's new transactions and sums them in exact cents (R$ 85,50 + R$ 12,34)", () => {
    const a = empty(), b = empty();
    a.transactions = [tx("a1", 8550, { updatedAt: 10, authorSub: "A" })];
    b.transactions = [tx("b1", 1234, { updatedAt: 11, authorSub: "B" })];
    const m1 = core.wsMerge(a, b), m2 = core.wsMerge(b, a);
    expect(total(m1)).toBe(9784);
    expect(Number.isInteger(total(m1))).toBe(true);
    expect(core.wsContentKey(m1)).toBe(core.wsContentKey(m2));
  });
  it("lets the newest edit of the same record win, in either order", () => {
    const a = empty(), b = empty();
    a.transactions = [tx("t", 1000, { updatedAt: 10 })];
    b.transactions = [tx("t", 2500, { updatedAt: 20 })];
    expect(core.wsMerge(a, b).transactions[0].amountCents).toBe(2500);
    expect(core.wsMerge(b, a).transactions[0].amountCents).toBe(2500);
  });
  it("breaks an exact tie the same way on both devices", () => {
    const a = empty(), b = empty();
    a.transactions = [tx("t", 1000, { updatedAt: 10 })];
    b.transactions = [tx("t", 2000, { updatedAt: 10 })];
    expect(core.wsMerge(a, b).transactions[0].amountCents).toBe(core.wsMerge(b, a).transactions[0].amountCents);
  });
  it("applies a removal made on one side, unless the record was edited after it", () => {
    const a = empty(), b = empty();
    a.deleted = { "transactions:t": 50 };
    b.transactions = [tx("t", 1000, { updatedAt: 40 })];
    expect(core.wsMerge(a, b).transactions).toHaveLength(0);
    b.transactions = [tx("t", 1000, { updatedAt: 60 })];
    const back = core.wsMerge(a, b);
    expect(back.transactions).toHaveLength(1);
    expect(back.deleted["transactions:t"]).toBeUndefined();
  });
  it("converges when the same records arrive through different routes", () => {
    const a = empty(), b = empty(), c = empty();
    a.transactions = [tx("1", 100, { updatedAt: 1 })];
    b.transactions = [tx("2", 200, { updatedAt: 2 })];
    c.transactions = [tx("3", 300, { updatedAt: 3 })];
    const left = core.wsMerge(core.wsMerge(a, b), c), right = core.wsMerge(a, core.wsMerge(c, b));
    expect(core.wsContentKey(left)).toBe(core.wsContentKey(right));
    expect(total(left)).toBe(600);
  });
  it("lets a removed member stay removed even if an old copy still lists them", () => {
    const admin = empty(), stale = empty();
    stale.members = [{ ...core.wsMemberFor(beto, 10) }];
    admin.deleted = { "members:B": 99 };
    expect(core.wsMerge(admin, stale).members).toHaveLength(0);
  });
  it("lets a person who rejoins after being removed come back (their record is newer)", () => {
    const admin = empty(), rejoin = empty();
    admin.deleted = { "members:B": 99 };
    rejoin.members = [core.wsMemberFor(beto, 200)];
    expect(core.wsMerge(rejoin, admin).members.map((m) => m.id)).toEqual(["B"]);
  });
});

describe("the shared file", () => {
  const ws = { name: "Casa", ownerSub: "A" };
  const panel = (): State => ({ ...empty(), members: [core.wsMemberFor(ana, 1)], transactions: [tx("t1", 8550)], savedAt: 7 });
  it("round-trips and leaves personal things out", () => {
    const s = { ...panel(), inbox: [{ id: "n" }], demo: true, demoDismissed: true };
    const read = core.wsReadFile(core.wsFileText(ws, s));
    expect(read.name).toBe("Casa");
    expect(read.ownerSub).toBe("A");
    expect(read.savedAt).toBe(7);
    expect(read.state.inbox).toBeUndefined();
    expect(read.state.demo).toBeUndefined();
    expect(read.state.transactions[0].amountCents).toBe(8550);
  });
  it("refuses a file that is not ours, is malformed or has money that is not integer cents", () => {
    expect(() => core.wsReadFile(JSON.stringify({ app: "other", format: "ws-1", state: panel() }))).toThrow();
    expect(() => core.wsReadFile(JSON.stringify({ app: "minhas-financas", format: "drive-1", ownerSub: "A", state: panel() }))).toThrow();
    const noOwner = JSON.parse(core.wsFileText(ws, panel())); delete noOwner.ownerSub;
    expect(() => core.wsReadFile(JSON.stringify(noOwner))).toThrow();
    const badMember = JSON.parse(core.wsFileText(ws, panel())); badMember.state.members[0].sub = "other";
    expect(() => core.wsReadFile(JSON.stringify(badMember))).toThrow();
    const decimal = JSON.parse(core.wsFileText(ws, panel())); decimal.state.transactions[0].amountCents = 85.5;
    expect(() => core.wsReadFile(JSON.stringify(decimal))).toThrow();
    const negative = JSON.parse(core.wsFileText(ws, panel())); negative.state.transactions[0].amountCents = -1;
    expect(() => core.wsReadFile(JSON.stringify(negative))).toThrow();
  });
});

describe("invite codes and names", () => {
  it("reads the file id from a bare code or a link", () => {
    expect(core.wsParseInvite("1eE5jXDPtXzk-dnBiQTP0e7Ev3KQLaCdF")).toBe("1eE5jXDPtXzk-dnBiQTP0e7Ev3KQLaCdF");
    expect(core.wsParseInvite("  https://x.github.io/app/#/convite?id=abcDEF123456  ")).toBe("abcDEF123456");
    expect(core.wsParseInvite("https://drive.google.com/file/d/abcDEF123456/view")).toBe("abcDEF123456");
    expect(core.wsParseInvite("oi")).toBeNull();
    expect(core.wsParseInvite("")).toBeNull();
  });
  it("shows the first name", () => {
    expect(core.wsFirstName("Gabriel Macedo dos Santos")).toBe("Gabriel");
    expect(core.wsFirstName("")).toBe("");
  });
});
