import "server-only";
import type { RecurringInput } from "@/lib/validation";
import { prisma } from "../db";

export function listRecurrings(userId: string) {
  return prisma.recurring.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ type: "asc" }, { dayOfMonth: "asc" }],
  });
}

/** Templates active at some point in [fromMonth, toMonth]. */
export function listActiveRecurrings(userId: string, fromMonth: string, toMonth: string) {
  return prisma.recurring.findMany({
    where: {
      userId,
      startMonth: { lte: toMonth },
      OR: [{ endMonth: null }, { endMonth: { gte: fromMonth } }],
    },
  });
}

export function findRecurring(userId: string, id: string) {
  return prisma.recurring.findFirst({ where: { id, userId } });
}

export function createRecurring(userId: string, data: RecurringInput) {
  return prisma.recurring.create({ data: { ...data, userId } });
}

export function updateRecurring(userId: string, id: string, data: Partial<RecurringInput>) {
  return prisma.recurring.updateMany({ where: { id, userId }, data });
}

export function deleteRecurring(userId: string, id: string) {
  return prisma.recurring.deleteMany({ where: { id, userId } });
}
