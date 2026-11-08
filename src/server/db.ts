import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

// TURSO_* are the names set by the Turso integration of the Vercel Marketplace.
const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

/** Turso (libSQL over the network) when deployed; a local SQLite file otherwise. */
export const isRemoteDatabase = /^(libsql|https?|wss?):\/\//.test(url);

function createClient() {
  if (isRemoteDatabase) {
    return new PrismaClient({
      adapter: new PrismaLibSql({ url, authToken }),
    });
  }

  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  // WAL lets reads run while a write is in progress and makes commits much cheaper.
  // journal_mode is persisted in the file; synchronous=NORMAL is safe under WAL.
  void client
    .$queryRawUnsafe("PRAGMA journal_mode = WAL")
    .then(() => client.$executeRawUnsafe("PRAGMA synchronous = NORMAL"))
    .catch((error: unknown) => console.error("SQLite pragmas failed", error));
  return client;
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
