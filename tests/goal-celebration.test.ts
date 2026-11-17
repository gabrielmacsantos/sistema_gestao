import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The goal celebration rules live inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <goal-celebration>.*\r?\n([\s\S]*?)\/\/ <\/goal-celebration>/.exec(html)?.[1];
if (!block) throw new Error("goal-celebration block not found in index.html");

type Decision = { celebrate: boolean; celebrated: string[] };
const { goalReached, goalJustReached, parseCelebrated, serializeCelebrated, celebrationDecision } = new Function(
  `${block}\nreturn { goalReached, goalJustReached, parseCelebrated, serializeCelebrated, celebrationDecision };`,
)() as {
  goalReached: (saved: number, target: number) => boolean;
  goalJustReached: (before: number, after: number, target: number) => boolean;
  parseCelebrated: (raw: string | null | undefined) => string[];
  serializeCelebrated: (ids: string[]) => string;
  celebrationDecision: (input: {
    goalId: string;
    beforeCents: number;
    afterCents: number;
    targetCents: number;
    celebrated: string[];
  }) => Decision;
};

describe("goal celebration (index.html)", () => {
  it("reaches a goal from the target on, in whole cents, and never a target of 0", () => {
    expect(goalReached(100_000, 100_000)).toBe(true);
    expect(goalReached(100_001, 100_000)).toBe(true);
    expect(goalReached(99_999, 100_000)).toBe(false);
    expect(goalReached(0, 0)).toBe(false);
    expect(goalReached(500, -100)).toBe(false);
    expect(goalReached(1000.5, 1000)).toBe(false);
    expect(goalReached(Number.NaN, 1000)).toBe(false);
  });

  it("fires only when a change crosses the target", () => {
    expect(goalJustReached(90_000, 100_000, 100_000)).toBe(true);
    expect(goalJustReached(0, 150_000, 100_000)).toBe(true);
    expect(goalJustReached(90_000, 99_999, 100_000)).toBe(false);
    expect(goalJustReached(100_000, 120_000, 100_000)).toBe(false);
  });

  it("reads and writes the list of celebrated ids", () => {
    expect(parseCelebrated(serializeCelebrated(["a", "b", "a"]))).toEqual(["a", "b"]);
    for (const raw of [null, undefined, "", "not json", "{}", '"a"', "42", "null"]) expect(parseCelebrated(raw)).toEqual([]);
    expect(parseCelebrated('["a", 1, null, "", "b"]')).toEqual(["a", "b"]);
  });

  it("celebrates once, marks it, and does not repeat", () => {
    const base = { goalId: "g", targetCents: 100_000 };
    const first = celebrationDecision({ ...base, beforeCents: 60_000, afterCents: 100_000, celebrated: ["x"] });
    expect(first).toEqual({ celebrate: true, celebrated: ["x", "g"] });
    const more = celebrationDecision({ ...base, beforeCents: 100_000, afterCents: 130_000, celebrated: first.celebrated });
    expect(more.celebrate).toBe(false);
    expect(more.celebrated).toEqual(["x", "g"]);
  });

  it("does not celebrate a goal that was already done (restored or synced) and never marked", () => {
    const out = celebrationDecision({ goalId: "g", targetCents: 100_000, beforeCents: 100_000, afterCents: 130_000, celebrated: [] });
    expect(out).toEqual({ celebrate: false, celebrated: [] });
  });

  it("clears the mark under the target, so the next completion celebrates again", () => {
    const base = { goalId: "g", targetCents: 100_000 };
    const down = celebrationDecision({ ...base, beforeCents: 100_000, afterCents: 40_000, celebrated: ["g", "x"] });
    expect(down).toEqual({ celebrate: false, celebrated: ["x"] });
    expect(celebrationDecision({ ...base, beforeCents: 40_000, afterCents: 100_000, celebrated: down.celebrated }).celebrate).toBe(true);
  });

  it("celebrates a goal created already complete, and nothing below the target", () => {
    const base = { goalId: "g", targetCents: 100_000, celebrated: [] };
    expect(celebrationDecision({ ...base, beforeCents: 0, afterCents: 100_000 })).toEqual({ celebrate: true, celebrated: ["g"] });
    expect(celebrationDecision({ ...base, beforeCents: 10_000, afterCents: 99_999 })).toEqual({ celebrate: false, celebrated: [] });
  });
});
