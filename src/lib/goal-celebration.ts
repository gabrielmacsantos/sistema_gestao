// When a savings goal is celebrated (a one-shot confetti burst). Self-contained, whole cents only: the
// <goal-celebration> block in index.html is a copy (tests/goal-celebration.test.ts loads that block and runs the
// same cases).

/** A goal is complete when what was saved reaches the target. A target of 0 is never reached. */
export function goalReached(savedCents: number, targetCents: number): boolean {
  return Number.isSafeInteger(savedCents) && Number.isSafeInteger(targetCents) && targetCents > 0 && savedCents >= targetCents;
}

/** True only at the moment a change takes a goal from "not yet" to "reached": opening a finished goal never counts. */
export function goalJustReached(beforeCents: number, afterCents: number, targetCents: number): boolean {
  return !goalReached(beforeCents, targetCents) && goalReached(afterCents, targetCents);
}

/** The ids of goals already celebrated (a JSON list in localStorage); anything else reads as none. */
export function parseCelebrated(raw: string | null | undefined): string[] {
  try {
    const ids: unknown = JSON.parse(raw == null ? "[]" : raw);
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string" && id !== ""))] : [];
  } catch {
    return [];
  }
}

export const serializeCelebrated = (ids: string[]) => JSON.stringify([...new Set(ids)]);

/** One list per account, kept on this device only (outside the database and any sync). */
export const celebratedStorageKey = (userId: string) => `goals-celebrated:${userId}`;

/**
 * Whether a change celebrates, and the new list of celebrated ids. It celebrates once: when the goal has just been
 * reached and was not celebrated yet. Falling back under the target clears the mark, so a new completion celebrates again.
 */
export function celebrationDecision(input: {
  goalId: string;
  beforeCents: number;
  afterCents: number;
  targetCents: number;
  celebrated: string[];
}): { celebrate: boolean; celebrated: string[] } {
  const { goalId, beforeCents, afterCents, targetCents, celebrated } = input;
  const others = celebrated.filter((id) => id !== goalId);
  if (!goalReached(afterCents, targetCents)) return { celebrate: false, celebrated: others };
  const wasMarked = celebrated.includes(goalId);
  const celebrate = goalJustReached(beforeCents, afterCents, targetCents) && !wasMarked;
  return { celebrate, celebrated: celebrate || wasMarked ? [...others, goalId] : celebrated };
}
