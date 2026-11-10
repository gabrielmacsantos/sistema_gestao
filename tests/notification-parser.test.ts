import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The parser lives inside the static index.html; load its marked block and evaluate it.
// Every text below is synthetic: names, stores and values are made up.
type Kind = "INCOME" | "EXPENSE" | "IGNORE" | null;
type Parsed = { kind: Kind; amountCents: number | null; date: string; description: string | null; cardBill: boolean };
type Parsers = {
  parseBankNotification: (text: string, fallbackDate: string) => Parsed;
  splitNotifications: (input: string, today: string) => { text: string; date: string }[];
};

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <notification-parser>.*\r?\n([\s\S]*?)\/\/ <\/notification-parser>/.exec(html)?.[1];
if (!block) throw new Error("notification-parser block not found in index.html");
const { parseBankNotification, splitNotifications } = new Function(
  `${block}\nreturn { parseBankNotification, splitNotifications };`,
)() as Parsers;

const today = "2026-11-09";
const run = (text: string) => parseBankNotification(text, today);

describe("parseBankNotification: income", () => {
  it.each([
    ["Transferência recebida. Você recebeu uma transferência de R$ 150,00 de Fulano de Tal.", 15000, "Transferência de Fulano de Tal"],
    ["Pix recebido: você recebeu R$ 1.250,90 de MARIA SOUZA", 125090, "Pix de Maria Souza"],
    ["Você recebeu um Pix de R$ 80,00 de Joao Teste", 8000, "Pix de Joao Teste"],
    ["Fulano Beltrano te enviou um Pix de R$ 35,50", 3550, "Pix recebido"],
    ["Pix recebido de R$ 20,00. Remetente: Ana Exemplo", 2000, "Pix de Ana Exemplo"],
    ["Depósito de R$ 500,00 realizado na sua conta", 50000, "Depósito"],
    ["Seu salário de R$ 3.500,00 caiu na conta", 350000, "Salário"],
    ["Crédito em conta de R$ 42,00", 4200, "Entrada"],
    ["Estorno de R$ 59,90 da compra em LOJA EXEMPLO", 5990, "Estorno: Loja Exemplo"],
    ["Pagamento recebido: R$ 300,00 de Cliente Exemplo Ltda", 30000, "Cliente Exemplo Ltda"],
  ])("%j", (text, cents, description) => {
    expect(run(text)).toMatchObject({ kind: "INCOME", amountCents: cents, description });
  });
});

describe("parseBankNotification: expenses", () => {
  it.each([
    ["Compra aprovada de R$ 52,30 em MERCADO EXEMPLO no cartão final 1234", 5230, "Mercado Exemplo"],
    ["Compra no crédito aprovada. R$ 89,90 em LOJA TESTE SP", 8990, "Loja Teste Sp"],
    ["Compra de R$ 12,00 APROVADA em PADARIA PAO BOM para o cartão final 9999.", 1200, "Padaria Pao Bom"],
    ["Você fez um Pix de R$ 45,00 para Beltrano Silva", 4500, "Pix para Beltrano Silva"],
    ["Pix enviado: R$ 100,00 para Ciclano Exemplo às 14:32", 10000, "Pix para Ciclano Exemplo"],
    ["Transferência enviada de R$ 250,00 para Fulana Teste", 25000, "Transferência para Fulana Teste"],
    ["Pagamento de boleto de R$ 180,45 realizado com sucesso", 18045, "Boleto"],
    ["Saque de R$ 200,00 realizado no caixa 24h", 20000, "Saque"],
    ["Débito automático de R$ 99,90 - ENERGIA EXEMPLO", 9990, "Pagamento"],
    ["Compra aprovada: IFOOD *RESTAURANTE TESTE R$ 38,70", 3870, "Compra"],
  ])("%j", (text, cents, description) => {
    expect(run(text)).toMatchObject({ kind: "EXPENSE", amountCents: cents, description });
  });

  it("does not take the balance as the amount", () => {
    expect(run("Compra aprovada de R$ 30,00 em LOJA X. Saldo disponível: R$ 1.000,00")).toMatchObject({ kind: "EXPENSE", amountCents: 3000 });
    expect(run("Limite disponível R$ 2.000,00. Compra de R$ 15,00 aprovada em BAR TESTE")).toMatchObject({ kind: "EXPENSE", amountCents: 1500 });
  });

  it("flags card bill payments", () => {
    expect(run("Pagamento da fatura de R$ 1.200,00 confirmado")).toMatchObject({ kind: "EXPENSE", cardBill: true, description: "Pagamento de fatura" });
  });

  it("reads amounts without R$", () => {
    expect(run("Compra aprovada no valor de 27,40 em FARMACIA TESTE")).toMatchObject({ kind: "EXPENSE", amountCents: 2740 });
  });
});

