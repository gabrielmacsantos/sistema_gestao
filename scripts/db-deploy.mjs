// Applies pending migrations from prisma/migrations.
// - Local SQLite file: delegates to `prisma migrate deploy`.
// - Turso (libsql://...): `prisma migrate` cannot talk to libSQL, so each migration.sql is
//   applied with @libsql/client and recorded in the _libsql_migrations table.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "";
// DB_DEPLOY_DRIVER=libsql forces the libSQL path on a local file (used by tests/libsql.test.ts).
const isRemote = /^(libsql|https?|wss?):\/\//.test(url) || process.env.DB_DEPLOY_DRIVER === "libsql";

if (!isRemote) {
  const result = spawnSync("npx prisma migrate deploy", { stdio: "inherit", shell: true });
  process.exit(result.status ?? 1);
}

const { createClient } = await import("@libsql/client");
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

await client.execute(
  "CREATE TABLE IF NOT EXISTS _libsql_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);
const applied = new Set(
  (await client.execute("SELECT name FROM _libsql_migrations")).rows.map((r) => String(r.name)),
);

const dir = path.join("prisma", "migrations");
const pending = readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !applied.has(e.name))
  .map((e) => e.name)
  .sort();

for (const name of pending) {
  const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
  console.log(`[db-deploy] applying ${name}`);
  await client.executeMultiple(sql);
  await client.execute({
    sql: "INSERT INTO _libsql_migrations (name, applied_at) VALUES (?, ?)",
    args: [name, new Date().toISOString()],
  });
}

console.log(pending.length ? `[db-deploy] ${pending.length} migration(s) applied` : "[db-deploy] database is up to date");
client.close();
