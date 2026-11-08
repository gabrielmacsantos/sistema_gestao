"use client";

import { Moon, Sun } from "lucide-react";

/** Flips light/dark and remembers the choice; the root layout script applies it before paint. */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema claro/escuro"
      className="flex size-9 items-center justify-center rounded-lg border border-hairline text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface"
    >
      <Moon className="size-[18px] dark:hidden" aria-hidden />
      <Sun className="hidden size-[18px] dark:block" aria-hidden />
    </button>
  );
}
