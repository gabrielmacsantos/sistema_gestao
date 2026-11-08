import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The real package throws outside React Server Components.
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    environment: "node",
    globalSetup: ["./tests/support/global-setup.ts"],
    // Integration tests share one SQLite file.
    fileParallelism: false,
    env: {
      DATABASE_URL: "file:./prisma/test.db",
      SESSION_SECRET: "test-secret-test-secret-test-secret-123",
    },
  },
});
