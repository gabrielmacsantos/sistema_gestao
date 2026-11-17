"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth";
import { runAction } from "@/server/actions";
import { depositToGoal, removeBudget, removeGoal, saveGoal, setBudget } from "@/server/services/budgets";
import {
  budgetSchema,
  formDataToObject,
  goalSchema,
  moneySchema,
  toActionError,
  type ActionState,
} from "@/lib/validation";

export async function setBudgetAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const values = formDataToObject(formData);
  const parsed = budgetSchema.safeParse(values);
  if (!parsed.success) return toActionError(parsed.error, values);
  return runAction(
    () => setBudget(userId, parsed.data.categoryId, parsed.data.amountCents),
    "Orçamento salvo.",
  );
}

export async function deleteBudgetAction(id: string) {
  const userId = await requireUserId();
  return runAction(() => removeBudget(userId, id));
}

export async function createGoalAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const values = formDataToObject(formData);
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) return toActionError(parsed.error, values);
  return runAction(async () => {
    const { goalId, reached } = await saveGoal(userId, parsed.data);
    return reached
      ? { ok: true, message: "Meta criada e já concluída! Parabéns!", celebrate: { goalId } }
      : { ok: true, message: "Meta criada." };
  });
}

const depositSchema = z.object({ amountCents: moneySchema });

export async function depositGoalAction(
  id: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = depositSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toActionError(parsed.error);
  return runAction(async () => {
    const { reached } = await depositToGoal(userId, id, parsed.data.amountCents);
    return reached
      ? { ok: true, message: "Meta concluída! Parabéns!", celebrate: { goalId: id } }
      : { ok: true, message: "Valor guardado!" };
  });
}

export async function deleteGoalAction(id: string) {
  const userId = await requireUserId();
  return runAction(() => removeGoal(userId, id));
}
