import type { Locator, Page } from "@playwright/test";
import { expect, isPhone, fitsWidth, openNewTransaction, startLocal, test } from "./support";

// Tabs sliding: every tab, radio and link choice of the site is one `.t-tabs` bar whose indicator glides to the chosen option.

const ACTIVE = '.t-tab[aria-selected="true"], .t-tab[aria-checked="true"], .t-tab[aria-current]';

/** Where the indicator is now, and where the chosen option is. */
const geometry = (bar: Locator) =>
  bar.evaluate((el, active) => {
    const pill = el.querySelector(".t-tabs-pill") as HTMLElement;
    const tab = el.querySelector(active) as HTMLElement;
    return {
      x: Math.round(new DOMMatrixReadOnly(getComputedStyle(pill).transform).m41),
      width: Math.round(pill.getBoundingClientRect().width),
      left: tab.offsetLeft,
      tabWidth: tab.offsetWidth,
      text: tab.textContent?.trim() ?? "",
    };
  }, ACTIVE);

/** Waits for the (250 ms) glide to end: the indicator sits exactly under the chosen option. */
async function expectAligned(bar: Locator, text?: RegExp | string) {
  await expect
    .poll(async () => {
      const g = await geometry(bar);
      return g.x === g.left && g.width === g.tabWidth && g.width > 0;
    })
    .toBe(true);
  if (text) expect((await geometry(bar)).text).toMatch(text);
}

/** Records every CSS transition that starts on an indicator, to tell a glide from a jump. */
const watchGlides = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __glides: string[] };
    w.__glides = [];
    document.addEventListener(
      "transitionrun",
      (e) => { if ((e.target as HTMLElement).classList?.contains("t-tabs-pill")) w.__glides.push(e.propertyName); },
      true,
    );
  });
const glides = (page: Page) => page.evaluate(() => (window as unknown as { __glides: string[] }).__glides);

async function startWithExample(page: Page) {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
  await expect(page.getByRole("heading", { name: "Últimos lançamentos" })).toBeVisible();
}

test("Painel · Últimos lançamentos: the indicator glides and the list filters in place", async ({ page }) => {
  await startWithExample(page);
  await page.evaluate(() => { (window as unknown as { __alive: boolean }).__alive = true; });
  await watchGlides(page);

  const bar = page.getByRole("tablist", { name: "Filtrar extrato" });
  await expect(bar.getByRole("tab")).toHaveCount(4);
  await expect(bar.getByRole("tab", { name: "Todas" })).toHaveAttribute("aria-selected", "true");
  await expect(bar.locator('.t-tab[tabindex="0"]')).toHaveCount(1);
  await expectAligned(bar, /Todas/);

  await bar.getByRole("tab", { name: "Saídas" }).click();
  await expect(bar.getByRole("tab", { name: "Saídas" })).toHaveAttribute("aria-selected", "true");
  await expect(bar.getByRole("tab", { name: "Todas" })).toHaveAttribute("aria-selected", "false");
  await expectAligned(bar, /Saídas/);
  expect(await glides(page)).toContain("transform");
  await expect(page.getByRole("tabpanel", { name: "Saídas" })).toHaveAttribute("aria-labelledby", "recent-filter-tab-despesas"); // named after the chosen tab
  const panel = page.locator("#recent-body");
  expect(await panel.locator("li.income").count()).toBe(0);
  expect(await panel.locator(".ledger li").count()).toBeGreaterThan(0);

  await bar.getByRole("tab", { name: "Entradas" }).click();
  await expectAligned(bar, /Entradas/);
  const rows = panel.locator(".ledger li");
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await panel.locator(".ledger li:not(.income)").count()).toBe(0);

  // Nothing reloaded, and the choice survives a redraw of the whole page (marking a row as paid).
  expect(await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive)).toBe(true);
  await page.getByRole("button", { name: "Ocultar valores" }).click(); // redraws the whole page
  await expect(bar.getByRole("tab", { name: "Entradas" })).toHaveAttribute("aria-selected", "true");
  await expectAligned(bar, /Entradas/);
});

