import "server-only";
import { DomainError } from "../errors";
import { generateOtp, hashOtp, otpMatches } from "../otp";
import {
  countOtpAttempt,
  deleteOtps,
  findLatestOtp,
  markEmailVerified,
  replaceOtp,
} from "../repositories/email-otps";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/** Creates a fresh code for the user and returns it so the caller can e-mail it (never log it). */
export async function issueOtp(userId: string, now = new Date()): Promise<string> {
  const latest = await findLatestOtp(userId);
  if (latest && now.getTime() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new DomainError("Aguarde um minuto antes de pedir um novo código.");
  }
  const code = generateOtp();
  await replaceOtp(userId, {
    codeHash: hashOtp(code, userId),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    createdAt: now,
  });
  return code;
}

/** Checks the code; a right one confirms the e-mail and is spent, a wrong one counts as an attempt. */
export async function verifyOtp(userId: string, code: string, now = new Date()): Promise<void> {
  const otp = await findLatestOtp(userId);
  if (!otp || otp.expiresAt <= now) throw new DomainError("Código expirado. Peça um novo.");
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await deleteOtps(userId);
    throw new DomainError("Muitas tentativas. Peça um novo código.");
  }
  if (!otpMatches(code, userId, otp.codeHash)) {
    await countOtpAttempt(otp.id, userId);
    throw new DomainError("Código incorreto.");
  }
  await deleteOtps(userId);
  await markEmailVerified(userId);
}
