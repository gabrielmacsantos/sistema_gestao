import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// The toast helpers live inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <toast-timer>.*\r?\n([\s\S]*?)\/\/ <\/toast-timer>/.exec(html)?.[1];
if (!block) throw new Error("toast-timer block not found in index.html");
const { toastDuration, pausableTimer } = new Function(`${block}\nreturn { toastDuration, pausableTimer };`)() as {
  toastDuration: (text: string) => number;
  pausableTimer: (ms: number, onDone: () => void) => { pause(): void; resume(): void; cancel(): void };
};

describe("toastDuration", () => {
  it("stays within 4000-4500 ms", () => {
    for (const n of [0, 10, 40, 80, 120, 400]) {
      const ms = toastDuration("x".repeat(n));
      expect(ms).toBeGreaterThanOrEqual(4000);
      expect(ms).toBeLessThanOrEqual(4500);
    }
  });

  it("gives short messages 4 s and long ones 4.5 s", () => {
    expect(toastDuration("Lançamento salvo.")).toBe(4000);
    expect(toastDuration("x".repeat(200))).toBe(4500);
  });
});

describe("pausableTimer", () => {
  it("fires after the given time", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    pausableTimer(4000, done);
    vi.advanceTimersByTime(3999);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("keeps the remaining time while paused and resumes with it", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const t = pausableTimer(4000, done);
    vi.advanceTimersByTime(1500);
    t.pause();
    vi.advanceTimersByTime(60000);
    expect(done).not.toHaveBeenCalled();
    t.resume();
    vi.advanceTimersByTime(2499);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("never fires after cancel", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const t = pausableTimer(4000, done);
    t.cancel();
    vi.advanceTimersByTime(10000);
    expect(done).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
