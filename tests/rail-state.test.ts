import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The rail helpers live inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <rail-state>.*\r?\n([\s\S]*?)\/\/ <\/rail-state>/.exec(html)?.[1];
if (!block) throw new Error("rail-state block not found in index.html");
const { parseRailCollapsed, serializeRailCollapsed, railToggleLabel } = new Function(
  `${block}\nreturn { parseRailCollapsed, serializeRailCollapsed, railToggleLabel };`,
)() as {
  parseRailCollapsed: (raw: string | null | undefined) => boolean;
  serializeRailCollapsed: (collapsed: boolean) => string;
  railToggleLabel: (collapsed: boolean) => string;
};

describe("rail state (index.html)", () => {
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
