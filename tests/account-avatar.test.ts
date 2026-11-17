import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The avatar helper lives inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <account-avatar>.*\r?\n([\s\S]*?)\/\/ <\/account-avatar>/.exec(html)?.[1];
if (!block) throw new Error("account-avatar block not found in index.html");
const { safeAvatarUrl } = new Function(`${block}\nreturn { safeAvatarUrl };`)() as {
  safeAvatarUrl: (raw: unknown) => string;
};

describe("safeAvatarUrl (index.html)", () => {
  it("keeps an https photo from Google's photo host", () => {
    expect(safeAvatarUrl("https://lh3.googleusercontent.com/a/abc123=s96-c")).toBe(
      "https://lh3.googleusercontent.com/a/abc123=s96-c",
    );
  });

  it("drops anything that is not https or not Google's host", () => {
    for (const raw of [
      "http://lh3.googleusercontent.com/a/abc",
      "https://evil.example.com/a.png",
      "https://googleusercontent.com.evil.example/a.png",
      "https://notgoogleusercontent.com/a.png",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "not a url",
      "",
      null,
      undefined,
    ]) {
      expect(safeAvatarUrl(raw)).toBe("");
    }
  });
});
