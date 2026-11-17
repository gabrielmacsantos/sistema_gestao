import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The sliding-tabs helpers live inside the static index.html; load its marked block and evaluate it.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = /\/\/ <sliding-tabs>.*\r?\n([\s\S]*?)\/\/ <\/sliding-tabs>/.exec(html)?.[1];
if (!block) throw new Error("sliding-tabs block not found in index.html");

type Item = { value: string; label: string; attrs?: string; tone?: "exp" | "inc"; href?: string };
type TabsSpec = {
  kind?: "tabs" | "radio" | "nav";
  key: string;
  label: string;
  items: Item[];
  active: string;
  panel?: string;
  fill?: boolean;
  cls?: string;
};
const { tabScrollLeft, nextTabIndex, tabsHtml } = new Function(
  `${block}\nreturn { tabScrollLeft, nextTabIndex, tabsHtml };`,
)() as {
  tabScrollLeft: (a: { scrollLeft: number; clientWidth: number; tabLeft: number; tabWidth: number; margin?: number }) => number;
  nextTabIndex: (key: string, index: number, count: number) => number;
  tabsHtml: (spec: TabsSpec) => string;
};

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

describe("tabsHtml", () => {
  const items: Item[] = [
    { value: "a", label: "Alfa", attrs: 'data-act="pick" data-v="a"' },
    { value: "b", label: "Beta" },
    { value: "c", label: "Gama" },
  ];
  const spec = { key: "demo", label: "Escolha", items, active: "b" };

  it("builds a tablist: tab roles, one selected tab in the tab order, the indicator first", () => {
    const out = tabsHtml({ ...spec, panel: "demo-panel" });
    expect(out).toContain('role="tablist"');
    expect(out).toContain('aria-label="Escolha"');
    expect(out).toContain('data-tabs="demo"');
    expect(out).toContain('data-kind="tabs"');
    expect(out.match(/role="tab"/g)).toHaveLength(3);
    expect(out.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(out.match(/tabindex="0"/g)).toHaveLength(1);
    expect(out.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(out.match(/aria-controls="demo-panel"/g)).toHaveLength(3);
    expect(out).toMatch(/^<div class="t-tabs"[^>]*><span class="t-tabs-pill" aria-hidden="true"><\/span>/);
    expect(out).toMatch(/<button type="button" class="t-tab" id="demo-tab-b" role="tab" aria-selected="true" aria-controls="demo-panel" tabindex="0">Beta<\/button>/);
    expect(out).toContain('data-act="pick" data-v="a"');
  });

  it("builds a radiogroup with aria-checked", () => {
    const out = tabsHtml({ ...spec, kind: "radio" });
    expect(out).toContain('role="radiogroup"');
    expect(out.match(/role="radio"/g)).toHaveLength(3);
    expect(out.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(out).not.toContain("aria-selected");
    expect(out).not.toContain("aria-controls");
  });

  it("builds navigation links: a nav with aria-current only on the current one", () => {
    const out = tabsHtml({
      key: "nav",
      label: "Tipo",
      kind: "nav",
      active: "",
      items: [
        { value: "", label: "Todos", href: "#/lancamentos?mes=2026-11&a=1" },
        { value: "x", label: "X", href: "#/lancamentos?tipo=x" },
      ],
    });
    expect(out).toMatch(/^<nav class="t-tabs"/);
    expect(out).not.toContain("role=");
    expect(out).not.toContain("<button");
    expect(out.match(/aria-current="true"/g)).toHaveLength(1);
    expect(out).toContain('href="#/lancamentos?mes=2026-11&amp;a=1"');
    expect(out).toMatch(/<a class="t-tab" id="nav-tab-" href="[^"]*" aria-current="true">Todos<\/a>/);
  });

  it("adds the fill modifier, extra classes and a tone for the active color", () => {
    const out = tabsHtml({
      ...spec,
      kind: "radio",
      fill: true,
      cls: "full",
      items: [{ value: "a", label: "Despesa", tone: "exp" }, { value: "b", label: "Receita", tone: "inc" }],
    });
    expect(out).toContain('class="t-tabs t-tabs--fill full"');
    expect(out).toContain('data-tone="exp"');
    expect(out).toContain('data-tone="inc"');
  });

  it("escapes the key, the label and the address, but keeps the item label as given (it is HTML)", () => {
    const out = tabsHtml({
      key: 'k"<x>',
      label: 'a "b" & <c>',
      kind: "nav",
      active: "",
      items: [{ value: "v", label: "<b>Texto</b>", href: 'x"y' }],
    });
    expect(out).toContain('data-tabs="k&quot;&lt;x&gt;"');
    expect(out).toContain('aria-label="a &quot;b&quot; &amp; &lt;c&gt;"');
    expect(out).toContain('href="x&quot;y"');
    expect(out).toContain("<b>Texto</b>");
  });
});
