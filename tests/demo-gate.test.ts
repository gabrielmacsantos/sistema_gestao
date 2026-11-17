import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The rules live inside the static index.html; load the marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <demo-gate>.*\r?\n([\s\S]*?)\/\/ <\/demo-gate>/.exec(html)?.[1];
if (!block) throw new Error("demo-gate block not found in index.html");
const { canOfferDemo, withoutDemo, syncableState } = new Function(`${block}\nreturn { canOfferDemo, withoutDemo, syncableState };`)() as {
  canOfferDemo: (s: Record<string, unknown>) => boolean;
  withoutDemo: (s: any) => any;
  syncableState: (s: any) => any;
};

const empty = () => ({ transactions: [], recurrings: [], budgets: [], goals: [], trips: [], demo: false, demoDismissed: false });
// A sample state, as loadDemo leaves it, plus an occurrence that ensureOccurrences created later (unmarked).
const sample = () => ({
  ...empty(), demo: true,
  transactions: [
    { id: "t1", amountCents: 34280, demo: true },
    { id: "t2", amountCents: 240000, recurringId: "r1", period: "2026-11" },
    { id: "t3", amountCents: 98000, tripId: "v1" },
  ],
  recurrings: [{ id: "r1", amountCents: 240000, demo: true }],
  budgets: [{ id: "b1", amountCents: 30000, demo: true }],
  goals: [{ id: "g1", targetCents: 2000000, savedCents: 640000, demo: true }],
  trips: [{ id: "v1", demo: true }],
});

describe("canOfferDemo", () => {
  it("is offered to a first access with an empty account", () => {
    expect(canOfferDemo(empty())).toBe(true);
  });
  it("disappears once any real record exists", () => {
    for (const k of ["transactions", "recurrings", "budgets", "goals", "trips"]) {
      expect(canOfferDemo({ ...empty(), [k]: [{ id: "x" }] }), k).toBe(false);
    }
  });
  it("disappears while the sample is active and after it was used or dismissed", () => {
    expect(canOfferDemo({ ...empty(), demo: true })).toBe(false);
    expect(canOfferDemo({ ...empty(), demoDismissed: true })).toBe(false);
  });
});

describe("withoutDemo", () => {
  it("removes the sample and what grew out of it, and never offers it again", () => {
    const out = withoutDemo(sample());
    expect(out).toMatchObject({ transactions: [], recurrings: [], budgets: [], goals: [], trips: [], demo: false, demoDismissed: true });
    expect(canOfferDemo(out)).toBe(false);
  });
  it("keeps every real record untouched", () => {
    const real = { transactions: [{ id: "a", amountCents: 1990 }], recurrings: [{ id: "ra" }], budgets: [{ id: "ba" }], goals: [{ id: "ga" }], trips: [{ id: "va" }] };
    const s = sample();
    const mixed = { ...s, transactions: [...s.transactions, { ...real.transactions[0], recurringId: "ra" }], recurrings: [...s.recurrings, ...real.recurrings],
      budgets: [...s.budgets, ...real.budgets], goals: [...s.goals, ...real.goals], trips: [...s.trips, ...real.trips] };
    const out = withoutDemo(mixed);
    expect(out.transactions).toEqual(real.transactions.map((t) => ({ ...t, recurringId: "ra" })));
    expect(out.recurrings).toEqual(real.recurrings);
    expect(out.budgets).toEqual(real.budgets);
    expect(out.goals).toEqual(real.goals);
    expect(out.trips).toEqual(real.trips);
  });
});

describe("syncableState", () => {
  it("sends a normal state as it is", () => {
    const s = { ...empty(), transactions: [{ id: "a" }] };
    expect(syncableState(s)).toBe(s);
  });
  it("sends nothing while only the sample exists", () => {
    expect(syncableState(sample())).toBeNull();
  });
  it("sends only the real records when they were added over the sample", () => {
    const s = sample();
    s.transactions.push({ id: "real", amountCents: 500 } as never);
    const out = syncableState(s);
    expect(out.transactions).toEqual([{ id: "real", amountCents: 500 }]);
    expect(out.demo).toBe(false);
    expect(out.recurrings).toEqual([]);
  });
});