describe("parseBankNotification: digital wallets", () => {
  it.each([
    ["Mercado Exemplo R$ 52,30 com Visa •••• 1234", 5230, "Mercado Exemplo"],
    ["Google Wallet: PADARIA TESTE R$ 12,00 com Mastercard •• 9876", 1200, "Padaria Teste"],
    ["Carteira R$ 30,00 em Farmacia Exemplo com Elo •••• 4321", 3000, "Farmacia Exemplo"],
    ["Samsung Wallet Pagamento concluído R$ 18,50 Lanchonete Teste", 1850, "Lanchonete Teste"],
    ["Você pagou R$ 45,90 a Posto Exemplo", 4590, "Posto Exemplo"],
    ["Loja Teste R$ 99,00 pago com cartão final 5555", 9900, "Loja Teste"],
  ])("%j", (text, cents, description) => {
    expect(run(text)).toMatchObject({ kind: "EXPENSE", amountCents: cents, description });
  });

  it("keeps wallet balances and payment-term words out", () => {
    expect(run("Carteira: seu saldo é R$ 20,00").kind).toBe("IGNORE");
    expect(run("Compra aprovada de R$ 300,00 à vista em LOJA EXEMPLO")).toMatchObject({ kind: "EXPENSE", description: "Loja Exemplo" });
  });
});

describe("parseBankNotification: ignored and unclear", () => {
  it.each([
    "Seu saldo é de R$ 1.234,56",
    "Sua fatura de R$ 800,00 vence amanhã",
    "Pix agendado de R$ 50,00 para 15/11",
    "Seu código de verificação é 123456",
    "Saldo atual: R$ 10,00",
  ])("ignores %j", (text) => {
    expect(run(text).kind).toBe("IGNORE");
  });

  it("returns null kind when it cannot tell", () => {
    expect(run("Olá! Confira as novidades do app").kind).toBeNull();
    expect(run("Você recebeu uma mensagem").kind).toBeNull();
  });
});

describe("parseBankNotification: dates", () => {
  it("uses the date in the text", () => {
    expect(run("Compra aprovada de R$ 10,00 em LOJA em 05/11 às 10:00").date).toBe("2026-11-05");
    expect(run("Pix recebido de R$ 10,00 em 03/10/2026").date).toBe("2026-10-03");
  });
  it("falls back to the reference date", () => {
    expect(run("Compra aprovada de R$ 10,00 em LOJA").date).toBe(today);
  });
  it("puts a later day without year in the previous year", () => {
    expect(parseBankNotification("Compra aprovada de R$ 10,00 em LOJA 30/12", "2026-01-02").date).toBe("2025-12-30");
  });
});

describe("splitNotifications", () => {
  it("splits on blank lines and --- lines", () => {
    const list = splitNotifications("Pix recebido R$ 10,00\n\nCompra aprovada R$ 5,00\n---\nSaque de R$ 20,00", today);
    expect(list.map((e) => e.text)).toEqual(["Pix recebido R$ 10,00", "Compra aprovada R$ 5,00", "Saque de R$ 20,00"]);
    expect(list.every((e) => e.date === today)).toBe(true);
  });
  it("reads a leading arrival date", () => {
    expect(splitNotifications("[2026-11-07] Pix recebido R$ 10,00\n---\n08/11/2026 14:32 - Compra aprovada R$ 5,00", today)).toEqual([
      { text: "Pix recebido R$ 10,00", date: "2026-11-07" },
      { text: "Compra aprovada R$ 5,00", date: "2026-11-08" },
    ]);
  });
  it("joins the title and body lines of one notification", () => {
    expect(splitNotifications("Nubank\nVocê recebeu um Pix de R$ 5,00", today)).toEqual([{ text: "Nubank Você recebeu um Pix de R$ 5,00", date: today }]);
  });
  it("drops empty chunks", () => {
    expect(splitNotifications("\n\n---\n\n", today)).toEqual([]);
  });
});
