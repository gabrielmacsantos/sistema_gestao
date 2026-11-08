"use server";

import { requireUserId } from "@/server/auth";
import { runAction } from "@/server/actions";
import { removeCategory, saveCategory } from "@/server/services/categories";
import { categorySchema, formDataToObject, toActionError, type ActionState } from "@/lib/validation";

export async function createCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const values = formDataToObject(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return toActionError(parsed.error, values);
  return runAction(() => saveCategory(userId, parsed.data), "Categoria criada.");
}

export async function deleteCategoryAction(id: string) {
  const userId = await requireUserId();
  return runAction(() => removeCategory(userId, id));
}
