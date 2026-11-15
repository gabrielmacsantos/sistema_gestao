import "server-only";
import { DomainError } from "../errors";
import { otpMail, sendMail } from "../mailer";
import { issueOtp } from "./email-otp";
import { consumeRateLimit } from "./rate-limit";

const HOUR = 60 * 60 * 1000;

/**
 * E-mails a fresh confirmation code. With `quiet`, a code sent a moment ago is not an error (the
 * person just goes back to the code screen), but the hourly cap still applies.
 */
export async function sendVerificationCode(
  user: { id: string; email: string },
  options: { quiet?: boolean } = {},
): Promise<void> {
  await consumeRateLimit(`otp-send:${user.id}`, 5, HOUR);
  let code: string;
  try {
    code = await issueOtp(user.id);
  } catch (error) {
    if (options.quiet && error instanceof DomainError) return;
    throw error;
  }
  await sendMail(otpMail(user.email, code));
}
