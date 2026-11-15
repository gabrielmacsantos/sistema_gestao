"use client";

import { useEffect, type RefObject } from "react";
import type { ActionState } from "@/lib/validation";

const SHAKE_MS = 80 * 2 + 60 * 2 + 20;
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/**
 * Shakes the `.t-input` fields that failed after a Server Action: the ones named in
 * `fieldErrors`, or all of them when the form was refused as a whole (wrong password, wrong code).
 */
export function useErrorShake(form: RefObject<HTMLFormElement | null>, state: ActionState) {
  useEffect(() => {
    if (state.ok !== false || !form.current) return;
    const failed = state.fieldErrors ? Object.keys(state.fieldErrors).filter((name) => state.fieldErrors?.[name]?.length) : [];
    const inputs = [...form.current.querySelectorAll<HTMLElement>(".t-input")].filter(
      (input) => !failed.length || failed.includes(input.getAttribute("name") ?? ""),
    );
    for (const input of inputs) {
      // Replay from a clean baseline.
      input.classList.remove("is-shaking");
      void input.offsetWidth;
      input.classList.add("is-shaking");
      // A newer shake must not be cut short by the timer of an older one.
      clearTimeout(timers.get(input));
      timers.set(input, setTimeout(() => input.classList.remove("is-shaking"), SHAKE_MS));
    }
  }, [state, form]);
}
