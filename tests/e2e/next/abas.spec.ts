import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./support/auth";

// Tabs sliding in the Next.js version: the same .t-tabs bar and indicator as the static site.

const ACTIVE = '.t-tab[data-active="true"]';

const aligned = (bar: Locator) =>
  bar.evaluate((el, active) => {
    const pill = el.querySelector(".t-tabs-pill") as HTMLElement;
    const tab = el.querySelector(active) as HTMLElement;
    const x = Math.round(new DOMMatrixReadOnly(getComputedStyle(pill).transform).m41);
    return x === tab.offsetLeft && Math.round(pill.getBoundingClientRect().width) === tab.offsetWidth && tab.offsetWidth > 0;
  }, ACTIVE);

test("the tab controls glide: dashboard filter and period, Lançamentos type, import source and the form type", async ({ page }, testInfo) => {
  await signUpAndConfirm(page, `e2e-tabs-${testInfo.project.name}-${Date.now()}@test.dev`);
  await page.goto("/dashboard");

  // Últimos lançamentos: tablist, one tab in the tab order, the indicator under the chosen tab.
  const filter = page.getByRole("tablist", { name: "Filtrar extrato" });
  await expect(filter.getByRole("tab")).toHaveCount(4);
  await expect.poll(() => aligned(filter)).toBe(true);
  await filter.getByRole("tab", { name: "Saídas" }).click();
  await expect(filter.getByRole("tab", { name: "Saídas" })).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => aligned(filter)).toBe(true);
  await expect(page.getByRole("tabpanel", { name: "Saídas" })).toBeVisible();
  await filter.getByRole("tab", { name: "Saídas" }).press("ArrowRight");
  await expect(filter.getByRole("tab", { name: /Pendentes/ })).toBeFocused();
  await expect(filter.getByRole("tab", { name: /Pendentes/ })).toHaveAttribute("aria-selected", "true");

  // Período do gráfico.
  const period = page.getByRole("tablist", { name: "Período do gráfico" });
  await period.getByRole("tab", { name: "Semanal" }).click();
  await expect.poll(() => aligned(period)).toBe(true);

  // Tipo on Lançamentos is a list of links: aria-current moves and the same bar (not a new one) keeps gliding.
  await page.goto("/lancamentos");
  const type = page.getByRole("navigation", { name: "Tipo" });
  await expect(type.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "true");
  await expect.poll(() => aligned(type)).toBe(true);
  await type.getByRole("link", { name: "Saídas" }).click();
  await expect(page).toHaveURL(/tipo=despesas/);
  await expect(type.getByRole("link", { name: "Saídas" })).toHaveAttribute("aria-current", "true");
  await expect.poll(() => aligned(type)).toBe(true);

  // Import source (tabpanel) and the form type (native radios inside the same bar).
  await page.goto("/importar");
  const source = page.getByRole("tablist", { name: "Origem dos lançamentos" });
  await source.getByRole("tab", { name: "Extrato" }).click();
  await expect(page.getByRole("tabpanel", { name: "Extrato" })).toBeVisible();
  await expect.poll(() => aligned(source)).toBe(true);

  await page.goto("/lancamentos/novo");
  const kind = page.locator(".t-tabs").filter({ has: page.getByText("Receita", { exact: true }) });
  await expect.poll(() => aligned(kind)).toBe(true);
  await page.getByText("Receita", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Receita" })).toBeChecked();
  await expect.poll(() => aligned(kind)).toBe(true);
});
