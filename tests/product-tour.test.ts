import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The tour helpers live inside the static index.html; load the marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <product-tour>.*\r?\n([\s\S]*?)\/\/ <\/product-tour>/.exec(html)?.[1];
if (!block) throw new Error("product-tour block not found in index.html");

type Rect = { left: number; top: number; width: number; height: number };
const { TOUR_STEPS, tourKey, shouldStartTour, resolveTourStep, spotlightRect, placePopover } = new Function(
  `${block}\nreturn { TOUR_STEPS, tourKey, shouldStartTour, resolveTourStep, spotlightRect, placePopover };`,
)() as {
  TOUR_STEPS: { id: string; target: string; also: string[]; title: string; text: string; example: string }[];
  tourKey: (scope: string) => string;
  shouldStartTour: (x: { done: boolean; hasAccess: boolean; path: string; busy: boolean }) => boolean;
  resolveTourStep: (total: number, from: number, isVisible: (i: number) => boolean) => number;
  spotlightRect: (r: Rect, pad: number, vp: { w: number; h: number }) => Rect;
  placePopover: (
    rect: Rect,
    vp: { w: number; h: number },
    pop: { w: number; h: number },
    insets: { top: number; bottom: number },
  ) => { side: "below" | "above" | "dock"; left: number; top: number };
};

const insets = { top: 0, bottom: 0 };

describe("product tour (index.html)", () => {
  it("has the five planned steps, each with a title, an explanation and an example", () => {
    expect(TOUR_STEPS.map((s) => s.target)).toEqual(["1", "2", "3", "4", "5"]);
    for (const s of TOUR_STEPS) for (const k of ["title", "text", "example"] as const) expect(s[k].length).toBeGreaterThan(10);
  });

  it("keeps the done flag per account", () => {
    expect(tourKey("g:123")).toBe("mf-tour-done:g:123");
    expect(tourKey("local")).not.toBe(tourKey("g:123"));
  });

  it("opens on its own only on the Painel, for a new visit, with access and no dialog open", () => {
    const base = { done: false, hasAccess: true, path: "painel", busy: false };
    expect(shouldStartTour(base)).toBe(true);
    expect(shouldStartTour({ ...base, done: true })).toBe(false);
    expect(shouldStartTour({ ...base, hasAccess: false })).toBe(false);
    expect(shouldStartTour({ ...base, path: "lancamentos" })).toBe(false);
    expect(shouldStartTour({ ...base, busy: true })).toBe(false);
  });

  it("skips steps whose target is not on screen and ends when none is left", () => {
    const visible = (i: number) => i !== 1 && i !== 2;
    expect(resolveTourStep(5, 0, visible)).toBe(0);
    expect(resolveTourStep(5, 1, visible)).toBe(3);
    expect(resolveTourStep(5, 4, () => false)).toBe(-1);
    expect(resolveTourStep(5, 5, () => true)).toBe(-1);
  });

  it("pads the cut-out and keeps it inside the viewport", () => {
    const vp = { w: 360, h: 640 };
    expect(spotlightRect({ left: 20, top: 100, width: 100, height: 40 }, 8, vp)).toEqual({ left: 12, top: 92, width: 116, height: 56 });
    expect(spotlightRect({ left: 0, top: -50, width: 400, height: 900 }, 8, vp)).toEqual({ left: 0, top: 0, width: 360, height: 640 });
  });

  it("puts the card below the target when it fits, centered and clamped to 12px at 360px wide", () => {
    const vp = { w: 360, h: 640 };
    const pos = placePopover({ left: 0, top: 80, width: 360, height: 60 }, vp, { w: 336, h: 220 }, insets);
    expect(pos).toEqual({ side: "below", left: 12, top: 154 });
    const right = placePopover({ left: 320, top: 80, width: 40, height: 40 }, vp, { w: 336, h: 220 }, insets);
    expect(right.left).toBe(12);
    expect(right.left + 336).toBeLessThanOrEqual(vp.w - 12);
  });

  it("goes above the target near the bottom, and docks when neither side has room", () => {
    const vp = { w: 360, h: 640 };
    expect(placePopover({ left: 100, top: 520, width: 60, height: 60 }, vp, { w: 336, h: 220 }, insets).side).toBe("above");
    const dock = placePopover({ left: 0, top: 0, width: 360, height: 640 }, vp, { w: 336, h: 220 }, insets);
    expect(dock.side).toBe("dock");
    expect(dock.top + 220).toBeLessThanOrEqual(640 - 12);
  });

  it("respects the safe-area insets", () => {
    const vp = { w: 360, h: 640 };
    const below = placePopover({ left: 100, top: 380, width: 60, height: 40 }, vp, { w: 336, h: 200 }, { top: 0, bottom: 34 });
    expect(below.side).toBe("above"); // 394 + 200 > 640 - 34 - 12
    const above = placePopover({ left: 100, top: 120, width: 60, height: 500 }, vp, { w: 336, h: 200 }, { top: 40, bottom: 0 });
    expect(above.side).toBe("dock");
    expect(above.top).toBeGreaterThanOrEqual(40 + 12);
  });
});
