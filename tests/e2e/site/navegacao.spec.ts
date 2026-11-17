import { expect, fitsWidth, startLocal, test } from "./support";

const ROUTES = [
  ["painel", "Painel"],
  ["lancamentos", "Lançamentos"],
  ["fixos", "Gastos fixos"],
  ["orcamentos", "Orçamentos"],
  ["viagens", "Viagens"],
  ["categorias", "Categorias"],
  ["importar", "Importar"],
  ["configuracoes", "Configurações"],
  ["backup", "Backup"],
] as const;

test("every screen opens with its title, no errors and no sideways scroll", async ({ page }) => {
  await startLocal(page);
  for (const [path, label] of ROUTES) {
    await page.goto(`/#/${path}`);
    await expect(page).toHaveTitle(`${label} · Minhas Finanças`);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(await fitsWidth(page), `${label} overflows`).toBe(true);
  }
});

test("an unknown address falls back to the Painel", async ({ page }) => {
  await startLocal(page);
  await page.goto("/#/nao-existe");
  await expect(page).toHaveTitle(/Painel · Minhas Finanças/);
});

test("desktop: the side menu lists the sections and collapses to icons", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "site-desktop", "The side menu is a desktop control.");
  await startLocal(page);
  const rail = page.locator("#rail");
  await expect(rail.getByRole("link", { name: "Lançamentos" })).toBeVisible();
  await expect(rail.getByRole("link", { name: "Viagens" })).toBeVisible();
  const width = async () => Math.round((await rail.boundingBox())!.width);
  expect(await width()).toBe(260);

  const toggle = page.getByRole("button", { name: "Recolher menu" });
  const box = (await toggle.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect.poll(width).toBe(80);
  await expect(page.getByRole("button", { name: "Expandir menu" })).toHaveAttribute("aria-expanded", "false");

  await rail.getByRole("link", { name: "Lançamentos" }).click();
  await expect(page).toHaveTitle(/Lançamentos/);
  await page.reload();
  await expect.poll(width).toBe(80);
  await page.getByRole("button", { name: "Expandir menu" }).click();
  await expect.poll(width).toBe(260);
});

test("phone: the bottom bar navigates and the menu button swaps hamburger and close", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "site-mobile", "The bottom bar is a phone control.");
  await startLocal(page);
  const bottom = page.getByRole("navigation", { name: "Principal" }).last();
  await bottom.getByRole("link", { name: "Lançamentos" }).click();
  await expect(page).toHaveTitle(/Lançamentos/);
  await bottom.getByRole("link", { name: "Fixos" }).click();
  await expect(page).toHaveTitle(/Gastos fixos/);

  const menu = page.getByRole("button", { name: "Mais opções" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("link", { name: "Viagens" })).toBeVisible();
  await sheet.getByRole("link", { name: "Viagens" }).click();
  await expect(page).toHaveTitle(/Viagens/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The drawer holds the theme switch, locks the page scroll and closes with Esc.
  await menu.click();
  const drawer = page.getByRole("dialog", { name: "Menu" });
  await expect(drawer.getByRole("button", { name: /Tema (claro|escuro)/ })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(menu).toBeFocused();

  // The header keeps at most three actions and the full brand name.
  const brand = page.locator(".mob-brand .brand-name");
  expect(await brand.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator(".top-actions > [data-act='theme']")).toBeHidden();
});
