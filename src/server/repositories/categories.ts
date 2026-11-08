import "server-only";
import type { TransactionType } from "@/generated/prisma/enums";
import type { CategoryInput } from "@/lib/validation";
import { prisma } from "../db";

export function listCategories(userId: string, type?: TransactionType) {
  return prisma.category.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export function findCategory(userId: string, id: string) {
  return prisma.category.findFirst({ where: { id, userId } });
}

export function createCategories(userId: string, data: CategoryInput[]) {
  return prisma.category.createMany({ data: data.map((c) => ({ ...c, userId })) });
}

export function createCategory(userId: string, data: CategoryInput) {
  return prisma.category.create({ data: { ...data, userId } });
}

export function updateCategory(userId: string, id: string, data: CategoryInput) {
  return prisma.category.updateMany({ where: { id, userId }, data });
}

export function deleteCategory(userId: string, id: string) {
  return prisma.category.deleteMany({ where: { id, userId } });
}
