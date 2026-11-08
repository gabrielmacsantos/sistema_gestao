import { describe, expect, it } from "vitest";
import { activeMonths, missingOccurrences, monthsBetween } from "./recurrence";

const template = (overrides = {}) => ({
  id: "r1",
  startMonth: "2026-01",
  endMonth: null,
  createdMonth: "2026-01",
  ...overrides,
});

describe("recurrence", () => {
  it("lists months inclusively", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("never generates before the template was created", () => {
    expect(activeMonths(template({ createdMonth: "2026-03" }), "2025-01", "2026-04")).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("respects start and end months", () => {
    expect(activeMonths(template({ startMonth: "2026-05", endMonth: "2026-06" }), "2026-01", "2026-12")).toEqual([
      "2026-05",
      "2026-06",
    ]);
    expect(activeMonths(template({ startMonth: "2027-01" }), "2026-01", "2026-12")).toEqual([]);
  });

  it("only returns occurrences that don't exist yet (including skipped ones)", () => {
    const existing = new Set(["r1:2026-01", "r1:2026-02"]);
    expect(missingOccurrences([template()], existing, "2026-01", "2026-03")).toEqual([
      { recurringId: "r1", period: "2026-03" },
    ]);
  });
});
