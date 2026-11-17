import { describe, expect, it } from "vitest";
import {
  celebratedStorageKey,
  celebrationDecision,
  goalJustReached,
  goalReached,
  parseCelebrated,
  serializeCelebrated,
} from "./goal-celebration";

describe("goalReached", () => {
  it("is true from the target on, in whole cents", () => {
    expect(goalReached(100_000, 100_000)).toBe(true);
    expect(goalReached(100_001, 100_000)).toBe(true);
    expect(goalReached(99_999, 100_000)).toBe(false);
  });

  it("never reaches a target of 0 or less, and rejects non-integers", () => {
    expect(goalReached(0, 0)).toBe(false);
    expect(goalReached(500, 0)).toBe(false);
    expect(goalReached(500, -100)).toBe(false);
    expect(goalReached(1000.5, 1000)).toBe(false);
    expect(goalReached(1000, 1000.5)).toBe(false);
    expect(goalReached(Number.NaN, 1000)).toBe(false);
  });

  it("is exact with large amounts", () => {
    expect(goalReached(99_999_999_999, 99_999_999_999)).toBe(true);
    expect(goalReached(99_999_999_998, 99_999_999_999)).toBe(false);
  });
});

describe("goalJustReached", () => {
  it("fires only when a change crosses the target", () => {
    expect(goalJustReached(90_000, 100_000, 100_000)).toBe(true);
    expect(goalJustReached(0, 150_000, 100_000)).toBe(true);
    expect(goalJustReached(90_000, 99_999, 100_000)).toBe(false);
  });

  it("does not fire for a goal that was already done", () => {
    expect(goalJustReached(100_000, 120_000, 100_000)).toBe(false);
    expect(goalJustReached(100_000, 100_000, 100_000)).toBe(false);
  });
});

describe("celebrated ids", () => {
  it("round-trips without duplicates", () => {
    expect(parseCelebrated(serializeCelebrated(["a", "b", "a"]))).toEqual(["a", "b"]);
  });

  it("reads anything that is not a list of ids as none", () => {
    for (const raw of [null, undefined, "", "not json", "{}", '"a"', "42", "null"]) expect(parseCelebrated(raw)).toEqual([]);
    expect(parseCelebrated('["a", 1, null, "", "b"]')).toEqual(["a", "b"]);
  });

  it("keeps one list per account", () => {
    expect(celebratedStorageKey("u1")).toBe("goals-celebrated:u1");
    expect(celebratedStorageKey("u1")).not.toBe(celebratedStorageKey("u2"));
  });
});

describe("celebrationDecision", () => {
  const base = { goalId: "g", targetCents: 100_000 };

  it("celebrates once when the goal is reached and marks it", () => {
    const out = celebrationDecision({ ...base, beforeCents: 60_000, afterCents: 100_000, celebrated: ["x"] });
    expect(out).toEqual({ celebrate: true, celebrated: ["x", "g"] });
  });

  it("does not celebrate again for more savings on a goal already celebrated", () => {
    const out = celebrationDecision({ ...base, beforeCents: 100_000, afterCents: 130_000, celebrated: ["g"] });
    expect(out).toEqual({ celebrate: false, celebrated: ["g"] });
  });

  it("does not celebrate when the goal was already done before (restored, synced) and was never marked", () => {
    const out = celebrationDecision({ ...base, beforeCents: 100_000, afterCents: 130_000, celebrated: [] });
    expect(out).toEqual({ celebrate: false, celebrated: [] });
  });

  it("clears the mark when the goal falls under the target, so the next completion celebrates again", () => {
    const down = celebrationDecision({ ...base, beforeCents: 100_000, afterCents: 40_000, celebrated: ["g", "x"] });
    expect(down).toEqual({ celebrate: false, celebrated: ["x"] });
    const up = celebrationDecision({ ...base, beforeCents: 40_000, afterCents: 100_000, celebrated: down.celebrated });
    expect(up.celebrate).toBe(true);
  });

  it("celebrates a goal created already complete", () => {
    const out = celebrationDecision({ ...base, beforeCents: 0, afterCents: 100_000, celebrated: [] });
    expect(out).toEqual({ celebrate: true, celebrated: ["g"] });
  });

  it("does nothing below the target", () => {
    const out = celebrationDecision({ ...base, beforeCents: 10_000, afterCents: 99_999, celebrated: [] });
    expect(out).toEqual({ celebrate: false, celebrated: [] });
  });
});
