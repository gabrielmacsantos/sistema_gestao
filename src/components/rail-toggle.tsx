"use client";

import { ChevronLeft } from "lucide-react";
import { useSyncExternalStore } from "react";
import { RAIL_STORAGE_KEY, railToggleLabel, serializeRailCollapsed } from "@/lib/rail-state";

// Collapses the left rail to its icon dock: <html data-rail="collapsed"> drives the layout (globals.css).
// The root layout script applies the saved choice before paint, so the rail never flashes on load.
const EVENT = "rail-change";

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  return () => window.removeEventListener(EVENT, notify);
}
const snapshot = () => document.documentElement.dataset.rail === "collapsed";

export function RailToggle() {
  const collapsed = useSyncExternalStore(subscribe, snapshot, () => false);

  function toggle() {
    const next = !snapshot();
    if (next) document.documentElement.dataset.rail = "collapsed";
    else delete document.documentElement.dataset.rail;
    try {
      localStorage.setItem(RAIL_STORAGE_KEY, serializeRailCollapsed(next));
    } catch {
      // Private mode: the choice just isn't remembered.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  const label = railToggleLabel(collapsed);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls="app-rail"
      title={label}
      // 44x44px touch target straddling the rail's right border; the visible disc is 28px.
      className="group rail-toggle fixed top-[18px] z-40 hidden size-11 items-center justify-center lg:flex"
    >
      <span className="flex size-7 items-center justify-center rounded-full border border-hairline bg-surface-container-lowest text-secondary shadow-sm transition-colors group-hover:text-on-surface group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <ChevronLeft className="rail-chevron size-4" aria-hidden />
      </span>
    </button>
  );
}
