import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The tokens and the theme helpers live inside the static index.html.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const cssBlock = (selector: string) => {
  const start = html.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`${selector} not found in index.html`);
  return html.slice(start, html.indexOf("\n}", start));
};
const token = (block: string, name: string) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block)?.[1]?.toLowerCase();

const light = cssBlock(":root");
const dark = cssBlock(':root[data-theme="dark"]');

const LIGHT: Record<string, string> = {
  "--bg-primary": "#f8fafc", "--bg-card": "#ffffff", "--bg-elevated": "#f1f5f9", "--border-subtle": "#e2e8f0",
  "--brand-primary": "#059669", "--brand-primary-alt": "#0d9488", "--brand-secondary": "#4f46e5", "--brand-accent": "#0284c7",
  "--text-primary": "#0f172a", "--text-secondary": "#475569", "--text-muted": "#94a3b8",
  "--semantic-income": "#16a34a", "--semantic-expense": "#e11d48", "--semantic-warning": "#d97706",
};
const DARK: Record<string, string> = {
  "--bg-primary": "#090d16", "--bg-card": "#111827", "--bg-elevated": "#1e293b", "--border-subtle": "#1f2937",
  "--brand-primary": "#10b981", "--brand-primary-alt": "#2dd4bf", "--brand-secondary": "#6366f1", "--brand-accent": "#38bdf8",
  "--text-primary": "#f8fafc", "--text-secondary": "#94a3b8", "--text-muted": "#475569",
  "--semantic-income": "#22c55e", "--semantic-expense": "#f43f5e", "--semantic-warning": "#f59e0b",
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("theme tokens", () => {
  it.each(Object.entries(LIGHT))("light %s", (name, value) => expect(token(light, name)).toBe(value));
  it.each(Object.entries(DARK))("dark %s", (name, value) => expect(token(dark, name)).toBe(value));

  it("keeps the short names pointing at the spec names", () => {
    expect(light).toContain("--card: var(--bg-card)");
    expect(light).toContain("--primary: var(--brand-primary)");
    expect(light).toContain("--danger: var(--semantic-expense)");
  });

  it("starts in the dark theme when nothing is saved", () => {
    expect(html).toContain('if (t !== "light" && t !== "dark") t = "dark";');
    expect(html).not.toMatch(/t = matchMedia\("\(prefers-color-scheme/);
  });

  it("keeps typed-text hints and body text readable (WCAG 4.5:1)", () => {
    expect(contrast(token(dark, "--placeholder")!, DARK["--bg-card"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(light, "--placeholder")!, LIGHT["--bg-card"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(DARK["--text-secondary"], DARK["--bg-card"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(LIGHT["--text-secondary"], LIGHT["--bg-card"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(dark, "--on-primary")!, DARK["--brand-primary"])).toBeGreaterThanOrEqual(4.5);
  });

  it("registers the status bar plugin and syncs it only in the app", () => {
    expect(html).toContain('"SpeechRecognition", "StatusBar"]');
    expect(html).toContain('style: t === "dark" ? "DARK" : "LIGHT"');
    expect(html).toContain("const bar = NativePlugins.StatusBar; if (!bar) return;");
  });
});

describe("theme helpers", () => {
  const block = /\/\/ <theme>.*\r?\n([\s\S]*?)\/\/ <\/theme>/.exec(html)?.[1];
  if (!block) throw new Error("theme block not found in index.html");
  const { themeName } = new Function(`${block}\nreturn { themeName };`)() as { themeName: (v: unknown) => string };

  it("only 'light' is light; anything else is dark", () => {
    expect(themeName("light")).toBe("light");
    expect(themeName("dark")).toBe("dark");
    expect(themeName(null)).toBe("dark");
    expect(themeName("auto")).toBe("dark");
  });
});
