// Whether the left rail is collapsed to its icon dock. The choice lives only on this device
// (localStorage), outside backups and sync. Self-contained: the <rail-state> block in index.html is a
// copy (tests/rail-state.test.ts loads that block and runs the same cases).
export const RAIL_STORAGE_KEY = "rail-collapsed";

/** Anything but "1" (missing, empty, garbage) means expanded, the default. */
export function parseRailCollapsed(raw: string | null | undefined): boolean {
  return raw === "1";
}

export const serializeRailCollapsed = (collapsed: boolean) => (collapsed ? "1" : "0");

/** Name of the toggle: what pressing it does next. */
export const railToggleLabel = (collapsed: boolean) => (collapsed ? "Expandir menu" : "Recolher menu");
