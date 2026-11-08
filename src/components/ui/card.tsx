import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tier 1 panel: white plane, 16px radius, hairline border. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-hairline bg-surface-container-lowest p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  children,
  description,
  action,
}: {
  children: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-headline-sm text-on-surface">{children}</h2>
        {description && <p className="mt-0.5 text-body-sm text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-headline-md text-on-surface sm:text-headline-lg">{title}</h1>
        {description && <p className="mt-0.5 text-body-md text-secondary">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-body-md text-secondary">
      {children}
    </p>
  );
}

type Tone = "success" | "warning" | "danger" | "neutral" | "primary";

const badgeTones: Record<Tone, string> = {
  success: "bg-success-container text-success",
  warning: "bg-warning-container text-warning",
  danger: "bg-danger-container text-danger",
  neutral: "bg-surface-container text-secondary",
  primary: "bg-surface-container-high text-primary",
};

/** Pill badge with the 6px status dot. */
export function Badge({ tone = "neutral", dot = true, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm",
        badgeTones[tone],
      )}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Paid / pending badge for a transaction. */
export function StatusBadge({ status, type }: { status: string; type: "EXPENSE" | "INCOME" }) {
  if (status === "PENDING") return <Badge tone="warning">Pendente</Badge>;
  return <Badge tone="success">{type === "INCOME" ? "Recebido" : "Pago"}</Badge>;
}

/** KPI tile: label, icon chip, big figure, delta pill and a thin meter. */
export function MetricCard({
  label,
  icon,
  iconClassName,
  value,
  valueClassName,
  pill,
  meter,
  className,
}: {
  label: string;
  icon: ReactNode;
  iconClassName?: string;
  value: string;
  valueClassName?: string;
  pill?: ReactNode;
  meter?: { ratio: number; className: string };
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-md text-secondary">{label}</span>
        <span
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", iconClassName)}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <div className="mt-3">
        <p
          className={cn(
            "truncate font-display text-headline-md font-bold tracking-tight tabular-nums text-on-surface",
            valueClassName,
          )}
        >
          {value}
        </p>
        {pill && <div className="mt-2 flex">{pill}</div>}
      </div>
      {meter && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high" aria-hidden>
          <div
            className={cn("h-full rounded-full", meter.className)}
            style={{ width: `${Math.max(0, Math.min(meter.ratio, 1)) * 100}%` }}
          />
        </div>
      )}
    </Card>
  );
}

/** Small rounded pill used under metric figures. */
export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}
