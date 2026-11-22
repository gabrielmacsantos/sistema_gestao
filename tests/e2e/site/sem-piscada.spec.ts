import { expect, startLocal, test } from "./support";
// Leaving the sample to open a form must not blink the screen behind: the backdrop stays up from dialog to form.
for (const [route, open, name] of [["/#/fixos", 'main [data-act="new-rec"]', "fixo"], ["/#/lancamentos", 'main [data-act="new-tx"]', "gasto"]]) {
  test("no blink " + name, async ({ page }) => {
    await startLocal(page);
    await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
    await page.goto(route);
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const w = window as any; w.__o = []; const t0 = performance.now();
      const tick = () => { const o = document.querySelector("#layer .overlay"); w.__o.push([Math.round(performance.now() - t0), o ? Number(getComputedStyle(o).opacity) : -1]); if (performance.now() - t0 < 3000) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.locator(open).first().click();
    await page.getByRole("button", { name: /Sair do exemplo e continuar/ }).click();
    await page.waitForTimeout(2500);
    const f: [number, number][] = await page.evaluate(() => (window as any).__o);
    // Once the first dialog is up, the backdrop never drops again until the end.
    const firstUp = f.findIndex(([, o]) => o >= 0.99);
    expect(firstUp).toBeGreaterThan(-1);
    const dips = f.slice(firstUp).filter(([, o]) => o < 0.99);
    expect(dips, "backdrop dips").toEqual([]);
    await expect(page.getByRole("dialog", { name: /Novo gasto fixo|Novo gasto|Nova entrada/ })).toBeVisible();
  });
}
