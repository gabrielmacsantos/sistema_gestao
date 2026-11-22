import type { Page } from "@playwright/test";
import { expect, fitsWidth, isDesktop, isPhone, startLocal, test } from "./support";

const SCREENS = ["painel", "lancamentos", "fixos", "orcamentos", "viagens", "categorias", "configuracoes", "backup"];

async function withExample(page: Page) {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
}

test("header and cards show their text whole: nothing truncated, nothing overlapping", async ({ page }) => {
  await withExample(page);
  for (const screen of SCREENS) {
    await page.goto(`/#/${screen}`);
    await expect(page.locator("main h1, main .h-page").first()).toBeVisible();
    // Text that an ellipsis is hiding, in the header and in the metric cards (names the person typed may be long on purpose).
    const cut = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(".topbar *, .grid-kpi *, .grid-3 .metric-value, .page-head h1, .h-card")) {
        const cs = getComputedStyle(el);
        if (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1 && el.textContent?.trim()) out.push(`${el.className}: ${el.textContent.trim().slice(0, 40)}`);
      }
      return out;
    });
    expect(cut, `${screen}: truncated text`).toEqual([]);
    expect(await fitsWidth(page), `${screen}: sideways scroll`).toBe(true);
  }
  // The five summary cards do not sit on top of each other.
  await page.goto("/#/painel");
  const boxes = await page.locator(".grid-kpi > *").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
  expect(boxes.length).toBe(5);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const overlap = Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
    expect(overlap, `cards ${i} and ${j} overlap`).toBe(false);
  }
});

test("phone: the hamburger opens the menu, reaches Configurações, and the bottom bar has the five places", async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), "Phone-only navigation.");
  await withExample(page);
  const bar = page.locator(".bottomnav");
  for (const name of ["Painel", "Lançamentos", "Novo lançamento", "Fixos", "Orçamentos"]) await expect(bar.getByRole("link", { name })).toBeVisible();

  const menu = page.locator('[data-act="menu"]');
  await menu.click();
  const drawer = page.getByRole("dialog", { name: "Menu" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: /Configurações/ }).click();
  await expect(page).toHaveURL(/#\/configuracoes/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await menu.click();
  await expect(drawer).toBeVisible();
  await menu.click(); // the same button closes it
  await expect(page.getByRole("dialog")).toHaveCount(0);

  for (const [name, url] of [["Lançamentos", /#\/lancamentos/], ["Fixos", /#\/fixos/], ["Orçamentos", /#\/orcamentos/], ["Painel", /#\/painel/]] as const) {
    await bar.getByRole("link", { name }).click();
    await expect(page).toHaveURL(url);
  }
});

test("desktop: header, side menu and cards are all in place", async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), "Desktop-only layout.");
  await withExample(page);
  await expect(page.locator(".rail")).toBeVisible();
  await expect(page.locator(".topbar .trail")).toContainText("Painel");
  await expect(page.locator('.topbar [data-act="new-tx"]')).toBeVisible();
  await expect(page.locator(".mob-brand")).toBeHidden();
  await expect(page.locator(".bottomnav")).toBeHidden();
  await expect(page.locator(".grid-kpi > *")).toHaveCount(5);
});

const THEME_VARS = ["--bg-primary", "--bg-card", "--brand-primary", "--brand-secondary", "--text-primary", "--text-secondary"] as const;
const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const rgb = (hex: string) => { const h = hex.trim().replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };

test("both themes define the design tokens with readable contrast", async ({ page }) => {
  await startLocal(page);
  const read = async (theme: "dark" | "light") => {
    await page.evaluate((t) => localStorage.setItem("mf-theme", t), theme);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    return page.evaluate((names) => Object.fromEntries(names.map((n) => [n, getComputedStyle(document.documentElement).getPropertyValue(n).trim()])), [...THEME_VARS]);
  };
  const dark = await read("dark"), light = await read("light");
  for (const v of THEME_VARS) {
    expect(dark[v], `dark ${v}`).toMatch(/^#[0-9a-f]{6}$/i);
    expect(light[v], `light ${v}`).toMatch(/^#[0-9a-f]{6}$/i);
  }
  // The surfaces really change between themes.
  expect(dark["--bg-primary"]).not.toBe(light["--bg-primary"]);
  expect(dark["--bg-card"]).not.toBe(light["--bg-card"]);
  for (const [name, t] of [["dark", dark], ["light", light]] as const) {
    expect(contrast(rgb(t["--text-primary"]), rgb(t["--bg-card"])), `${name}: text on card`).toBeGreaterThanOrEqual(7);
    expect(contrast(rgb(t["--text-secondary"]), rgb(t["--bg-card"])), `${name}: secondary text on card`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(t["--brand-primary"]), rgb(t["--bg-card"])), `${name}: brand on card`).toBeGreaterThanOrEqual(3);
    expect(contrast(rgb(t["--brand-secondary"]), rgb(t["--bg-card"])), `${name}: second brand colour on card`).toBeGreaterThanOrEqual(3);
  }
});

test("the screen really paints with the tokens of each theme", async ({ page }, testInfo) => {
  await withExample(page);
  const paint = () => page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, card: getComputedStyle(document.querySelector(".audit")!).backgroundColor }));
  const settled = async (body: string) => { await expect.poll(async () => { const p = await paint(); return p.body === body && p.card !== "rgba(0, 0, 0, 0)"; }).toBe(true); return paint(); };
  const dark = await settled("rgb(11, 17, 30)"); // the dark tokens, once the 200 ms fade is over
  if (isPhone(testInfo)) {
    await page.locator('[data-act="menu"]').click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Tema claro" }).click();
  } else {
    await page.getByRole("button", { name: "Tema escuro" }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const light = await settled("rgb(248, 250, 252)"); // the light tokens, after the fade
  expect(light.card).not.toBe(dark.card);
  expect(await fitsWidth(page)).toBe(true);
});
