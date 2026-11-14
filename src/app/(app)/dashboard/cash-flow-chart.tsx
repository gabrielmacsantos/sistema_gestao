"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Badge } from "@/components/ui/card";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

/** One column of the chart, already labeled by the server. Amounts in cents. */
export type FlowPoint = { key: string; label: string; longLabel: string; income: number; expense: number };
type View = "month" | "week";

// The chosen tab is a per-device convenience; memory keeps it working when storage is blocked.
const VIEW_KEY = "mf-flow-view";
const listeners = new Set<() => void>();
let memoryView: View | null = null;

function readView(): View {
  if (memoryView) return memoryView;
  try {
    return localStorage.getItem(VIEW_KEY) === "week" ? "week" : "month";
  } catch {
    return "month";
  }
}

function writeView(view: View) {
  memoryView = view;
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {}
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const signed = (cents: number) => `${cents >= 0 ? "+" : "−"}${formatBRL(Math.abs(cents))}`;

/**
 * "Fluxo de caixa" card body: header with the Mensal/Semanal tabs, the totals passed as children
 * and the chart. Both series come ready from the server, so switching is a local re-render.
 */
export function CashFlowPanel({
  monthly,
  weekly,
  monthName,
  currentWeek,
  children,
}: {
  monthly: FlowPoint[];
  weekly: FlowPoint[];
  /** "novembro", for the weekly subtitle. */
  monthName: string;
  /** Index of today's week when the chosen month is the current one. */
  currentWeek: number | null;
  children: ReactNode;
}) {
  const view = useSyncExternalStore(subscribe, readView, () => "month" as const);
  const weekView = view === "week";

  return (
    <>
      <div className="flex flex-col justify-between gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-headline-sm text-on-surface">Fluxo de caixa</h2>
            <Badge tone="success" dot={false}>
              <ArrowLeftRight className="size-3" aria-hidden /> Entradas vs. saídas
            </Badge>
          </div>
          <p className="mt-0.5 text-body-sm text-secondary">
            {weekView ? `Receitas contra despesas por semana de ${monthName}.` : "Receitas contra despesas nos últimos 6 meses."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ChartLegend />
          <div role="group" aria-label="Período do gráfico" className="flex rounded-lg border border-hairline bg-surface p-1">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => writeView(v)}
                className={cn(
                  "relative min-h-9 rounded-md px-3 text-label-md after:absolute after:-inset-1",
                  view === v ? "bg-surface-container-lowest font-semibold text-primary shadow-sm" : "text-secondary hover:text-on-surface",
                )}
              >
                {v === "month" ? "Mensal" : "Semanal"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {children}

      {/* Keyed by view: each tab starts with its own current column selected. */}
      <CashFlowChart
        key={view}
        data={weekView ? weekly : monthly}
        current={weekView ? currentWeek : monthly.length - 1}
        caption={weekView ? `Entradas e saídas por semana de ${monthName}` : "Entradas e saídas por mês"}
        periodName={weekView ? "Semana" : "Mês"}
      />
    </>
  );
}

/**
 * Income vs expenses as paired bars in plain HTML (no chart library). Each column is a button:
 * tapping it shows its values below the chart, since hover tooltips do not exist on touch screens.
 */
function CashFlowChart({
  data,
  current,
  caption,
  periodName,
}: {
  data: FlowPoint[];
  current: number | null;
  caption: string;
  periodName: string;
}) {
  const [selected, setSelected] = useState(current);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const height = (v: number) => `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%`;
  const point = selected === null ? undefined : data[selected];

  return (
    <>
      <div className="relative h-56 w-full">
        {/* Grid lines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-10 flex flex-col justify-between" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-(--chart-grid)" />
          ))}
        </div>
        <div className="relative flex h-full items-stretch gap-1 sm:gap-3">
          {data.map((d, i) => {
            const net = d.income - d.expense;
            const isCurrent = i === current;
            return (
              <button
                key={d.key}
                type="button"
                aria-pressed={i === selected}
                aria-label={`${d.longLabel}: entradas ${formatBRL(d.income)}, saídas ${formatBRL(d.expense)}`}
                onClick={() => setSelected(i)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 pt-2",
                  i === selected ? "bg-surface-container-low" : "hover:bg-surface-container-low/60",
                )}
              >
                <span className="flex w-full flex-1 items-end justify-center gap-1" aria-hidden>
                  <span className="w-3 rounded-t-[4px] bg-(--chart-income) sm:w-4" style={{ height: height(d.income) }} />
                  <span className="w-3 rounded-t-[4px] bg-(--chart-expense) sm:w-4" style={{ height: height(d.expense) }} />
                </span>
                <span className="flex h-10 flex-col items-center justify-center text-center" aria-hidden>
                  <span className={cn("text-label-sm capitalize", isCurrent ? "text-primary" : "text-secondary")}>
                    {d.label}
                    {isCurrent && " (atual)"}
                  </span>
                  <span className={cn("hidden text-label-sm tabular-nums sm:block", net >= 0 ? "text-success" : "text-danger")}>
                    {net >= 0 ? "+" : "−"}
                    {formatBRLCompact(Math.abs(net))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 min-h-5 text-body-sm text-secondary" aria-live="polite">
        {point ? (
          <>
            <strong className="font-semibold text-on-surface">{point.longLabel}</strong>: entradas{" "}
            <span className="tabular-nums text-on-surface">{formatBRL(point.income)}</span> · saídas{" "}
            <span className="tabular-nums text-on-surface">{formatBRL(point.expense)}</span> · resultado{" "}
            <span className={cn("tabular-nums", point.income - point.expense >= 0 ? "text-success" : "text-danger")}>
              {signed(point.income - point.expense)}
            </span>
          </>
        ) : (
          "Toque numa coluna para ver os valores."
        )}
      </p>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{periodName}</th>
            <th scope="col">Entradas</th>
            <th scope="col">Saídas</th>
            <th scope="col">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.longLabel}</th>
              <td>{formatBRL(r.income)}</td>
              <td>{formatBRL(r.expense)}</td>
              <td>{signed(r.income - r.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-label-sm text-on-surface">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-(--chart-income)" aria-hidden /> Entradas (receitas)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-(--chart-expense)" aria-hidden /> Saídas (despesas)
      </span>
    </div>
  );
}
