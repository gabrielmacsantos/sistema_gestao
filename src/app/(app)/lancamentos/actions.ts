"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/server/auth";
import { runAction } from "@/server/actions";
import {
  removeTransaction,
  saveTransaction,
  setTransactionStatus,
} from "@/server/services/transactions";
import { monthOf } from "@/lib/dates";
import {
  formDataToObject,
  toActionError,
  transactionSchema,
  type ActionState,
} from "@/lib/validation";

export async function saveTransactionAction(
  id: string | undefined,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const values = formDataToObject(formData);
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) return toActionError(parsed.error, values);

  const result = await runAction(() => saveTransaction(userId, parsed.data, id).then(() => {}));
  if (!result.ok) return { ...result, values };
  redirect(`/lancamentos?mes=${monthOf(parsed.data.date)}`);
}

export async function setStatusAction(id: string, status: "PAID" | "PENDING") {
  const userId = await requireUserId();
  await runAction(() => setTransactionStatus(userId, id, status));
}

export async function deleteTransactionAction(id: string) {
  const userId = await requireUserId();
  const result = await runAction(() => removeTransaction(userId, id));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect("/lancamentos");
}
