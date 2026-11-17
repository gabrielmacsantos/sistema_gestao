import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The drawer helpers live inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <drawer-state>.*\r?\n([\s\S]*?)\/\/ <\/drawer-state>/.exec(html)?.[1];
if (!block) throw new Error("drawer-state block not found in index.html");
const { DRAWER_MS, trapFocusIndex, syncNeedsAttention } = new Function(
  `${block}\nreturn { DRAWER_MS, trapFocusIndex, syncNeedsAttention };`,
)() as {
  DRAWER_MS: number;
  trapFocusIndex: (count: number, index: number, shift: boolean) => number;
  syncNeedsAttention: (status: string) => boolean;
};

describe("drawer state (index.html)", () => {
  it("wraps Tab from the last item to the first and Shift+Tab the other way", () => {
    expect(trapFocusIndex(4, 3, false)).toBe(0);
    expect(trapFocusIndex(4, 0, true)).toBe(3);
    expect(trapFocusIndex(4, 1, false)).toBe(2);
    expect(trapFocusIndex(4, 2, true)).toBe(1);
  });

  it("pulls focus inside when it starts outside the drawer", () => {
    expect(trapFocusIndex(4, -1, false)).toBe(0);
    expect(trapFocusIndex(4, -1, true)).toBe(3);
  });

  it("does nothing without focusable items", () => {
    expect(trapFocusIndex(0, -1, false)).toBe(-1);
  });

  it("flags only the sync states that need the person", () => {
    expect(syncNeedsAttention("reauth")).toBe(true);
    expect(syncNeedsAttention("error")).toBe(true);
    for (const s of ["ok", "saving", "", "other"]) expect(syncNeedsAttention(s)).toBe(false);
  });

  it("slides for the planned 250 to 300 ms", () => {
    expect(DRAWER_MS).toBeGreaterThanOrEqual(250);
    expect(DRAWER_MS).toBeLessThanOrEqual(300);
  });
});
