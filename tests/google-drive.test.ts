import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The Drive helpers live inside the static index.html; they use hasValidMoney from its own block.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = (name: string) => {
  const code = new RegExp(`// <${name}>.*\\r?\\n([\\s\\S]*?)// </${name}>`).exec(html)?.[1];
  if (!code) throw new Error(`${name} block not found in index.html`);
  return code;
};
const { readDriveDataFile, driveMultipart } = new Function(
  `${block("money-check")}\n${block("google-drive")}\nreturn { readDriveDataFile, driveMultipart };`,
)() as {
  readDriveDataFile: (text: string) => { savedAt: number; data: { transactions: unknown[] } };
  driveMultipart: (meta: object, content: string, mime: string, boundary: string) => { type: string; parts: string[] };
};

const state = { version: 1, savedAt: 1731600000000, categories: [], transactions: [{ amountCents: 4590 }], recurrings: [] };

describe("Drive data file (older plain format)", () => {
  it("still reads the state with its savedAt", () => {
    const text = JSON.stringify({ app: "minhas-financas", format: "drive-1", savedAt: 1731600000000, state });
    expect(readDriveDataFile(text)).toEqual({ savedAt: 1731600000000, data: state });
  });

  it.each([
    ["another app's file", JSON.stringify({ app: "other", state })],
    ["a file without our state", JSON.stringify({ app: "minhas-financas" })],
    ["an unknown version", JSON.stringify({ app: "minhas-financas", state: { ...state, version: 2 } })],
    ["amounts that are not integer cents", JSON.stringify({ app: "minhas-financas", state: { ...state, transactions: [{ amountCents: 45.9 }] } })],
    ["amounts written as text", JSON.stringify({ app: "minhas-financas", state: { ...state, transactions: [{ amountCents: "4590" }] } })],
  ])("refuses %s", (_, text) => {
    expect(() => readDriveDataFile(text)).toThrow("Arquivo de dados inválido.");
  });

  it("refuses something that is not JSON", () => {
    expect(() => readDriveDataFile("<html>")).toThrow();
  });
});

describe("Drive multipart upload", () => {
  it("puts the metadata (in the app folder) and the content in one body", () => {
    const { type, parts } = driveMultipart({ name: "minhas-financas.json", parents: ["appDataFolder"] }, "{}", "application/json", "b1");
    expect(type).toBe("multipart/related; boundary=b1");
    expect(parts.join("")).toBe(
      '--b1\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"minhas-financas.json","parents":["appDataFolder"]}\r\n' +
        "--b1\r\nContent-Type: application/json\r\n\r\n{}\r\n--b1--",
    );
  });
});
