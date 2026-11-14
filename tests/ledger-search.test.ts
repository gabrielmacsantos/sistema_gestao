import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as lib from "@/lib/search";

// The same functions live in src/lib/search.ts (Next.js) and inside the static index.html.
type Api = Pick<typeof lib, "normalizeText" | "searchAmountCents" | "matchesSearch" | "searchMatcher">;

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <ledger-search>.*\r?\n([\s\S]*?)\/\/ <\/ledger-search>/.exec(html)?.[1];
if (!block) throw new Error("ledger-search block not found in index.html");
const fromHtml = new Function(
  `${block}\nreturn { normalizeText, searchAmountCents, matchesSearch, searchMatcher };`,
)() as Api;

const acai = {
  description: "Açaí da praça",
  amountCents: 4590,
  merchantName: "Açaíteria Bom Sabor LTDA",
  notes: null,
  categoryName: "Alimentação",
};

describe.each([
  ["src/lib/search.ts", lib as Api],
  ["index.html", fromHtml],
])("%s", (_, { normalizeText, searchAmountCents, matchesSearch, searchMatcher }) => {
  it("ignores case, accents and extra spaces", () => {
    expect(normalizeText("  Açaí   da PRAÇA ")).toBe("acai da praca");
    expect(matchesSearch(acai, "acai")).toBe(true);
    expect(matchesSearch(acai, "PRAÇA")).toBe(true);
  });

  it("looks in the place, the notes and the category, and needs every word", () => {
    expect(matchesSearch(acai, "bom sabor")).toBe(true);
    expect(matchesSearch(acai, "alimentacao")).toBe(true);
    expect(matchesSearch({ ...acai, notes: "dividido com a Ana" }, "ana")).toBe(true);
    expect(matchesSearch(acai, "acai mercado")).toBe(false);
  });

  it("matches the amount by integer cents", () => {
    expect(searchAmountCents("45,90")).toBe(4590);
    expect(searchAmountCents("R$ 1.234,5")).toBe(123450);
    expect(searchAmountCents("12")).toBe(1200);
    expect(searchAmountCents("1.2")).toBeNull();
    expect(searchAmountCents("abc")).toBeNull();
    expect(matchesSearch(acai, "45,90")).toBe(true);
    expect(matchesSearch(acai, "r$ 45,9")).toBe(true);
    expect(matchesSearch(acai, "45,91")).toBe(false);
  });

  it("treats typed wildcards and symbols as plain text", () => {
    expect(matchesSearch(acai, "%")).toBe(false);
    expect(matchesSearch(acai, "_")).toBe(false);
    expect(matchesSearch({ ...acai, description: "Taxa 100% online" }, "100%")).toBe(true);
    expect(matchesSearch(acai, ".*")).toBe(false);
  });

  it("prepares the term once and filters a list with the same result", () => {
    const list = [acai, { description: "Mercado", amountCents: 4590 }, { description: "Padaria", amountCents: 1250 }];
    expect(list.filter(searchMatcher("45,90")).map((e) => e.description)).toEqual(["Açaí da praça", "Mercado"]);
    expect(list.filter(searchMatcher("acai")).length).toBe(1);
    expect(list.filter(searchMatcher("")).length).toBe(3);
  });

  it("keeps everything for an empty search and copes with missing fields", () => {
    expect(matchesSearch(acai, "   ")).toBe(true);
    expect(matchesSearch({ description: "Padaria", amountCents: 1250 }, "padaria")).toBe(true);
    expect(matchesSearch({ description: "Padaria", amountCents: 1250 }, "mercado")).toBe(false);
  });
});
