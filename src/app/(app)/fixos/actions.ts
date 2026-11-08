"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/server/auth";
import { runAction } from "@/server/actions";
import { endRecurring, removeRecurring, saveRecurring } from "@/server/services/recurring";
import { formDataToObject, recurringSchema, toActionError, type ActionState } from "@/lib/validation";

export async function saveRecurringAction(
  id: string | undefined,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const values = formDataToObject(formData);
  const parsed = recurringSchema.safeParse(values);
  if (!parsed.success) return toActionError(parsed.error, values);

  const result = await runAction(() => saveRecurring(userId, parsed.data, id));
  if (!result.ok) return { ...result, values };
  redirect("/fixos");
}

export async function endRecurringAction(id: string) {
  const userId = await requireUserId();
  return runAction(() => endRecurring(userId, id));
}

export async function deleteRecurringAction(id: string) {
  const userId = await requireUserId();
  const result = await runAction(() => removeRecurring(userId, id));
  if (!result.ok) return result;
  redirect("/fixos");
}
