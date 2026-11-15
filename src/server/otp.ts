import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_LENGTH = 6;

/** Six random digits from the OS CSPRNG, zero-padded ("004217"). */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres no .env");
  return value;
}

/** HMAC of the code, bound to the user so a code never validates for someone else. */
export function hashOtp(code: string, userId: string): string {
  return createHmac("sha256", secret()).update(`otp:${userId}:${code}`).digest("hex");
}

export function otpMatches(code: string, userId: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashOtp(code, userId), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
