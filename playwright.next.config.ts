import { defineConfig, devices } from "@playwright/test";

// E2E of the full Next.js version (login by e-mail + code, SQLite). It is not part of the final site yet:
// run it with `npm run test:e2e:next` when there is a server to adapt it to. The static site has its own
// config (playwright.config.ts).
const PORT = 3100;
// Set by scripts/test-evidence.mjs to collect the reports and attachments of one run.
const EVIDENCE_DIR = process.env.EVIDENCE_DIR;

export default defineConfig({
  testDir: "tests/e2e/next",
  timeout: 120_000,
  // The dev server compiles each route on first visit.
  expect: { timeout: 30_000 },
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
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Separate database so E2E users never land in the real one.
    command: `npx prisma migrate deploy && npx next dev --port ${PORT}`,
    // A made-up Google client: enough to show "Continuar com o Google" and test everything up to Google.
    env: {
      // The mailer appends each message here instead of the console, so tests can read the code.
      MAIL_OUTBOX: "prisma/e2e-mail.jsonl",
      DATABASE_URL: "file:./prisma/e2e.db",
      GOOGLE_CLIENT_ID: "e2e-client.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "e2e-secret",
      APP_URL: `http://localhost:${PORT}`,
    },
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
