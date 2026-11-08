import { cn } from "@/lib/utils";

/** Horizontal meter; `ratio` may exceed 1 (over budget). */
export function ProgressBar({ ratio, tone, label }: { ratio: number; tone: "ok" | "warn" | "over"; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
    >
      <div
        className={cn(
          "h-full rounded-full",
          tone === "ok" && "bg-primary",
          tone === "warn" && "bg-warning",
          tone === "over" && "bg-danger",
        )}
        style={{ width: `${Math.min(ratio, 1) * 100}%` }}
      />
    </div>
  );
}
