import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  // The dev server compiles each route on first visit.
  expect: { timeout: 30_000 },
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Separate database so E2E users never land in the real one.
    command: `npx prisma migrate deploy && npx next dev --port ${PORT}`,
    env: { DATABASE_URL: "file:./prisma/e2e.db" },
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
