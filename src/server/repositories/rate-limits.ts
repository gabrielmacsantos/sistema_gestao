import "server-only";
import { prisma } from "../db";

export function findRateLimit(key: string) {
  return prisma.rateLimit.findUnique({ where: { key } });
}

export function startWindow(key: string, now: Date) {
  return prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, windowStart: now },
    update: { count: 1, windowStart: now },
  });
}

export function bumpRateLimit(key: string) {
  return prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
}
