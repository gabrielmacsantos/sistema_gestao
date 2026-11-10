import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The parser lives inside the static index.html; load its marked block and evaluate it.
type Category = { id: string; type: "EXPENSE" | "INCOME"; name: string };
type Parsed = {
  type: "EXPENSE" | "INCOME";
  description: string | null;
  amountCents: number | null;
  date: string | null;
  categoryId: string | null;
  status: "PENDING" | null;
};
type Parse = (text: string, categories: Category[], today: string) => Parsed;

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <voice-parser>.*\r?\n([\s\S]*?)\/\/ <\/voice-parser>/.exec(html)?.[1];
if (!block) throw new Error("voice-parser block not found in index.html");
const parse = new Function(`${block}\nreturn parseSpokenTransaction;`)() as Parse;

const categories: Category[] = [
  { id: "food", type: "EXPENSE", name: "Alimentação" },
  { id: "market", type: "EXPENSE", name: "Mercado" },
  { id: "transport", type: "EXPENSE", name: "Transporte" },
  { id: "bills", type: "EXPENSE", name: "Contas e serviços" },
  { id: "health", type: "EXPENSE", name: "Saúde" },
  { id: "salary", type: "INCOME", name: "Salário" },
  { id: "extra", type: "INCOME", name: "Renda extra" },
];
const today = "2026-11-09";
const run = (text: string) => parse(text, categories, today);

describe("parseSpokenTransaction", () => {
  it("reads a typical expense sentence", () => {
    expect(run("gastei 52,30 no mercado ontem")).toEqual({
      type: "EXPENSE",
      description: "Mercado",
      amountCents: 5230,
      date: "2026-11-08",
      categoryId: "market",
      status: null,
    });
  });

  it.each([
    ["R$ 52,30 mercado", 5230],
    ["R$52 mercado", 5200],
    ["52 reais e 30 centavos de mercado", 5230],
    ["52 e 30 no mercado", 5230],
    ["mercado 1.200 reais", 120000],
    ["mercado 52.30", 5230],
    ["cinquenta e dois reais e trinta centavos", 5230],
    ["dois e cinquenta de pão", 250],
    ["cento e vinte e cinco reais de luz", 12500],
    ["mil e duzentos reais de aluguel", 120000],
    ["dois mil e quinhentos de aluguel", 250000],
    ["2 mil de aluguel", 200000],
    ["cinquenta centavos de bala", 50],
    ["cem reais de farmácia", 10000],
  ])("parses the amount in %j", (text, cents) => {
    expect(run(text).amountCents).toBe(cents);
  });

  it("does not read articles as amounts", () => {
    const r = run("comprei uma pizza 40 reais");
    expect(r.amountCents).toBe(4000);
    expect(r.description).toBe("Pizza");
    expect(run("paguei 50 e uma coxinha").amountCents).toBe(5000);
  });

  it("leaves the amount empty when none was said", () => {
    expect(run("almoço com a equipe").amountCents).toBeNull();
  });

  it.each([
    ["mercado 20 hoje", "2026-11-09"],
    ["mercado 20 anteontem", "2026-11-07"],
    ["mercado 20 antes de ontem", "2026-11-07"],
    ["mercado 20 dia 5", "2026-11-05"],
    ["mercado 20 no dia primeiro", "2026-11-01"],
    ["mercado 20 dia cinco de março", "2026-03-05"],
    ["mercado 20 em 3/10", "2026-10-03"],
    ["mercado 20", null],
    ["mercado 20 dia 31", null],
  ])("parses the date in %j", (text, date) => {
    expect(run(text).date).toBe(date);
  });

  it("crosses month and year boundaries", () => {
    expect(parse("ontem 10 reais", categories, "2026-01-01").date).toBe("2025-12-31");
  });

  it("keeps the day number out of the amount", () => {
    const r = run("dia 5 paguei 80 reais de luz");
    expect(r).toMatchObject({ date: "2026-11-05", amountCents: 8000, categoryId: "bills", description: "Luz" });
  });

  it("detects income", () => {
    expect(run("recebi o salário de 3.500 reais")).toMatchObject({
      type: "INCOME",
      amountCents: 350000,
      categoryId: "salary",
      description: "Salário",
    });
    expect(run("freelance 800")).toMatchObject({ type: "INCOME", categoryId: "extra" });
  });

  it("prefers expense when both kinds of words appear", () => {
    expect(run("paguei com o dinheiro que recebi 30 reais de uber").type).toBe("EXPENSE");
  });

  it("matches categories by hint words", () => {
    expect(run("uber 25 reais").categoryId).toBe("transport");
    expect(run("almocei 38 reais").categoryId).toBe("food");
    expect(run("paguei a conta de luz 180 reais")).toMatchObject({ categoryId: "bills", description: "Conta de luz" });
    expect(run("sei lá 10 reais").categoryId).toBeNull();
  });

  it("marks pending entries", () => {
    expect(run("conta de luz 180 reais pendente")).toMatchObject({ status: "PENDING", description: "Conta de luz" });
    expect(run("aluguel 1500 a pagar dia 10").status).toBe("PENDING");
  });

  it("leaves the description empty when only a verb and amount were said", () => {
    expect(run("uber 25 reais").description).toBe("Uber");
    expect(run("gastei 30 reais").description).toBeNull();
  });

  it("caps the description at 120 characters", () => {
    expect(run(`${"palavra ".repeat(40)}10 reais`).description?.length).toBeLessThanOrEqual(120);
  });
});
