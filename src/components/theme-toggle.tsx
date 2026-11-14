"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const EVENT = "theme-change";
const subscribe = (notify: () => void) => {
  window.addEventListener(EVENT, notify);
  return () => window.removeEventListener(EVENT, notify);
};
const isDark = () => document.documentElement.dataset.theme === "dark";

/** Flips light/dark and remembers the choice; the root layout script applies it before paint. */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode: the choice just isn't remembered.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Tema escuro"
      aria-pressed={dark}
      title="Alternar tema"
      className="relative flex size-9 items-center justify-center rounded-lg border border-hairline text-secondary transition-colors after:absolute after:-inset-[5px] hover:bg-surface-container-low hover:text-on-surface"
    >
      <Moon className="size-[18px] dark:hidden" aria-hidden />
      <Sun className="hidden size-[18px] dark:block" aria-hidden />
    </button>
  );
}
