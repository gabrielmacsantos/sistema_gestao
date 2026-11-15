import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reelCell as reelCellTs, reelChars as reelCharsTs } from "../src/lib/reel";

// The reel helpers live inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <reel>.*\r?\n([\s\S]*?)\/\/ <\/reel>/.exec(html)?.[1];
if (!block) throw new Error("reel block not found in index.html");
const { reelChars, reelCell } = new Function(`${block}\nreturn { reelChars, reelCell };`)() as {
  reelChars: typeof reelCharsTs;
  reelCell: typeof reelCellTs;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

describe("index.html reel block", () => {
  it.each([0, 5, 10085, 125045, 99999999])("splits %i cents the same way as src/lib/reel.ts", (cents) => {
    const text = brl.format(cents / 100);
    expect(reelChars(text)).toEqual(reelCharsTs(text));
  });

  it("keeps the cents digits as their own reels", () => {
    const digits = reelChars(brl.format(1250.45)).filter((c) => c.digit !== null);
    expect(digits.map((c) => c.digit)).toEqual([1, 2, 5, 0, 4, 5]);
    expect(digits.slice(-2).map((c) => c.key)).toEqual([1, 0]);
  });

  it("lands on the same cell as src/lib/reel.ts", () => {
    for (let d = 0; d < 10; d++) expect(reelCell(d)).toBe(reelCellTs(d));
  });
});
