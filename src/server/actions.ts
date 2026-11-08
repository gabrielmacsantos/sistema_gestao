import "server-only";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/validation";
import { DomainError } from "./errors";

/**
 * Runs a Server Action body: DomainErrors become a user-facing message, everything else
 * (including redirect()) propagates. Refreshes rendered pages on success.
 */
export async function runAction(
  fn: () => Promise<ActionState | void>,
  successMessage?: string,
): Promise<ActionState> {
  try {
    const result = await fn();
    revalidatePath("/", "layout");
    return result ?? { ok: true, message: successMessage };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.message };
    throw error;
  }
}
