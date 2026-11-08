import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const TEST_DB = "prisma/test.db";

/** Fresh, migrated test database (never the dev database). */
export default function setup() {
  rmSync(TEST_DB, { force: true });
  rmSync(`${TEST_DB}-journal`, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: `file:./${TEST_DB}` },
  });
}
