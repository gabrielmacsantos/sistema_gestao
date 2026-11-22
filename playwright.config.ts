import { defineConfig, devices } from "@playwright/test";

// E2E of the online site and the app: the static index.html, the same file GitHub Pages serves and the
// Android app bundles. The Next.js version has its own config (playwright.next.config.ts).
const PORT = 3200;
// Set by scripts/test-evidence.mjs to collect the reports and attachments of one run.
const EVIDENCE_DIR = process.env.EVIDENCE_DIR;

export default defineConfig({
  testDir: "tests/e2e/site",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Always leave a report: `playwright-report/` (open it with `npm run test:e2e:report`), with screenshot, trace and video of what failed.
  reporter: EVIDENCE_DIR
    ? [["list"], ["json", { outputFile: `${EVIDENCE_DIR}/results.json` }], ["html", { outputFolder: `${EVIDENCE_DIR}/report`, open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  ...(EVIDENCE_DIR && { outputDir: `${EVIDENCE_DIR}/artifacts` }),
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: EVIDENCE_DIR ? "on" : "only-on-failure",
    video: "retain-on-failure",
  },
  // Each test gets a brand-new browser context: empty localStorage and IndexedDB, so the local-first start is always the initial one.
  projects: [
    { name: "site-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }, // Chrome
    { name: "site-safari", use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 800 } } }, // WebKit on the desktop
    { name: "site-mobile", use: { ...devices["Pixel 7"] } }, // Android / Capacitor reference (412x915)
    { name: "site-iphone", use: { ...devices["iPhone 14"] } }, // WebKit on the phone (390x844)
  ],
  webServer: {
    command: `node scripts/serve-site.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
