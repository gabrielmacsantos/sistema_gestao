import "server-only";
import type { GoalInput } from "@/lib/validation";
import { prisma } from "../db";

export function listBudgets(userId: string) {
  return prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  });
}

/** categoryId must already be verified as belonging to userId. */
export function upsertBudget(userId: string, categoryId: string, amountCents: number) {
  return prisma.budget.upsert({
    where: { categoryId },
    create: { userId, categoryId, amountCents },
    update: { amountCents },
  });
}

export function deleteBudget(userId: string, id: string) {
  return prisma.budget.deleteMany({ where: { id, userId } });
}

export function listGoals(userId: string) {
  return prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export function createGoal(userId: string, data: GoalInput) {
  return prisma.savingsGoal.create({ data: { ...data, userId } });
}

export function updateGoal(userId: string, id: string, data: Partial<GoalInput>) {
  return prisma.savingsGoal.updateMany({ where: { id, userId }, data });
}

export function deleteGoal(userId: string, id: string) {
  return prisma.savingsGoal.deleteMany({ where: { id, userId } });
}

export function addGoalSavings(userId: string, id: string, cents: number) {
  return prisma.savingsGoal.updateMany({
    where: { id, userId },
    data: { savedCents: { increment: cents } },
  });
}
