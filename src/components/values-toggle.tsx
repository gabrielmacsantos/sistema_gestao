"use client";

import { Eye, EyeOff } from "lucide-react";
import { useSyncExternalStore } from "react";

// "Ocultar valores": <html data-hide-values="1"> hides every [data-money] (globals.css). The root
// layout script applies the saved choice before paint, so amounts never flash on load.
const EVENT = "hide-values-change";

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  return () => window.removeEventListener(EVENT, notify);
}
const snapshot = () => document.documentElement.dataset.hideValues === "1";

/** Whether amounts are hidden; for text the CSS cannot reach, such as aria-label. */
export function useValuesHidden() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export function ValuesToggle() {
  const hidden = useValuesHidden();

  function toggle() {
    const next = !snapshot();
    if (next) document.documentElement.dataset.hideValues = "1";
    else delete document.documentElement.dataset.hideValues;
    try {
      localStorage.setItem("hide-values", next ? "1" : "0");
    } catch {
      // Private mode: the choice just isn't remembered.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label="Ocultar valores"
      title={hidden ? "Mostrar valores" : "Ocultar valores"}
      className="flex size-9 items-center justify-center rounded-lg border border-hairline text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface"
    >
      {hidden ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
    </button>
  );
}
