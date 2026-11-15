import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The calculator lives inside the static index.html (loaded from its marked block).
type State = { acc: number | null; op: string | null; entry: string; fresh: boolean; error: string };
type Api = {
  calcNew: () => State;
  calcPress: (s: State, key: string) => State;
  calcDisplay: (s: State) => string;
  calcExpression: (s: State) => string;
  calcValue: (s: State) => number | null;
};

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <calculator>.*\r?\n([\s\S]*?)\/\/ <\/calculator>/.exec(html)?.[1];
if (!block) throw new Error("calculator block not found in index.html");
const { calcNew, calcPress, calcDisplay, calcExpression, calcValue } = new Function(
  `${block}\nreturn { calcNew, calcPress, calcDisplay, calcExpression, calcValue };`,
)() as Api;

/** Presses a sequence like "0,1+0,2=" and returns the final state. */
const run = (keys: string) => [...keys].reduce(calcPress, calcNew());

describe("calculator (integer cents)", () => {
  it("adds without floating point drift: 0,1 + 0,2 is exactly 0,30", () => {
    const s = run("0,1+0,2=");
    expect(calcValue(s)).toBe(30);
    expect(calcDisplay(s)).toBe("0,30");
  });

  it("subtracts, including a negative result", () => {
    expect(calcValue(run("10-2,5="))).toBe(750);
    expect(calcValue(run("1-3="))).toBe(-200);
    expect(calcDisplay(run("1-3="))).toBe("-2,00");
  });

  it("multiplies by a plain number: 100 × 1,1 is 110,00", () => {
    expect(calcValue(run("100×1,1="))).toBe(11000);
    expect(calcValue(run("19,99×3="))).toBe(5997);
  });

  it("divides and rounds half away from zero to the cent", () => {
    expect(calcValue(run("10÷3="))).toBe(333);
    expect(calcValue(run("20÷3="))).toBe(667);
    expect(calcValue(run("0,05÷2="))).toBe(3); // 2,5 cents -> 3
    expect(calcValue(run("1-2×0,5="))).toBe(-50); // chains left to right: (1-2) × 0,5
  });

  it("refuses to divide by zero and recovers on the next key", () => {
    const s = run("5÷0=");
    expect(s.error).toBe("Não dá para dividir por zero");
    expect(calcValue(s)).toBeNull();
    expect(calcValue(calcPress(s, "7"))).toBe(700);
  });

  it("percent: of the first number for + and −, a fraction for × and ÷, hundredth alone", () => {
    expect(calcValue(run("200+10%="))).toBe(22000);
    expect(calcValue(run("200-15%="))).toBe(17000);
    expect(calcValue(run("200×10%="))).toBe(2000);
    expect(calcValue(run("50%"))).toBe(50);
    expect(calcDisplay(run("50%"))).toBe("0,50");
  });

  it("keeps at most two decimals and nine integer digits", () => {
    expect(calcDisplay(run("1,239"))).toBe("1,23");
    expect(calcDisplay(run("12345678901"))).toBe("123.456.789");
  });

  it("flags values above the money ceiling instead of overflowing", () => {
    const s = run("999999999×999999999=");
    expect(s.error).toBe("Valor grande demais");
  });

  it("shows the thousands separator while typing and the pending operation", () => {
    expect(calcDisplay(run("1234,5"))).toBe("1.234,5");
    expect(calcExpression(run("12+"))).toBe("12,00 +");
    expect(calcExpression(run("12-"))).toBe("12,00 −");
  });

  it("starts a new number after =, but keeps going with an operator", () => {
    expect(calcValue(run("2+2=5"))).toBe(500);
    expect(calcValue(run("2+2=+3="))).toBe(700);
  });

  it("backspace and clear", () => {
    expect(calcDisplay(run("123⌫"))).toBe("12");
    expect(calcDisplay(run("123C"))).toBe("0,00");
  });

  it("the current value is available before pressing =", () => {
    expect(calcValue(run("10+5"))).toBe(1500);
    expect(calcValue(run(""))).toBeNull();
  });
});
