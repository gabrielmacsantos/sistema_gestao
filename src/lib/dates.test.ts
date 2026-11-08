import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonth,
  dateToInput,
  monthOf,
  monthRange,
  occurrenceDate,
  parseDateInput,
} from "./dates";

describe("dates in America/Sao_Paulo", () => {
  it("stores a calendar date as midnight in São Paulo (03:00 UTC)", () => {
    expect(parseDateInput("2026-11-05")?.toISOString()).toBe("2026-11-05T03:00:00.000Z");
  });

  it("round-trips date inputs", () => {
    expect(dateToInput(parseDateInput("2026-02-28")!)).toBe("2026-02-28");
  });

  it("rejects impossible dates", () => {
    expect(parseDateInput("2026-02-30")).toBeNull();
    expect(parseDateInput("05/11/2026")).toBeNull();
  });

  it("uses the local month near midnight UTC", () => {
    // 01:00 UTC on Dec 1st is still Nov 30th in São Paulo.
    expect(monthOf(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
    expect(currentMonth(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
  });

  it("builds month ranges", () => {
    const { start, end } = monthRange("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("adds months across years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("clamps recurring days to the month length", () => {
    expect(dateToInput(occurrenceDate("2026-02", 31))).toBe("2026-02-28");
    expect(dateToInput(occurrenceDate("2028-02", 31))).toBe("2028-02-29");
    expect(dateToInput(occurrenceDate("2026-04", 31))).toBe("2026-04-30");
  });
});
