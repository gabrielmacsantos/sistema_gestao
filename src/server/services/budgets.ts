import "server-only";
import type { GoalInput } from "@/lib/validation";
import * as repo from "../repositories/budgets";
import { DomainError } from "../errors";
import { assertCategory } from "./categories";

export async function setBudget(userId: string, categoryId: string, amountCents: number) {
  const id = await assertCategory(userId, categoryId, "EXPENSE");
  await repo.upsertBudget(userId, id!, amountCents);
}

export async function removeBudget(userId: string, id: string) {
  const { count } = await repo.deleteBudget(userId, id);
  if (!count) throw new DomainError("Orçamento não encontrado.");
}

export function listGoals(userId: string) {
  return repo.listGoals(userId);
}

export async function saveGoal(userId: string, input: GoalInput, id?: string) {
  if (!id) {
    await repo.createGoal(userId, input);
    return;
  }
  const { count } = await repo.updateGoal(userId, id, input);
  if (!count) throw new DomainError("Meta não encontrada.");
}

export async function removeGoal(userId: string, id: string) {
  const { count } = await repo.deleteGoal(userId, id);
  if (!count) throw new DomainError("Meta não encontrada.");
}

export async function depositToGoal(userId: string, id: string, cents: number) {
  const { count } = await repo.addGoalSavings(userId, id, cents);
  if (!count) throw new DomainError("Meta não encontrada.");
}
