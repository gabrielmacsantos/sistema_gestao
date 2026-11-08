import { addMonths, compareMonths } from "./dates";

export type RecurrenceTemplate = {
  id: string;
  startMonth: string;
  endMonth: string | null;
  /** Month the template was created; occurrences are never generated before it. */
  createdMonth: string;
};

/** Months in [from, to], inclusive. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = from; compareMonths(m, to) <= 0; m = addMonths(m, 1)) months.push(m);
  return months;
}

/** Months in which the template is active, clipped to [from, to]. */
export function activeMonths(template: RecurrenceTemplate, from: string, to: string): string[] {
  const start = [template.startMonth, template.createdMonth, from].sort(compareMonths).at(-1)!;
  const end = template.endMonth && compareMonths(template.endMonth, to) < 0 ? template.endMonth : to;
  return compareMonths(start, end) > 0 ? [] : monthsBetween(start, end);
}

/**
 * Occurrences that should exist up to `upTo` but don't yet.
 * `existing` holds "recurringId:period" keys (including SKIPPED tombstones).
 */
export function missingOccurrences(
  templates: RecurrenceTemplate[],
  existing: Set<string>,
  from: string,
  upTo: string,
): Array<{ recurringId: string; period: string }> {
  return templates.flatMap((t) =>
    activeMonths(t, from, upTo)
      .filter((period) => !existing.has(`${t.id}:${period}`))
      .map((period) => ({ recurringId: t.id, period })),
  );
}
