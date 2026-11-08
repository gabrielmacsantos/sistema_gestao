import { describe, expect, it } from "vitest";
import { CsvFormatError, decodeStatement, parseStatement } from ".";

const OFX = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>0001<ACCTID>12345-6</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261105120000[-3:BRT]
<TRNAMT>-45.90
<FITID>A1
<MEMO>COMPRA CARTAO PADARIA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261106
<TRNAMT>5000.00
<FITID>A2
<NAME>SALARIO
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe("OFX", () => {
  it("parses SGML statements with sign-based types", () => {
    const drafts = parseStatement("extrato.ofx", OFX, "negative-expense");
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      type: "EXPENSE",
      amountCents: 4590,
      date: "2026-11-05",
      description: "COMPRA CARTAO PADARIA",
      externalId: "ofx:12345-6:A1",
    });
    expect(drafts[1]).toMatchObject({ type: "INCOME", amountCents: 500000, description: "SALARIO" });
  });

  it("decodes Windows-1252 files", () => {
    const buffer = Buffer.from("OFXHEADER:100\nCHARSET:1252\n<MEMO>PAGAMENTO CART\xC3O", "latin1");
    expect(decodeStatement(buffer)).toContain("CARTÃO");
  });
});

describe("CSV", () => {
  const csv = `Data;Descrição;Valor
05/11/2026;Padaria;-12,50
05/11/2026;Padaria;-12,50
06/11/2026;Salário;5.000,00`;

  it("detects columns and keeps identical rows distinct", () => {
    const drafts = parseStatement("extrato.csv", csv, "negative-expense");
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toMatchObject({ type: "EXPENSE", amountCents: 1250, date: "2026-11-05" });
    expect(drafts[2]).toMatchObject({ type: "INCOME", amountCents: 500000 });
    expect(drafts[0].externalId).not.toBe(drafts[1].externalId);
  });

  it("produces stable ids for re-imports", () => {
    const a = parseStatement("a.csv", csv, "negative-expense").map((d) => d.externalId);
    const b = parseStatement("b.csv", csv, "negative-expense").map((d) => d.externalId);
    expect(a).toEqual(b);
  });

  it("supports credit card bills where purchases are positive", () => {
    const drafts = parseStatement("fatura.csv", "date,title,amount\n2026-11-03,Mercado,89.90", "positive-expense");
    expect(drafts[0]).toMatchObject({ type: "EXPENSE", amountCents: 8990, date: "2026-11-03" });
  });

  it("explains missing columns", () => {
    expect(() => parseStatement("x.csv", "foo;bar\n1;2", "negative-expense")).toThrow(CsvFormatError);
  });
});
