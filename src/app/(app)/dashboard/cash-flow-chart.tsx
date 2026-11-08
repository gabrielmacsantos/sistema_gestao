import { formatMonthShort } from "@/lib/dates";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

type Point = { month: string; income: number; expense: number };

/**
 * Income vs expenses per month as paired bars in plain HTML (no chart library, no client JS).
 * Each month shows its net result; the last one is highlighted. Legend + sr-only table for a11y.
 */
export function CashFlowChart({ data }: { data: Point[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const height = (v: number) => `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%`;

  return (
    <>
      <div className="relative h-56 w-full" aria-hidden>
        {/* Grid lines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-10 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-(--chart-grid)" />
          ))}
        </div>
        <div className="relative flex h-full items-stretch gap-1 sm:gap-3">
          {data.map((d, i) => {
            const net = d.income - d.expense;
            const current = i === data.length - 1;
            return (
              <div
                key={d.month}
                className={cn("flex flex-1 flex-col items-center rounded-xl px-1 pt-2", current && "bg-surface-container-low")}
                title={`${formatMonthShort(d.month)}: entradas ${formatBRL(d.income)}, saídas ${formatBRL(d.expense)}`}
              >
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t-sm bg-(--chart-income) sm:w-4"
                    style={{ height: height(d.income) }}
                  />
                  <div
                    className="w-3 rounded-t-sm bg-(--chart-expense) sm:w-4"
                    style={{ height: height(d.expense) }}
                  />
                </div>
                <div className="flex h-10 flex-col items-center justify-center text-center">
                  <span className={cn("text-label-sm capitalize", current ? "text-primary" : "text-secondary")}>
                    {formatMonthShort(d.month).split("/")[0]}
                    {current && " (atual)"}
                  </span>
                  <span
                    className={cn(
                      "hidden text-label-sm tabular-nums sm:block",
                      net >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {net >= 0 ? "+" : "−"}
                    {formatBRLCompact(Math.abs(net))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <table className="sr-only">
        <caption>Entradas e saídas por mês</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Entradas</th>
            <th>Saídas</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.month}>
              <td>{formatMonthShort(r.month)}</td>
              <td>{formatBRL(r.income)}</td>
              <td>{formatBRL(r.expense)}</td>
              <td>{formatBRL(r.income - r.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function ChartLegend() {
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
