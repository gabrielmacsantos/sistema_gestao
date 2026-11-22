import { expect, test } from "./support";

// The tab icon is the Nexus symbol (embedded, so it also works in the app and offline), on the site and on the legal pages.
for (const path of ["/", "/privacidade.html", "/termos.html"]) {
  test(`${path}: the tab icon is the Nexus logo, as real images`, async ({ page }) => {
    await page.goto(path);
    const icons = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((els) =>
      Promise.all(els.map((el) => new Promise<{ rel: string; sizes: string; w: number; h: number; png: boolean }>((resolve) => {
        const link = el as HTMLLinkElement, img = new Image();
        img.onload = () => resolve({ rel: link.rel, sizes: link.sizes.value, w: img.naturalWidth, h: img.naturalHeight, png: link.href.startsWith("data:image/png") });
        img.onerror = () => resolve({ rel: link.rel, sizes: link.sizes.value, w: 0, h: 0, png: false });
        img.src = link.href;
      }))));
    expect(icons.length).toBeGreaterThanOrEqual(3);
    expect(icons.every((i) => i.png && i.w > 0), "every icon is a PNG that decodes").toBe(true);
    expect(icons.find((i) => i.rel === "icon" && i.sizes === "32x32")).toMatchObject({ w: 32, h: 32 });
    expect(icons.find((i) => i.rel === "icon" && i.sizes === "192x192")).toMatchObject({ w: 192, h: 192 });
    expect(icons.find((i) => i.rel === "apple-touch-icon")).toMatchObject({ w: 180, h: 180 });
    // The old wallet drawing is gone.
    expect(await page.locator('link[rel="icon"][href^="data:image/svg"]').count()).toBe(0);
  });
}
