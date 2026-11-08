import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

// The deployed app runs on Turso (libSQL). This exercises the same path on a local file:
// migrations applied by scripts/db-deploy.mjs and queries through the libSQL adapter.
const FILE = "prisma/libsql-test.db";
const URL = `file:./${FILE}`;

rmSync(FILE, { force: true });
execSync("node scripts/db-deploy.mjs", {
  stdio: "ignore",
  env: { ...process.env, DATABASE_URL: URL, DB_DEPLOY_DRIVER: "libsql" },
});
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: URL }) });

// The file is recreated on the next run (Windows keeps it locked until the process exits).
afterAll(() => prisma.$disconnect());

describe("libSQL (Turso) deployment path", () => {
  it("applies every migration once and round-trips dates, money and uploads", async () => {
    execSync("node scripts/db-deploy.mjs", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: URL, DB_DEPLOY_DRIVER: "libsql" },
    });

    const user = await prisma.user.create({ data: { name: "Turso", email: "turso@test.dev", passwordHash: "x" } });
    const date = new Date("2026-11-05T03:00:00.000Z");
    await prisma.transaction.create({
      data: { userId: user.id, type: "EXPENSE", description: "Aluguel", amountCents: 240000, date },
    });
    await prisma.upload.create({
      data: { id: `${user.id}/a.jpg`, userId: user.id, mediaType: "image/jpeg", data: new Uint8Array([1, 2, 3]) },
    });

    const [tx] = await prisma.transaction.findMany({ where: { userId: user.id, date: { gte: date } } });
    expect(tx.amountCents).toBe(240000);
    expect(tx.date.toISOString()).toBe(date.toISOString());
    const upload = await prisma.upload.findFirst({ where: { userId: user.id } });
    expect([...(upload?.data ?? [])]).toEqual([1, 2, 3]);
  });
});
