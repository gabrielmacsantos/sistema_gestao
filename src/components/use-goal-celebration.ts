import { useEffect, type RefObject } from "react";
import { burstConfetti } from "@/lib/confetti";
import { celebratedStorageKey, parseCelebrated, serializeCelebrated } from "@/lib/goal-celebration";
import type { ActionState } from "@/lib/validation";

/**
 * Fires the confetti once when a goal form's action says the goal was just completed (state.celebrate, decided on the
 * server in whole cents). The mark of already celebrated goals stays on this device, one list per user. Leaving the
 * screen stops the burst and removes its canvas.
 */
export function useGoalCelebration(state: ActionState, userId: string, anchor: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const goalId = state.celebrate?.goalId;
    if (!goalId) return;
    const key = celebratedStorageKey(userId);
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      // Private mode: no mark is kept, and the server only reports the real moment of completion anyway.
    }
    const celebrated = parseCelebrated(raw);
    if (celebrated.includes(goalId)) return;
    try {
      localStorage.setItem(key, serializeCelebrated([...celebrated, goalId]));
    } catch {
      // Same as above.
    }
    const box = anchor.current?.getBoundingClientRect();
    return burstConfetti(box ? { x: box.left + box.width / 2, y: box.top + Math.min(box.height / 2, 60) } : {});
  }, [state, userId, anchor]);
}
