import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as lib from "@/lib/money";

// The same mask lives in src/lib/money.ts (Next.js) and inside the static index.html.
type Api = Pick<typeof lib, "formatCentsInput" | "maskMoneyInput">;

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <money-mask>.*\r?\n([\s\S]*?)\/\/ <\/money-mask>/.exec(html)?.[1];
if (!block) throw new Error("money-mask block not found in index.html");
const fromHtml = new Function(`${block}\nreturn { formatCentsInput, maskMoneyInput };`)() as Api;

describe.each([
  ["src/lib/money.ts", lib as Api],
  ["index.html", fromHtml],
])("%s", (_, { formatCentsInput, maskMoneyInput }) => {
  it("turns the typed digits into cents: 5230 is R$ 52,30", () => {
    expect(maskMoneyInput("5230")).toEqual({ cents: 5230, text: "52,30" });
    expect(maskMoneyInput("5")).toEqual({ cents: 5, text: "0,05" });
    expect(maskMoneyInput("52")).toEqual({ cents: 52, text: "0,52" });
    expect(maskMoneyInput("123456")).toEqual({ cents: 123456, text: "1.234,56" });
  });

  it("follows each key: typing one more digit or deleting the last one", () => {
    expect(maskMoneyInput("52,307").text).toBe("523,07"); // "52,30" + "7"
    expect(maskMoneyInput("52,3").text).toBe("5,23"); // backspace on "52,30"
    expect(maskMoneyInput("0,0").text).toBe(""); // backspace down to nothing
  });

  it("drops anything that is not a digit and leading zeros", () => {
    expect(maskMoneyInput("R$ 1.234,56")).toEqual({ cents: 123456, text: "1.234,56" });
    expect(maskMoneyInput("abc")).toEqual({ cents: null, text: "" });
    expect(maskMoneyInput("-12")).toEqual({ cents: 12, text: "0,12" });
    expect(maskMoneyInput("000071")).toEqual({ cents: 71, text: "0,71" });
    expect(maskMoneyInput("")).toEqual({ cents: null, text: "" });
  });

  it("stops at 11 digits (R$ 999.999.999,99)", () => {
    expect(maskMoneyInput("99999999999")).toEqual({ cents: 99999999999, text: "999.999.999,99" });
    expect(maskMoneyInput("999999999999").cents).toBe(99999999999);
  });

  it("formats with integers only, with thousand separators", () => {
    expect(formatCentsInput(0)).toBe("0,00");
    expect(formatCentsInput(1005)).toBe("10,05");
    expect(formatCentsInput(100000000)).toBe("1.000.000,00");
  });

  it("reads back exactly: what the field shows parses to the same cents", () => {
    for (const cents of [1, 5, 10, 99, 100, 1005, 5230, 99999, 123456, 1000000, 99999999999]) {
      expect(lib.parseMoneyToCents(formatCentsInput(cents))).toBe(cents);
    }
  });
});
