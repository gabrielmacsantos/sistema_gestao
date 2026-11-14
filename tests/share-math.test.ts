import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as lib from "@/lib/cashflow";

// The same functions live in src/lib (Next.js) and inside the static index.html; both must agree.
type Api = Pick<typeof lib, "shareOfTotal" | "percentTenths" | "reserveMargin" | "reserveMessage">;

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <share-math>.*\r?\n([\s\S]*?)\/\/ <\/share-math>/.exec(html)?.[1];
if (!block) throw new Error("share-math block not found in index.html");
const fromHtml = new Function(`${block}\nreturn { shareOfTotal, percentTenths, reserveMargin, reserveMessage };`)() as Api;

// Renders a message the way the dashboard does, with plain amounts.
const text = (parts: lib.MessagePart[]) =>
  parts.map((p) => (typeof p === "string" ? p : `[${p.cents}]`)).join("");

describe.each([
  ["src/lib/cashflow.ts", lib as Api],
  ["index.html", fromHtml],
])("%s", (_, { shareOfTotal, percentTenths, reserveMargin, reserveMessage }) => {
  describe("shareOfTotal", () => {
    it("rounds exact halves up, where float math showed 57% for 57,5%", () => {
      expect(shareOfTotal([2300, 1700], 4000)).toEqual([58, 42]);
      expect(shareOfTotal([29], 200)).toEqual([15]); // 14,5% alone
      // 14,5% + 85,5%: only one half can go up for the list to add up to 100; the larger part gets it.
      expect(shareOfTotal([29, 171], 200)).toEqual([14, 86]);
    });

    it("always adds up to 100% when the parts cover the total", () => {
      expect(shareOfTotal([1, 1, 1], 3)).toEqual([34, 33, 33]);
      expect(shareOfTotal([100, 999_900], 1_000_000)).toEqual([0, 100]); // R$ 1 of R$ 10.000
      for (const parts of [[333, 333, 334], [1, 2, 3, 4, 5, 6, 7], [482050, 12345, 1, 99999]]) {
        const total = parts.reduce((s, p) => s + p, 0);
        const shares = shareOfTotal(parts, total);
        expect(shares.reduce((s, p) => s + p, 0)).toBe(100);
        shares.forEach((share, i) => expect(Math.abs(share - (parts[i] * 100) / total)).toBeLessThan(1));
      }
    });

    it("gives the leftover point to the largest remainder, then to the largest part", () => {
      expect(shareOfTotal([5, 5], 10)).toEqual([50, 50]);
      expect(shareOfTotal([1, 2], 3)).toEqual([33, 67]); // 33,33 and 66,67
      expect(shareOfTotal([10, 10, 10], 30)).toEqual([34, 33, 33]);
    });

    it("handles an empty month and big amounts with integers", () => {
      expect(shareOfTotal([0, 0], 0)).toEqual([0, 0]);
      expect(shareOfTotal([], 0)).toEqual([]);
      const big = 50_000_000_000_00; // R$ 50 bilhões
      expect(shareOfTotal([big, big * 3], big * 4)).toEqual([25, 75]);
    });
  });

  describe("percentTenths", () => {
    it("keeps one decimal with half-up rounding in integers", () => {
      expect(percentTenths(145, 1000)).toBe(145); // 14,5%
      expect(percentTenths(1455, 10000)).toBe(146); // 14,55% -> 14,6%
      expect(percentTenths(2300, 4000)).toBe(575);
      expect(percentTenths(1, 3)).toBe(333);
      expect(percentTenths(0, 100)).toBe(0);
      expect(percentTenths(100, 0)).toBe(0);
    });
  });

  describe("reserve card", () => {
    const margin = (forecast: number, budgets: { limitCents: number; spentCents: number }[] = []) =>
      reserveMargin(forecast, budgets);

    it("keeps aside only what is still left in each budget", () => {
      expect(margin(367950, [{ limitCents: 30000, spentCents: 12000 }, { limitCents: 20000, spentCents: 25000 }]))
        .toEqual({ reservedCents: 18000, safeCents: 349950 });
      expect(margin(367950)).toEqual({ reservedCents: 0, safeCents: 367950 });
    });

    it("says how much can still be spent", () => {
      expect(text(reserveMessage(367950, margin(367950), false))).toBe(
        "Você ainda pode gastar até [367950] sem fechar o mês no negativo.",
      );
      expect(text(reserveMessage(367950, margin(367950, [{ limitCents: 30000, spentCents: 12000 }]), false))).toBe(
        "Reservando [18000] para o que falta nos orçamentos, você ainda pode gastar até [349950] sem fechar o mês no negativo.",
      );
    });

    it("never calls a zero balance negative", () => {
      expect(text(reserveMessage(0, margin(0), false))).toBe("O mês está previsto para fechar sem sobra.");
      expect(text(reserveMessage(18000, margin(18000, [{ limitCents: 30000, spentCents: 12000 }]), false))).toBe(
        "Reservando [18000] para o que falta nos orçamentos, não sobra margem para outros gastos.",
      );
    });

    it("tells by how much the month goes negative", () => {
      expect(text(reserveMessage(-5050, margin(-5050), false))).toBe("O mês está previsto para fechar [5050] no negativo.");
      expect(text(reserveMessage(10000, margin(10000, [{ limitCents: 30000, spentCents: 12000 }]), false))).toBe(
        "Se gastar os [18000] que faltam nos orçamentos, o mês fecha [8000] no negativo.",
      );
    });

    it("describes a closed month by how it ended, without reserving", () => {
      const budgets = [{ limitCents: 30000, spentCents: 0 }];
      expect(text(reserveMessage(367950, margin(367950, budgets), true))).toBe("O mês fechou com [367950] de sobra.");
      expect(text(reserveMessage(-100, margin(-100, budgets), true))).toBe("O mês fechou com [100] de falta.");
      expect(text(reserveMessage(0, margin(0, budgets), true))).toBe("O mês fechou sem sobra.");
    });
  });
});
