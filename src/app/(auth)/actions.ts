"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/server/actions";
import { signUp, verifyCredentials } from "@/server/services/auth";
import { getSession } from "@/server/session";
import {
  formDataToObject,
  loginSchema,
  signupSchema,
  toActionError,
  type ActionState,
} from "@/lib/validation";

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toActionError(parsed.error);

  const result = await runAction(async () => {
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    const session = await getSession();
    session.userId = user.id;
    await session.save();
  });
  if (!result.ok) return result;
  redirect("/dashboard");
}

export async function signupAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toActionError(parsed.error);

  const result = await runAction(async () => {
    const user = await signUp(parsed.data);
    const session = await getSession();
    session.userId = user.id;
    await session.save();
  });
  if (!result.ok) return result;
  redirect("/dashboard");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
