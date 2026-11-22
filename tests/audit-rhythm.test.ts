import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The rules live inside the static index.html; load the marked blocks and evaluate them.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const grab = (name: string) => {
  const start = html.indexOf(`// <${name}>`), end = html.indexOf(`// </${name}>`);
  const block = start >= 0 && end > start ? html.slice(html.indexOf("\n", start) + 1, end) : undefined;
  if (!block) throw new Error(`${name} block not found in index.html`);
  return block;
};
type Tx = { status: string; type?: string };
const rules = new Function(`${grab("tx-status")}\n${grab("audit-rhythm")}\nreturn { normalizeStatus, isOpen, statusLabel, auditMatches, auditCounts, wholePercent, weekStrip, auditAnchor };`)() as {
  normalizeStatus: (v: unknown) => string;
  isOpen: (t: Tx) => boolean;
  statusLabel: (status: string, type: string) => string;
  auditMatches: (t: Tx, f: string) => boolean;
  auditCounts: (list: Tx[]) => Record<string, number>;
  wholePercent: (part: number, total: number) => number;
  weekStrip: (iso: string) => { iso: string; label: string; day: number }[];
  auditAnchor: (month: string, today: string) => string;
};

describe("transaction status", () => {
  it("keeps the three known values and turns anything else from a form into PAID", () => {
    expect(["PAID", "PENDING", "REVIEW"].map(rules.normalizeStatus)).toEqual(["PAID", "PENDING", "REVIEW"]);
    expect(rules.normalizeStatus("nope")).toBe("PAID");
    expect(rules.normalizeStatus(undefined)).toBe("PAID");
  });
  it("counts REVIEW and unknown values as open, only PAID as closed", () => {
    expect(rules.isOpen({ status: "PAID" })).toBe(false);
    expect(rules.isOpen({ status: "PENDING" })).toBe(true);
    expect(rules.isOpen({ status: "REVIEW" })).toBe(true);
    expect(rules.isOpen({ status: "FUTURE_VALUE" })).toBe(true);
  });
  it("labels each status in pt-BR", () => {
    expect(rules.statusLabel("PAID", "EXPENSE")).toBe("Pago");
    expect(rules.statusLabel("PAID", "INCOME")).toBe("Recebido");
    expect(rules.statusLabel("PENDING", "EXPENSE")).toBe("Pendente");
    expect(rules.statusLabel("REVIEW", "INCOME")).toBe("Em análise");
  });
});

describe("audit filters", () => {
  const list = [{ status: "PAID" }, { status: "PAID" }, { status: "PENDING" }, { status: "REVIEW" }];
  it("counts each situation", () => expect(rules.auditCounts(list)).toEqual({ todos: 4, pago: 2, pendente: 1, analise: 1 }));
  it("matches each filter and 'todos' matches everything", () => {
    expect(list.filter((t) => rules.auditMatches(t, "analise"))).toHaveLength(1);
    expect(list.filter((t) => rules.auditMatches(t, "todos"))).toHaveLength(4);
  });
});

describe("wholePercent (integer math)", () => {
  it("rounds half up and clamps to 0-100", () => {
    expect(rules.wholePercent(1, 3)).toBe(33);
    expect(rules.wholePercent(2, 3)).toBe(67);
    expect(rules.wholePercent(1, 8)).toBe(13);
    expect(rules.wholePercent(50, 100)).toBe(50);
    expect(rules.wholePercent(250, 100)).toBe(100);
  });
  it("is 0 when there is nothing to divide or nothing in the part", () => {
    expect(rules.wholePercent(0, 100)).toBe(0);
    expect(rules.wholePercent(100, 0)).toBe(0);
    expect(rules.wholePercent(-5, 100)).toBe(0);
  });
  it("stays exact on large cent amounts", () => expect(rules.wholePercent(123456789, 246913578)).toBe(50));
});

describe("weekStrip", () => {
  it("runs Monday to Sunday around the given day", () => {
    const week = rules.weekStrip("2026-11-18"); // a Wednesday
    expect(week.map((d) => d.label)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
    expect(week.map((d) => d.day)).toEqual([16, 17, 18, 19, 20, 21, 22]);
  });
  it("starts the week on the previous Monday when the day is a Sunday", () => {
    expect(rules.weekStrip("2026-11-22").map((d) => d.day)).toEqual([16, 17, 18, 19, 20, 21, 22]);
  });
  it("crosses month and year boundaries", () => {
    expect(rules.weekStrip("2026-12-31").map((d) => d.iso)[0]).toBe("2026-12-28");
    expect(rules.weekStrip("2027-01-01").map((d) => d.iso)).toContain("2026-12-28");
  });
});

describe("auditAnchor", () => {
  it("uses today inside the current month and the first day otherwise", () => {
    expect(rules.auditAnchor("2026-11", "2026-11-22")).toBe("2026-11-22");
    expect(rules.auditAnchor("2026-10", "2026-11-22")).toBe("2026-10-01");
  });
});
