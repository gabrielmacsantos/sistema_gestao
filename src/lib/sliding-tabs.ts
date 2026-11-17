// Helpers of the sliding tabs bar (transitions.dev "Tabs sliding"). Self-contained: the <sliding-tabs> block in
// index.html is a copy (tests/sliding-tabs.test.ts loads that block and runs the same cases).

/** Where a horizontally scrolling bar should scroll so the chosen tab is fully visible (unchanged when it already is). */
export function tabScrollLeft({
  scrollLeft,
  clientWidth,
  tabLeft,
  tabWidth,
  margin = 8,
}: {
  scrollLeft: number;
  clientWidth: number;
  tabLeft: number;
  tabWidth: number;
  margin?: number;
}): number {
  if (tabLeft - margin < scrollLeft) return Math.max(0, tabLeft - margin);
  if (tabLeft + tabWidth + margin > scrollLeft + clientWidth) {
    return Math.max(0, tabLeft + tabWidth + margin - clientWidth);
  }
  return scrollLeft;
}

/** The tab an arrow key moves to (wrapping around the ends), or -1 for any other key. */
export function nextTabIndex(key: string, index: number, count: number): number {
  if (count < 1) return -1;
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return -1;
}
