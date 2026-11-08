import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  const client = new PrismaClient({ adapter });
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
