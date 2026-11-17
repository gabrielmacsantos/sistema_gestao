import "server-only";
import { goalJustReached } from "@/lib/goal-celebration";
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

/** `reached`: this change took the goal to its target (whole cents), so the screen can celebrate it once. */
export type GoalChange = { goalId: string; reached: boolean };

export async function saveGoal(userId: string, input: GoalInput, id?: string): Promise<GoalChange> {
  if (!id) {
    const goal = await repo.createGoal(userId, input);
    return { goalId: goal.id, reached: goalJustReached(0, goal.savedCents, goal.targetCents) };
  }
  const before = await repo.findGoal(userId, id);
  if (!before) throw new DomainError("Meta não encontrada.");
  const { count } = await repo.updateGoal(userId, id, input);
  if (!count) throw new DomainError("Meta não encontrada.");
  return { goalId: id, reached: goalJustReached(before.savedCents, input.savedCents, input.targetCents) };
}

export async function removeGoal(userId: string, id: string) {
  const { count } = await repo.deleteGoal(userId, id);
  if (!count) throw new DomainError("Meta não encontrada.");
}

export async function depositToGoal(userId: string, id: string, cents: number): Promise<GoalChange> {
  const before = await repo.findGoal(userId, id);
  if (!before) throw new DomainError("Meta não encontrada.");
  const { count } = await repo.addGoalSavings(userId, id, cents);
  if (!count) throw new DomainError("Meta não encontrada.");
  return { goalId: id, reached: goalJustReached(before.savedCents, before.savedCents + cents, before.targetCents) };
}
