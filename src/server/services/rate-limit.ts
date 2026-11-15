import "server-only";
import { DomainError } from "../errors";
import { bumpRateLimit, findRateLimit, startWindow } from "../repositories/rate-limits";

/** Counts one use of `key`; past `max` uses inside the window it refuses with a pt-BR message. */
export async function consumeRateLimit(key: string, max: number, windowMs: number, now = new Date()): Promise<void> {
  const current = await findRateLimit(key);
  if (!current || now.getTime() - current.windowStart.getTime() >= windowMs) {
    await startWindow(key, now);
    return;
  }
  if (current.count >= max) {
    throw new DomainError("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  }
  await bumpRateLimit(key);
}
