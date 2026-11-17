import { describe, expect, it } from "vitest";
import { nextTabIndex, tabScrollLeft } from "./sliding-tabs";

describe("tabScrollLeft", () => {
  const view = { scrollLeft: 100, clientWidth: 200 };

  it("keeps the scroll when the tab is already in view", () => {
    expect(tabScrollLeft({ ...view, tabLeft: 150, tabWidth: 60 })).toBe(100);
  });

  it("scrolls right just enough to show a tab past the right edge, with a margin", () => {
    expect(tabScrollLeft({ ...view, tabLeft: 280, tabWidth: 60 })).toBe(280 + 60 + 8 - 200);
  });

  it("scrolls left to show a tab before the left edge, with a margin", () => {
    expect(tabScrollLeft({ ...view, tabLeft: 40, tabWidth: 60 })).toBe(32);
  });

  it("never scrolls below zero", () => {
    expect(tabScrollLeft({ scrollLeft: 20, clientWidth: 200, tabLeft: 3, tabWidth: 60 })).toBe(0);
  });

  it("accepts another margin", () => {
    expect(tabScrollLeft({ ...view, tabLeft: 280, tabWidth: 60, margin: 0 })).toBe(140);
  });
});

describe("nextTabIndex", () => {
  it("moves with the arrows and wraps around the ends", () => {
    expect(nextTabIndex("ArrowRight", 0, 4)).toBe(1);
    expect(nextTabIndex("ArrowRight", 3, 4)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 2, 4)).toBe(1);
    expect(nextTabIndex("ArrowLeft", 0, 4)).toBe(3);
  });

  it("jumps to the first and last with Home and End", () => {
    expect(nextTabIndex("Home", 2, 4)).toBe(0);
    expect(nextTabIndex("End", 0, 4)).toBe(3);
  });

  it("ignores every other key and an empty bar", () => {
    for (const key of ["Enter", " ", "a", "ArrowUp", "ArrowDown", "Tab"]) expect(nextTabIndex(key, 1, 4)).toBe(-1);
    expect(nextTabIndex("ArrowRight", 0, 0)).toBe(-1);
  });
});
