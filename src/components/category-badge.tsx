/** Category chip: pill with the category's color as a dot. */
export function CategoryBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-secondary">
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}
