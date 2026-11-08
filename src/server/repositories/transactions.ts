import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type {
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from "@/generated/prisma/enums";
import type { DraftItem } from "@/lib/validation";
import { prisma } from "../db";

export type TransactionFilters = {
  start: Date;
  end: Date;
  type?: TransactionType;
  categoryId?: string;
  status?: TransactionStatus;
};

export type TransactionData = {
  type: TransactionType;
  description: string;
  amountCents: number;
  date: Date;
  status: TransactionStatus;
  source: TransactionSource;
  categoryId: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  merchantName?: string | null;
  merchantTaxId?: string | null;
  externalId?: string | null;
  attachment?: string | null;
  recurringId?: string | null;
  period?: string | null;
};

// SKIPPED rows are tombstones for removed recurring occurrences and never shown.
const visible = { status: { not: "SKIPPED" } } satisfies Prisma.TransactionWhereInput;

export function listTransactions(userId: string, filters: TransactionFilters) {
  return prisma.transaction.findMany({
    where: {
      userId,
      ...visible,
      date: { gte: filters.start, lt: filters.end },
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export function findTransaction(userId: string, id: string) {
  return prisma.transaction.findFirst({
    where: { id, userId, ...visible },
    include: { category: true, items: true },
  });
}

export function createTransaction(userId: string, data: TransactionData, items: DraftItem[] = []) {
  return prisma.transaction.create({
    data: {
      ...data,
      userId,
      ...(items.length ? { items: { create: items } } : {}),
    },
  });
}

export function updateTransaction(userId: string, id: string, data: Partial<TransactionData>) {
  return prisma.transaction.updateMany({ where: { id, userId }, data });
}

export function deleteTransaction(userId: string, id: string) {
  return prisma.transaction.deleteMany({ where: { id, userId } });
}

export async function findExistingExternalIds(
  userId: string,
  source: TransactionSource,
  externalIds: string[],
): Promise<Set<string>> {
  if (!externalIds.length) return new Set();
  const rows = await prisma.transaction.findMany({
    where: { userId, source, externalId: { in: externalIds } },
    select: { externalId: true },
  });
  return new Set(rows.map((r) => r.externalId!));
}

export function sumByTypeAndStatus(userId: string, start: Date, end: Date) {
  return prisma.transaction.groupBy({
    by: ["type", "status"],
    where: { userId, ...visible, date: { gte: start, lt: end } },
    _sum: { amountCents: true },
  });
}

export function sumByCategory(userId: string, type: TransactionType, start: Date, end: Date) {
  return prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type, ...visible, date: { gte: start, lt: end } },
    _sum: { amountCents: true },
  });
}

export function listForPeriod(userId: string, start: Date, end: Date) {
  return prisma.transaction.findMany({
    where: { userId, ...visible, date: { gte: start, lt: end } },
    select: { type: true, amountCents: true, date: true },
  });
}

export function listOccurrences(userId: string, recurringIds: string[], periods: string[]) {
  return prisma.transaction.findMany({
    where: { userId, recurringId: { in: recurringIds }, period: { in: periods } },
    select: { recurringId: true, period: true },
  });
}
