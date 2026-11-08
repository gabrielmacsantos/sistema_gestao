import "server-only";
import { addMonths, currentMonth, monthOf, occurrenceDate } from "@/lib/dates";
import { activeMonths, missingOccurrences, type RecurrenceTemplate } from "@/lib/recurrence";
import type { RecurringInput } from "@/lib/validation";
import * as repo from "../repositories/recurrings";
import { createTransaction, listOccurrences } from "../repositories/transactions";
import { DomainError, isUniqueViolation } from "../errors";
import { assertCategory } from "./categories";

// Bounds the catch-up after long periods without opening the app.
const MAX_LOOKBACK_MONTHS = 24;

function toTemplate(r: { id: string; startMonth: string; endMonth: string | null; createdAt: Date }) {
  return {
    id: r.id,
    startMonth: r.startMonth,
    endMonth: r.endMonth,
    createdMonth: monthOf(r.createdAt),
  } satisfies RecurrenceTemplate;
}

/**
 * Materializes recurring occurrences as PENDING transactions up to `upTo` (default: current month).
 * Future months are never materialized, so editing a template only affects what is still to come.
 */
export async function ensureOccurrences(userId: string, upTo: string = currentMonth()) {
  const from = addMonths(upTo, -MAX_LOOKBACK_MONTHS);
  const recurrings = await repo.listActiveRecurrings(userId, from, upTo);
  if (!recurrings.length) return;

  const templates = recurrings.map(toTemplate);
  const periods = [...new Set(templates.flatMap((t) => activeMonths(t, from, upTo)))];
  const existing = await listOccurrences(userId, templates.map((t) => t.id), periods);
  const existingKeys = new Set(existing.map((o) => `${o.recurringId}:${o.period}`));

  const byId = new Map(recurrings.map((r) => [r.id, r]));
  for (const { recurringId, period } of missingOccurrences(templates, existingKeys, from, upTo)) {
    const r = byId.get(recurringId)!;
    try {
      await createTransaction(userId, {
        type: r.type,
        description: r.description,
        amountCents: r.amountCents,
        date: occurrenceDate(period, r.dayOfMonth),
        status: "PENDING",
        source: "RECURRING",
        categoryId: r.categoryId,
        paymentMethod: r.paymentMethod,
        recurringId: r.id,
        period,
      });
    } catch (error) {
      // A concurrent request already created it.
      if (!isUniqueViolation(error)) throw error;
    }
  }
}

/** Virtual (not persisted) occurrences for a future month, used for forecasts. */
export async function projectedOccurrences(userId: string, month: string) {
  if (month <= currentMonth()) return [];
  const recurrings = await repo.listActiveRecurrings(userId, month, month);
  return recurrings
    .filter((r) => activeMonths(toTemplate(r), month, month).length > 0)
    .map((r) => ({
      recurringId: r.id,
      type: r.type,
      description: r.description,
      amountCents: r.amountCents,
      categoryId: r.categoryId,
      date: occurrenceDate(month, r.dayOfMonth),
    }));
}

export function listRecurrings(userId: string) {
  return repo.listRecurrings(userId);
}

export async function saveRecurring(userId: string, input: RecurringInput, id?: string) {
  const categoryId = await assertCategory(userId, input.categoryId, input.type);
  const data = { ...input, categoryId };

  if (!id) {
    await repo.createRecurring(userId, data);
    return;
  }
  const { count } = await repo.updateRecurring(userId, id, data);
  if (!count) throw new DomainError("Gasto fixo não encontrado.");
}

/** Stops generating occurrences after the current month; past ones are kept. */
export async function endRecurring(userId: string, id: string) {
  const recurring = await repo.findRecurring(userId, id);
  if (!recurring) throw new DomainError("Gasto fixo não encontrado.");
  const month = currentMonth();
  const endMonth = recurring.startMonth > month ? recurring.startMonth : month;
  await repo.updateRecurring(userId, id, { endMonth });
}

/** Deletes the template; generated transactions stay as regular history. */
export async function removeRecurring(userId: string, id: string) {
  const { count } = await repo.deleteRecurring(userId, id);
  if (!count) throw new DomainError("Gasto fixo não encontrado.");
}
