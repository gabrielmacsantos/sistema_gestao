import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The test-version rules live inside the static index.html; load the marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <beta-window>.*\r?\n([\s\S]*?)\/\/ <\/beta-window>/.exec(html)?.[1];
if (!block) throw new Error("beta-window block not found in index.html");
const { BETA_ENABLED, BETA_END_DATE, betaStatus, betaText } = new Function(`${block}\nreturn { BETA_ENABLED, BETA_END_DATE, betaStatus, betaText };`)() as {
  BETA_ENABLED: boolean;
  BETA_END_DATE: string;
  betaStatus: (now: number, enabled?: boolean, end?: string) => { phase: "off" | "running" | "last" | "expired"; days: number };
  betaText: (st: { phase: string; days: number }) => string;
};
const at = (iso: string) => Date.parse(iso); // all instants are written with the São Paulo offset (-03:00)

describe("test version window (index.html)", () => {
  it("ends on 31/01/2027 and is on for the test build", () => {
    expect(BETA_END_DATE).toBe("2027-01-31");
    expect(BETA_ENABLED).toBe(true);
  });

  it("counts the whole days left", () => {
    expect(betaStatus(at("2026-11-22T12:00:00-03:00"))).toEqual({ phase: "running", days: 70 });
    expect(betaStatus(at("2027-01-01T00:00:00-03:00"))).toEqual({ phase: "running", days: 30 });
    expect(betaStatus(at("2027-01-30T23:59:59-03:00"))).toEqual({ phase: "running", days: 1 });
  });

  it("the count follows São Paulo's calendar, not the device's time zone", () => {
    // 01:00 UTC on 31/01 is still 22:00 on 30/01 in São Paulo: one day left.
    expect(betaStatus(at("2027-01-31T01:00:00Z"))).toEqual({ phase: "running", days: 1 });
    expect(betaStatus(at("2027-01-31T03:00:00Z"))).toEqual({ phase: "last", days: 0 });
  });

  it("the last day stays open until 23:59:59 and the next day it is over", () => {
    expect(betaStatus(at("2027-01-31T00:00:00-03:00")).phase).toBe("last");
    expect(betaStatus(at("2027-01-31T23:59:59-03:00")).phase).toBe("last");
    expect(betaStatus(at("2027-02-01T00:00:00-03:00")).phase).toBe("expired");
    expect(betaStatus(at("2028-06-01T12:00:00-03:00")).phase).toBe("expired");
  });

  it("is off when disabled (store builds)", () => {
    expect(betaStatus(at("2027-06-01T12:00:00-03:00"), false).phase).toBe("off");
  });

  it("writes the notice with the right plural", () => {
    expect(betaText({ phase: "running", days: 70 })).toBe("O app está na versão BETA. Faltam 70 dias para a versão de teste acabar.");
    expect(betaText({ phase: "running", days: 1 })).toBe("O app está na versão BETA. Falta 1 dia para a versão de teste acabar.");
    expect(betaText({ phase: "last", days: 0 })).toContain("último dia");
  });
});