test("Painel · Período do gráfico: Mensal and Semanal", async ({ page }) => {
  await startWithExample(page);
  const bar = page.getByRole("tablist", { name: "Período do gráfico" });
  await expectAligned(bar, /Mensal/);
  await bar.getByRole("tab", { name: "Semanal" }).click();
  await expect(bar.getByRole("tab", { name: "Semanal" })).toHaveAttribute("aria-selected", "true");
  await expectAligned(bar, /Semanal/);
  await expect(page.locator("#flow-chart")).toHaveAttribute("aria-labelledby", "flow-view-tab-week");
  await expect(page.locator("#flow-sub")).toContainText("por semana");
});

test("keyboard: arrows, Home and End move and choose, with the roving tab stop", async ({ page }) => {
  await startWithExample(page);
  const bar = page.getByRole("tablist", { name: "Filtrar extrato" });
  await bar.getByRole("tab", { name: "Todas" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(bar.getByRole("tab", { name: "Entradas" })).toBeFocused();
  await expect(bar.getByRole("tab", { name: "Entradas" })).toHaveAttribute("aria-selected", "true");
  await expect(bar.getByRole("tab", { name: "Entradas" })).toHaveAttribute("tabindex", "0");
  await expect(bar.getByRole("tab", { name: "Todas" })).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("End");
  await expect(bar.getByRole("tab", { name: /Pendentes/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight"); // wraps around
  await expect(bar.getByRole("tab", { name: "Todas" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(bar.getByRole("tab", { name: /Pendentes/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(bar.getByRole("tab", { name: "Todas" })).toHaveAttribute("aria-selected", "true");
  await expectAligned(bar, /Todas/);
});

test("Lançamentos · Tipo (links): aria-current moves and the redrawn page still glides", async ({ page }) => {
  await startWithExample(page);
  await page.goto("/#/lancamentos");
  const bar = page.getByRole("navigation", { name: "Tipo" });
  await expect(bar.getByRole("link")).toHaveCount(3);
  await expect(bar.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "true");
  await expectAligned(bar, /Todos/);
  await watchGlides(page);

  await bar.getByRole("link", { name: "Saídas" }).click();
  await expect(page).toHaveURL(/tipo=despesas/);
  await expect(bar.getByRole("link", { name: "Saídas" })).toHaveAttribute("aria-current", "true");
  await expect(bar.getByRole("link", { name: "Todos" })).not.toHaveAttribute("aria-current", "true");
  await expectAligned(bar, /Saídas/);
  expect(await glides(page)).toContain("transform"); // the page was drawn again, the indicator still glided
  expect(await page.locator("#tx-ledger li.income").count()).toBe(0);

  // Typing in the search repaints the bar: it stays where it was.
  await page.getByPlaceholder("Buscar no extrato…").fill("a");
  await expect(bar.getByRole("link", { name: "Saídas" })).toHaveAttribute("aria-current", "true");
  await expectAligned(bar, /Saídas/);
});

test("Novo gasto · Tipo: Despesa and Receita glide without reopening the dialog", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  await dialog.evaluate((el) => el.setAttribute("data-same", "yes"));
  await watchGlides(page);

  const bar = dialog.getByRole("radiogroup", { name: "Tipo" });
  await expect(bar.getByRole("radio")).toHaveCount(2);
  await expect(bar.getByRole("radio", { name: "Despesa" })).toHaveAttribute("aria-checked", "true");
  await expectAligned(bar, /Despesa/);

  await dialog.getByLabel("Descrição").fill("Mantido");
  await bar.getByRole("radio", { name: "Receita" }).click();
  await expect(bar.getByRole("radio", { name: "Receita" })).toHaveAttribute("aria-checked", "true");
  await expectAligned(bar, /Receita/);
  expect(await glides(page)).toContain("transform");
  await expect(dialog).toHaveAttribute("data-same", "yes");
  await expect(dialog.getByLabel("Descrição")).toHaveValue("Mantido");
  expect(await bar.getByRole("radio", { name: "Receita" }).evaluate((el) => getComputedStyle(el).color)).not.toBe(
    await bar.getByRole("radio", { name: "Despesa" }).evaluate((el) => getComputedStyle(el).color),
  );

  await bar.getByRole("radio", { name: "Receita" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(bar.getByRole("radio", { name: "Despesa" })).toHaveAttribute("aria-checked", "true");
  await expectAligned(bar, /Despesa/);
});

test("Novo fixo · Tipo: changes in place and the category list follows the type", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/fixos");
  await page.getByRole("button", { name: /Novo fixo/ }).click();
  const dialog = page.getByRole("dialog", { name: "Novo gasto fixo" });
  await dialog.evaluate((el) => el.setAttribute("data-same", "yes"));
  await dialog.getByLabel("Descrição").fill("Digitado antes");
  const category = dialog.getByLabel("Categoria");
  const before = await category.locator("option").allTextContents();

  const bar = dialog.getByRole("radiogroup", { name: "Tipo" });
  await expectAligned(bar, /Despesa/);
  await bar.getByRole("radio", { name: "Receita" }).click();
  await expect(bar.getByRole("radio", { name: "Receita" })).toHaveAttribute("aria-checked", "true");
  await expectAligned(bar, /Receita/);
  await expect(dialog).toHaveAttribute("data-same", "yes"); // not drawn again
  await expect(dialog.getByLabel("Descrição")).toHaveValue("Digitado antes");
  expect(await category.locator("option").allTextContents()).not.toEqual(before);
});

test("reduced motion: the indicator jumps, with no transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startWithExample(page);
  await watchGlides(page);
  const bar = page.getByRole("tablist", { name: "Filtrar extrato" });
  expect(await bar.locator(".t-tabs-pill").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  expect(await bar.locator(".t-tab").first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");

  await bar.getByRole("tab", { name: "Saídas" }).click();
  const g = await geometry(bar); // no waiting: it is already there
  expect(g.x).toBe(g.left);
  expect(g.width).toBe(g.tabWidth);
  expect(await glides(page)).toEqual([]);
});

test("narrow screens: the bar scrolls by itself, the page does not, and every option is a 44px target", async ({ page }, testInfo) => {
  await startWithExample(page);
  const bar = page.getByRole("tablist", { name: "Filtrar extrato" });
  if (isPhone(testInfo)) {
    for (const tab of await bar.getByRole("tab").all()) expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  // Squeeze the bar so the last option falls outside: it must scroll horizontally, and the page must not.
  await bar.evaluate((el) => { el.style.maxWidth = "150px"; });
  await expect.poll(() => bar.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await fitsWidth(page)).toBe(true);
  await bar.getByRole("tab", { name: /Pendentes/ }).click();
  await expect.poll(() => bar.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expectAligned(bar, /Pendentes/);
  const inView = await bar.evaluate((el, active) => {
    const tab = el.querySelector(active) as HTMLElement;
    return tab.offsetLeft >= el.scrollLeft - 1 && tab.offsetLeft + tab.offsetWidth <= el.scrollLeft + el.clientWidth + 1;
  }, ACTIVE);
  expect(inView).toBe(true);
  expect(await fitsWidth(page)).toBe(true);
});

test("resizing the screen keeps the indicator under the chosen option", async ({ page }) => {
  await startLocal(page);
  await openNewTransaction(page);
  const dialog = page.getByRole("dialog");
  const bar = dialog.getByRole("radiogroup", { name: "Tipo" });
  await bar.getByRole("radio", { name: "Receita" }).click();
  await expectAligned(bar, /Receita/);
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: Math.max(320, size.width - 90), height: size.height });
  await expectAligned(bar, /Receita/);
  await page.setViewportSize(size);
  await expectAligned(bar, /Receita/);
});
