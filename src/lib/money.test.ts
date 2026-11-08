import { describe, expect, it } from "vitest";
import { centsToInput, formatBRL, parseMoneyToCents } from "./money";

describe("parseMoneyToCents", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1234.56", 123456],
    ["R$ 12", 1200],
    ["R$ 1.000,00", 100000],
    ["0,1", 10],
    ["-3,5", -350],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["10.5", 1050],
    ["0.005", 1],
    ["0,004", 0],
  ])("parses %j as %i cents", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3a", "R$"])("rejects %j", (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });

  it("avoids float rounding errors", () => {
    // 0.1 + 0.2 style issues: 19.99 * 100 = 1998.9999999999998 in floating point.
    expect(parseMoneyToCents("19,99")).toBe(1999);
  });
});

describe("formatting", () => {
  it("formats BRL", () => {
    expect(formatBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });

  it("round-trips through the input format", () => {
    for (const cents of [0, 5, 1999, 123456, -250]) {
      expect(parseMoneyToCents(centsToInput(cents))).toBe(cents);
    }
  });
});
