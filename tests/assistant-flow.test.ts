import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The chat's flow lives inside the static index.html; the parser block feeds it, as in the page.
type Category = { id: string; type: "EXPENSE" | "INCOME"; name: string };
type Draft = { type: "EXPENSE" | "INCOME"; description: string | null; amountCents: number | null; date: string | null; categoryId: string | null; status: "PENDING" | null };
type Parse = ((text: string, categories: Category[], today: string) => Draft) & { guessCategory: (text: string, categories: Category[], type: string) => string | null };
type Api = {
  parse: Parse;
  assistantDraft: (p: Draft) => Draft;
  assistantMissing: (d: Draft) => "amount" | "category" | null;
  assistantReply: (d: Draft, awaiting: string, text: string, ctx: Record<string, unknown>) => Draft;
  assistantTransaction: (d: Draft, today: string, categoryName?: string) => Record<string, unknown>;
  assistantForceType: (p: Draft, type: string | null, guess: (type: string) => string | null) => Draft;
  parseMoneyToCents: (s: string) => number | null;
};

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const pick = (tag: string) => {
  const m = new RegExp(`// <${tag}>.*\\r?\\n([\\s\\S]*?)// </${tag}>`).exec(html)?.[1];
  if (!m) throw new Error(`${tag} block not found in index.html`);
  return m;
};
const money = /\/\*\* Text -> integer cents[\s\S]*?\nconst centsToInput/.exec(html)?.[0].replace(/\nconst centsToInput$/, "");
if (!money) throw new Error("parseMoneyToCents not found in index.html");
const api = new Function(
  `${pick("voice-parser")}\n${money}\n${pick("assistant-flow")}
   return { parse: parseSpokenTransaction, parseMoneyToCents, assistantDraft, assistantMissing, assistantReply, assistantTransaction, assistantForceType };`,
)() as Api;
const { parse, parseMoneyToCents, assistantDraft, assistantMissing, assistantReply, assistantTransaction, assistantForceType } = api;

const categories: Category[] = [
  { id: "food", type: "EXPENSE", name: "Alimentação" },
  { id: "bills", type: "EXPENSE", name: "Contas e serviços" },
  { id: "salary", type: "INCOME", name: "Salário" },
];
const today = "2026-11-15";
const ctx = { categories, today, parse, parseMoney: parseMoneyToCents };

describe("assistant flow", () => {
  it("asks for the category when only the amount and the description are known", () => {
    const d = assistantDraft(parse("Paguei 120 reais de dentista", categories, today));
    expect(d.amountCents).toBe(12000);
    expect(assistantMissing(d)).toBe("category");
  });

  it("saves straight away when everything is understood: 'Paguei 120 reais de internet'", () => {
    const d = assistantDraft(parse("Paguei 120 reais de internet", categories, today));
    expect(assistantMissing(d)).toBeNull();
    expect(assistantTransaction(d, today, "Contas e serviços")).toMatchObject({ type: "EXPENSE", amountCents: 12000, categoryId: "bills", status: "PAID", date: today });
  });

  it("asks for the amount first when there is none", () => {
    const d = assistantDraft(parse("almoço", categories, today));
    expect(assistantMissing(d)).toBe("amount");
  });

  it("reads the answer to the amount question in cents", () => {
    const d = assistantDraft(parse("almoço", categories, today));
    expect(assistantReply(d, "amount", "45,90", ctx).amountCents).toBe(4590);
    expect(assistantReply(d, "amount", "quarenta e cinco reais", ctx).amountCents).toBe(4500);
    expect(assistantReply(d, "amount", "R$ 1.234,56", ctx).amountCents).toBe(123456);
  });

  it("keeps the draft when the amount answer is not a number", () => {
    const d = assistantDraft(parse("almoço", categories, today));
    expect(assistantReply(d, "amount", "não sei", ctx).amountCents).toBeNull();
  });

  it("reads a typed category as an answer, in the type of the draft", () => {
    const d = assistantDraft(parse("Paguei 80 de dentista", categories, today));
    expect(assistantReply(d, "category", "alimentação", ctx).categoryId).toBe("food");
    expect(assistantReply(d, "category", "xyz", ctx).categoryId).toBeNull();
  });

  it("'no category' is a deliberate answer, not a missing field", () => {
    const d = { ...assistantDraft(parse("Paguei 80 de dentista", categories, today)), categoryId: "" };
    expect(assistantMissing(d)).toBeNull();
    expect(assistantTransaction(d, today).categoryId).toBeNull();
  });

  it("drops an amount that is not a positive integer of cents or is above the ceiling", () => {
    const base = parse("Paguei 10 de luz", categories, today);
    expect(assistantDraft({ ...base, amountCents: 0 }).amountCents).toBeNull();
    expect(assistantDraft({ ...base, amountCents: -5 }).amountCents).toBeNull();
    expect(assistantDraft({ ...base, amountCents: 10.5 }).amountCents).toBeNull();
    expect(assistantDraft({ ...base, amountCents: 100000000000 }).amountCents).toBeNull();
  });

  it("builds the transaction with defaults: today, paid, description from the category", () => {
    const t = assistantTransaction({ type: "INCOME", description: null, amountCents: 250000, date: null, categoryId: "salary", status: null }, today, "Salário");
    expect(t).toEqual({ type: "INCOME", description: "Salário", amountCents: 250000, date: today, categoryId: "salary", status: "PAID" });
  });

  it("keeps a pending status and a spoken date", () => {
    const d = assistantDraft(parse("Gastei 45,90 no almoço ontem pendente", categories, today));
    expect(assistantTransaction(d, today)).toMatchObject({ amountCents: 4590, date: "2026-11-14", status: "PENDING", categoryId: "food" });
  });

  it("a chosen type wins over the sentence, with the category looked up for it", () => {
    const text = "3000 salário";
    const guess = (type: string) => parse.guessCategory(text, categories, type);
    const parsed = parse(text, categories, today);
    expect(assistantForceType(parsed, "EXPENSE", guess)).toMatchObject({ type: "EXPENSE", categoryId: null });
    const food = parse("45 almoço", categories, today);
    const asIncome = assistantForceType(food, "INCOME", (type) => parse.guessCategory("45 almoço", categories, type));
    expect(asIncome).toMatchObject({ type: "INCOME", amountCents: 4500, categoryId: null });
    expect(assistantMissing(assistantDraft(asIncome))).toBe("category");
  });

  it("keeps the parsed draft when no type was chosen or it already matches", () => {
    const parsed = parse("Recebi 2500 de salário", categories, today);
    expect(assistantForceType(parsed, null, () => "x")).toBe(parsed);
    expect(assistantForceType(parsed, "INCOME", () => "x")).toBe(parsed);
  });
});
