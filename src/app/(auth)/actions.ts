"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runAction } from "@/server/actions";
import { signUp, verifyCredentials } from "@/server/services/auth";
import { consumeRateLimit } from "@/server/services/rate-limit";
import { sendVerificationCode } from "@/server/services/verification";
import { getSession, savePendingVerification } from "@/server/session";
import {
  formDataToObject,
  loginSchema,
  signupSchema,
  toActionError,
  type ActionState,
} from "@/lib/validation";

const QUARTER_HOUR = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Values to refill after a failed submit; the password is never sent back. */
function refill(formData: FormData): Record<string, string> {
  const { name, email } = formDataToObject(formData);
  return { ...(name ? { name } : {}), email: email ?? "" };
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toActionError(parsed.error, refill(formData));

  let needsCode = false;
  const result = await runAction(async () => {
    await consumeRateLimit(`login:ip:${await clientIp()}`, 30, QUARTER_HOUR);
    await consumeRateLimit(`login:email:${parsed.data.email}`, 10, QUARTER_HOUR);
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user.emailVerifiedAt) {
      // Right password but the e-mail was never confirmed: send a code instead of opening the session.
      await sendVerificationCode(user, { quiet: true });
      await savePendingVerification(user.id);
      needsCode = true;
      return;
    }
    const session = await getSession();
    session.userId = user.id;
    await session.save();
  });
  if (!result.ok) return { ...result, values: refill(formData) };
  redirect(needsCode ? "/verificar" : "/dashboard");
}

export async function signupAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toActionError(parsed.error, refill(formData));

  const result = await runAction(async () => {
    await consumeRateLimit(`signup:ip:${await clientIp()}`, 10, HOUR);
    const user = await signUp(parsed.data);
    await sendVerificationCode(user);
    await savePendingVerification(user.id);
  });
  if (!result.ok) return { ...result, values: refill(formData) };
  redirect("/verificar");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
