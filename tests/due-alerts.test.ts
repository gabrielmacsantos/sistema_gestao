import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <due-alerts>.*\r?\n([\s\S]*?)\/\/ <\/due-alerts>/.exec(html)?.[1];
if (!block) throw new Error("due-alerts block not found in index.html");
const api = new Function(`${block}\nreturn { parseAlertDays, daysUntil, dueDateOf, dueAlerts, dueText, calendarDays, dayTone, monthGrid };`)();

const bill = (over: object) => ({ id: "t", type: "EXPENSE", status: "PENDING", description: "Luz", amountCents: 100, date: "2026-11-01", ...over });

describe("due alerts", () => {
  it("accepts only the offered lead times", () => {
    expect([0, "1", 3, "7", 2, "", null, "x"].map(api.parseAlertDays)).toEqual([0, 1, 3, 7, null, null, null, null]);
  });
  it("counts whole days across month ends", () => {
    expect(api.daysUntil("2026-12-01", "2026-11-30")).toBe(1);
    expect(api.daysUntil("2026-11-20", "2026-11-24")).toBe(-4);
  });
  it("alerts inside the window, includes overdue, and ends when paid", () => {
    const today = "2026-11-24";
    const txs = [
      bill({ id: "a", dueDate: "2026-11-26", alertDays: 3 }),
      bill({ id: "b", dueDate: "2026-11-30", alertDays: 3 }), // 6 days away: too early
      bill({ id: "c", dueDate: "2026-11-20", alertDays: 0 }), // overdue
      bill({ id: "d", dueDate: "2026-11-25", alertDays: 3, status: "PAID" }),
      bill({ id: "e", dueDate: "2026-11-25", alertDays: null }),
      bill({ id: "f", dueDate: "2026-11-25", alertDays: 3, type: "INCOME" }),
    ];
    const out = api.dueAlerts(txs, [], today);
    expect(out.map((x: { tx: { id: string } }) => x.tx.id)).toEqual(["c", "a"]);
    expect(out[0].overdue).toBe(true);
    expect(api.dueText(2)).toBe("vence em 2 dias");
    expect(api.dueText(-3)).toBe("venceu há 3 dias");
  });
  it("takes the alert of a fixed occurrence from its fixed item and its date as the due date", () => {
    const occ = bill({ id: "o", recurringId: "r1", date: "2026-11-25" });
    expect(api.dueDateOf(occ)).toBe("2026-11-25");
    expect(api.dueAlerts([occ], [{ id: "r1", alertDays: 1 }], "2026-11-24")).toHaveLength(1);
    expect(api.dueAlerts([occ], [{ id: "r1", alertDays: null }], "2026-11-24")).toHaveLength(0);
  });
  it("places bills on their due day and picks one tone per day", () => {
    const rec: never[] = [];
    const paid = bill({ id: "p", status: "PAID", dueDate: "2026-11-10" });
    const days = api.calendarDays([paid, bill({ id: "x", dueDate: "2026-11-26" }), bill({ id: "y", dueDate: "2026-11-03" }), bill({ id: "n", date: "2026-11-05" }), bill({ id: "z", dueDate: "2026-12-01" })], "2026-11");
    expect([...days.keys()].sort()).toEqual(["2026-11-03", "2026-11-10", "2026-11-26"]); // "n" has no due date: not on the calendar
    expect(api.dayTone(days.get("2026-11-10"), "2026-11-10", "2026-11-24", rec)).toBe("paid");
    expect(api.dayTone(days.get("2026-11-03"), "2026-11-03", "2026-11-24", rec)).toBe("overdue");
    expect(api.dayTone(days.get("2026-11-26"), "2026-11-26", "2026-11-24", rec)).toBe("soon");
    expect(api.dayTone([bill({})], "2026-12-20", "2026-11-24", rec)).toBe("pending");
  });
  it("builds whole Sunday-first weeks", () => {
    const g = api.monthGrid("2026-11"); // 1 Nov 2026 is a Sunday
    expect(g[0][0]).toBe("2026-11-01");
    expect(g.every((w: unknown[]) => w.length === 7)).toBe(true);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
  });
});
