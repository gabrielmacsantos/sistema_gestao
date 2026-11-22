import { expect, startLocal, test } from "./support";

// Touch feedback: no native tap highlight, a scale/opacity press, and keyboard focus kept on :focus-visible.

test("elementos interativos não têm o realce azul nativo do toque", async ({ page }) => {
  await startLocal(page);
  const colors = await page.evaluate(() =>
    ["button", "a", ".icon-btn", ".btn"].flatMap((selector) => {
      const el = document.querySelector(selector);
      return el ? [getComputedStyle(el).getPropertyValue("-webkit-tap-highlight-color")] : [];
    }),
  );
  expect(colors.length).toBeGreaterThan(0);
  // Desktop WebKit neither reports this iOS/Android property in the computed style ("") nor keeps it in the CSSOM: there the CSS source is read.
  const declared = await page.evaluate(() => [...document.querySelectorAll("style")].some((el) => /-webkit-tap-highlight-color:\s*transparent/.test(el.textContent || "")));
  for (const color of colors) {
    if (color === "") expect(declared, "the stylesheet sets the tap highlight to transparent").toBe(true);
    else expect(color).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  }
});

test("pressionar um botão encolhe e volta ao soltar", async ({ page }) => {
  await startLocal(page);
  const button = page.locator(".btn:visible, .icon-btn:visible").first();
  const box = await button.boundingBox();
  if (!box) throw new Error("no visible button");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
  await page.mouse.up();
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transform)).toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
});

test("com movimento reduzido o botão não escala", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startLocal(page);
  const button = page.locator(".btn:visible, .icon-btn:visible").first();
  const box = await button.boundingBox();
  if (!box) throw new Error("no visible button");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  expect(await button.evaluate((el) => getComputedStyle(el).transform)).toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
  await page.mouse.up();
});

test("o anel de foco por teclado continua visível", async ({ page }) => {
  await startLocal(page);
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "none";
    // The rail toggle draws its ring on the inner disc, not on the button itself.
    const ringed = [el, ...el.querySelectorAll<HTMLElement>("*")].find((x) => getComputedStyle(x).outlineStyle !== "none");
    return ringed ? getComputedStyle(ringed).outlineStyle : "none";
  });
  expect(outline).not.toBe("none");
});
