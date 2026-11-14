import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { weeklySeries, type WeekPoint } from "@/lib/cashflow";
import { dateToInput } from "@/lib/dates";

// The same function lives in src/lib (Next.js) and inside the static index.html; both must agree.
type Entry = { type: string; amountCents: number; status?: string; day: string };
type Weekly = (entries: Entry[], month: string) => WeekPoint[];

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <weekly-series>.*\r?\n([\s\S]*?)\/\/ <\/weekly-series>/.exec(html)?.[1];
if (!block) throw new Error("weekly-series block not found in index.html");
const htmlWeekly = new Function(`${block}\nreturn weeklySeries;`)() as Weekly;

const ranges = (weeks: WeekPoint[]) => weeks.map((w) => [w.firstDay, w.lastDay]);

describe.each([
  ["src/lib/cashflow.ts", weeklySeries as Weekly],
  ["index.html", htmlWeekly],
])("weeklySeries (%s)", (_, weekly) => {
  it("splits a month into Monday-to-Sunday weeks cut at its edges", () => {
    // November 2026 starts on a Sunday: the first week has a single day.
    expect(ranges(weekly([], "2026-11"))).toEqual([[1, 1], [2, 8], [9, 15], [16, 22], [23, 29], [30, 30]]);
    // February 2027 starts on a Monday and has 28 days: four whole weeks.
    expect(ranges(weekly([], "2027-02"))).toEqual([[1, 7], [8, 14], [15, 21], [22, 28]]);
    // March 2026 has 31 days and also starts on a Sunday.
    expect(ranges(weekly([], "2026-03"))).toEqual([[1, 1], [2, 8], [9, 15], [16, 22], [23, 29], [30, 31]]);
  });

  it("sums integer cents per week, with Sunday closing the week and Monday opening the next", () => {
    const weeks = weekly(
      [
        { type: "INCOME", amountCents: 850000, day: "2026-11-02" },
        { type: "EXPENSE", amountCents: 482050, day: "2026-11-08" }, // Sunday
        { type: "EXPENSE", amountCents: 1, day: "2026-11-09" }, // Monday
        { type: "EXPENSE", amountCents: 99999, status: "SKIPPED", day: "2026-11-03" },
        { type: "EXPENSE", amountCents: 77777, day: "2026-10-31" },
        { type: "EXPENSE", amountCents: 12345, status: "PENDING", day: "2026-11-30" },
      ],
      "2026-11",
    );
    expect(weeks[1]).toMatchObject({ income: 850000, expense: 482050 });
    expect(weeks[2]).toMatchObject({ income: 0, expense: 1 });
    expect(weeks[5]).toMatchObject({ income: 0, expense: 12345 });
    expect(weeks.reduce((s, w) => s + w.income - w.expense, 0)).toBe(367949 - 12345);
    expect(weeks.flatMap((w) => [w.income, w.expense]).every(Number.isSafeInteger)).toBe(true);
  });
});

describe("weeklySeries with dates from the database", () => {
  it("uses the São Paulo calendar day: 23:30 on Sunday stays in that week", () => {
    const lateSunday = new Date("2026-11-09T02:30:00Z"); // 2026-11-08 23:30 in São Paulo
    const weeks = weeklySeries([{ type: "EXPENSE", amountCents: 5000, day: dateToInput(lateSunday) }], "2026-11");
    expect(weeks[1].expense).toBe(5000);
    expect(weeks[2].expense).toBe(0);
  });
});
