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
  ...(EVIDENCE_DIR && {
    outputDir: `${EVIDENCE_DIR}/artifacts`,
    reporter: [
      ["list"],
      ["json", { outputFile: `${EVIDENCE_DIR}/results.json` }],
      ["html", { outputFolder: `${EVIDENCE_DIR}/report`, open: "never" }],
    ],
  }),
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...(EVIDENCE_DIR && { screenshot: "on", video: "retain-on-failure" }),
  },
  projects: [
    { name: "site-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "site-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node scripts/serve-site.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
