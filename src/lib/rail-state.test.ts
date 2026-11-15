import { describe, expect, it } from "vitest";
import { parseRailCollapsed, railToggleLabel, serializeRailCollapsed } from "./rail-state";

describe("rail state", () => {
  it("is expanded unless the saved value is exactly 1", () => {
    expect(parseRailCollapsed("1")).toBe(true);
    for (const raw of [null, undefined, "", "0", "true", "collapsed", " 1"]) {
      expect(parseRailCollapsed(raw)).toBe(false);
    }
  });

  it("round-trips through the serialized value", () => {
    expect(parseRailCollapsed(serializeRailCollapsed(true))).toBe(true);
    expect(parseRailCollapsed(serializeRailCollapsed(false))).toBe(false);
  });

  it("names the toggle after its next action", () => {
    expect(railToggleLabel(false)).toBe("Recolher menu");
    expect(railToggleLabel(true)).toBe("Expandir menu");
  });
});
