import { describe, expect, it } from "vitest";
import { percentChange, ratio, splitExpenses } from "./cashflow";

describe("splitExpenses", () => {
  it("separates recurring expenses from variable ones and ignores income and tombstones", () => {
    const split = splitExpenses(
      [
        { type: "EXPENSE", amountCents: 240000, status: "PAID", recurringId: "r1" },
        { type: "EXPENSE", amountCents: 38000, status: "PENDING", recurringId: "r2" },
        { type: "EXPENSE", amountCents: 9900, status: "SKIPPED", recurringId: "r3" },
        { type: "EXPENSE", amountCents: 34280, status: "PAID", recurringId: null },
        { type: "INCOME", amountCents: 720000, status: "PAID", recurringId: "r4" },
      ],
      [{ type: "EXPENSE", amountCents: 14900, recurringId: "r5" }],
    );
    expect(split).toEqual({
      fixedCents: 292900,
      fixedCount: 3,
      fixedPaidCount: 1,
      variableCents: 34280,
      variableCount: 1,
    });
  });
});

describe("ratio and percentChange", () => {
  it("guards against empty bases", () => {
    expect(ratio(50, 200)).toBe(0.25);
    expect(ratio(50, 0)).toBe(0);
    expect(percentChange(112, 100)).toBeCloseTo(0.12);
    expect(percentChange(10, 0)).toBeNull();
  });
});
