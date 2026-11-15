import { describe, expect, it } from "vitest";
import { formatBRL } from "./money";
import { REEL_SPINS, reelCell, reelChars } from "./reel";

describe("reelChars", () => {
  it("turns every digit of the formatted amount into a reel, cents included", () => {
    const chars = reelChars(formatBRL(125045));
    const digits = chars.filter((c) => c.digit !== null).map((c) => c.digit);
    expect(digits).toEqual([1, 2, 5, 0, 4, 5]);
    expect(chars.map((c) => c.char).join("")).toBe(formatBRL(125045));
  });

  it("keeps the cents reels when only the cents change", () => {
    const before = reelChars(formatBRL(10000));
    const after = reelChars(formatBRL(10085));
    expect(after.map((c) => c.key)).toEqual(before.map((c) => c.key));
    const changed = after.filter((c, i) => c.digit !== before[i].digit).map((c) => c.digit);
    expect(changed).toEqual([8, 5]);
  });

  it("keeps the reel positions from the end when the number grows", () => {
    const small = reelChars(formatBRL(99999));
    const big = reelChars(formatBRL(100000));
    expect(big.find((c) => c.key === 0)?.digit).toBe(0);
    expect(small.find((c) => c.key === 0)?.digit).toBe(9);
    expect(big.length).toBeGreaterThan(small.length);
  });

  it("marks signs and separators as fixed characters", () => {
    const chars = reelChars(formatBRL(-5));
    expect(chars.filter((c) => c.digit === null).map((c) => c.char).join("")).toContain("-");
  });
});

describe("reelCell", () => {
  it("lands on the digit after the full turns", () => {
    expect(reelCell(0)).toBe(REEL_SPINS * 10);
    expect(reelCell(7)).toBe(REEL_SPINS * 10 + 7);
    expect(Number.isInteger(reelCell(9, 3))).toBe(true);
  });
});
