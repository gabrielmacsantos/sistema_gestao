import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildNfceDraft } from "./draft";
import { parseStandardPortal } from "./parsers/standard-portal";
import { isValidAccessKey, parseNfceQr } from "./qrcode";

/** Appends the mod-11 check digit to a 43-digit key body. */
function withCheckDigit(body: string): string {
  let sum = 0;
  let weight = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  return body + (rest < 2 ? 0 : 11 - rest);
}

// cUF 35 (SP), 2611 (Nov/2026), CNPJ, model 65, series 001, number, tpEmis 1, cNF
const KEY = withCheckDigit("3526111122233300018165001000001234100000001");

describe("parseNfceQr", () => {
  it("validates the access key check digit", () => {
    expect(isValidAccessKey(KEY)).toBe(true);
    const wrong = KEY.slice(0, 43) + ((Number(KEY[43]) + 1) % 10);
    expect(isValidAccessKey(wrong)).toBe(false);
  });

  it("parses an online v2 QR Code", () => {
    const qr = parseNfceQr(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${KEY}|2|1|1|ABCDEF`);
    expect(qr).toMatchObject({
      accessKey: KEY,
      uf: "SP",
      issuerTaxId: "11222333000181",
      issueMonth: "2026-11",
      day: null,
      totalCents: null,
    });
  });

  it("reads day and total from an offline QR Code", () => {
    const qr = parseNfceQr(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${KEY}|2|1|05|32.53|6162|1|HASH`);
    expect(qr).toMatchObject({ day: 5, totalCents: 3253 });
  });

  it("rejects anything that is not an NFC-e", () => {
    expect(parseNfceQr("hello")).toBeNull();
    expect(parseNfceQr("https://example.com/?p=123|2|1")).toBeNull();
    expect(parseNfceQr(`javascript:alert(1)?p=${KEY}`)).toBeNull();
  });
});

describe("parseStandardPortal", () => {
  const html = readFileSync("tests/fixtures/nfce-standard-portal.html", "utf8");

  it("extracts merchant, items, totals and date", () => {
    const page = parseStandardPortal(html);
    expect(page.merchantName).toBe("MERCADO EXEMPLO LTDA");
    expect(page.merchantTaxId).toBe("11222333000181");
    expect(page.totalCents).toBe(3253); // "Valor a pagar" wins over "Valor total"
    expect(page.paymentMethod).toBe("Cartão de Débito");
    expect(page.date).toBe("2026-11-05");
    expect(page.items).toEqual([
      { description: "ARROZ TIPO 1 5KG", quantity: 1, unit: "UN", unitPriceCents: 2490, totalCents: 2490 },
      { description: "BANANA PRATA", quantity: 1.235, unit: "KG", unitPriceCents: 699, totalCents: 863 },
    ]);
  });

  it("returns empty data for unrelated pages", () => {
    const page = parseStandardPortal("<html><body>Captcha</body></html>");
    expect(page.items).toEqual([]);
    expect(page.totalCents).toBeNull();
  });
});

describe("buildNfceDraft", () => {
  const qr = parseNfceQr(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${KEY}|2|1|05|32.53|6162|1|HASH`)!;

  it("uses page data when available", () => {
    const draft = buildNfceDraft(qr, parseStandardPortal(readFileSync("tests/fixtures/nfce-standard-portal.html", "utf8")));
    expect(draft).toMatchObject({
      source: "NFCE",
      description: "MERCADO EXEMPLO LTDA",
      amountCents: 3253,
      date: "2026-11-05",
      externalId: KEY,
      warnings: [],
    });
    expect(draft.items).toHaveLength(2);
  });

  it("falls back to the QR Code data and warns", () => {
    const draft = buildNfceDraft(qr, null);
    expect(draft).toMatchObject({ amountCents: 3253, date: "2026-11-05", merchantTaxId: "11222333000181" });
    expect(draft.warnings.length).toBeGreaterThan(0);
  });
});
