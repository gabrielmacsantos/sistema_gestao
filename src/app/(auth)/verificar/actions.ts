"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/server/actions";
import { prisma } from "@/server/db";
import { verifyOtp } from "@/server/services/email-otp";
import { sendVerificationCode } from "@/server/services/verification";
import { clearPendingVerification, getPendingVerification, getSession } from "@/server/session";
import { otpSchema, type ActionState } from "@/lib/validation";

export async function verifyCodeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await getPendingVerification();
  if (!userId) redirect("/login");
  const parsed = otpSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { ok: false, message: "Digite os 6 números do código." };

  const result = await runAction(async () => {
    await verifyOtp(userId, parsed.data);
    const session = await getSession();
    session.userId = userId;
    await session.save();
    await clearPendingVerification();
  });
  if (!result.ok) return result;
  redirect("/dashboard");
}

export async function resendCodeAction(): Promise<ActionState> {
  const userId = await getPendingVerification();
  if (!userId) redirect("/login");
  return runAction(async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) throw new Error("Usuário da verificação não encontrado.");
    await sendVerificationCode(user);
  }, "Enviamos um novo código.");
}
