import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The check lives inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <money-check>.*\r?\n([\s\S]*?)\/\/ <\/money-check>/.exec(html)?.[1];
if (!block) throw new Error("money-check block not found in index.html");
const hasValidMoney = new Function(`${block}\nreturn hasValidMoney;`)() as (data: unknown) => boolean;

const backup = (overrides = {}) => ({
  version: 1,
  transactions: [{ amountCents: 850000 }, { amountCents: 482050 }],
  recurrings: [{ amountCents: 240000 }],
  budgets: [{ amountCents: 30000 }],
  goals: [{ targetCents: 2000000, savedCents: 0 }],
  trips: [{ budgetCents: 300000 }, { budgetCents: null }, {}],
  ...overrides,
});

describe("hasValidMoney", () => {
  it("accepts integer cents and older backups without the newer lists", () => {
    expect(hasValidMoney(backup())).toBe(true);
    expect(hasValidMoney({ version: 1, transactions: [{ amountCents: 0 }] })).toBe(true);
  });

  it.each([
    ["a decimal amount", { transactions: [{ amountCents: 12.5 }] }],
    ["a text amount, which the sums would concatenate", { transactions: [{ amountCents: "1000" }] }],
    ["a negative amount", { recurrings: [{ amountCents: -100 }] }],
    ["a missing amount", { budgets: [{}] }],
    ["an unsafe integer", { transactions: [{ amountCents: 2 ** 53 }] }],
    ["a decimal goal", { goals: [{ targetCents: 100, savedCents: 0.1 }] }],
    ["a text trip budget", { trips: [{ budgetCents: "300000" }] }],
    ["a list that is not a list", { budgets: {} }],
    ["an empty entry", { transactions: [null] }],
  ])("rejects %s", (_, overrides) => {
    expect(hasValidMoney(backup(overrides))).toBe(false);
  });

  it("rejects missing data", () => {
    expect(hasValidMoney(null)).toBe(false);
  });
});
