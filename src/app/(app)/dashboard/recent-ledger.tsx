"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, CirclePlus } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { TransactionList } from "@/components/transaction-list";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Rows = ComponentProps<typeof TransactionList>["rows"];
export type RecentFilter = "todas" | "receitas" | "despesas" | "pendentes";
/** The newest entries and how many there are, per filter; prepared by the server. */
export type RecentViews = Record<RecentFilter, { rows: Rows; count: number }>;

const FILTERS: {
  key: RecentFilter;
  label: string;
  icon?: typeof ArrowDown;
  noun: [string, string];
  empty: string;
}[] = [
  {
    key: "todas",
    label: "Todas",
    noun: ["lançamento", "lançamentos"],
    empty: "Nenhum lançamento neste mês.",
  },
  {
    key: "receitas",
    label: "Entradas",
    icon: ArrowDown,
    noun: ["entrada", "entradas"],
    empty: "Nenhuma entrada neste mês.",
  },
  {
    key: "despesas",
    label: "Saídas",
    icon: ArrowUp,
    noun: ["saída", "saídas"],
    empty: "Nenhuma saída neste mês.",
  },
  {
    key: "pendentes",
    label: "Pendentes",
    noun: ["pendente", "pendentes"],
    empty: "Nada pendente neste mês.",
  },
];

const fullHref = (month: string, filter: RecentFilter) =>
  `/lancamentos?mes=${month}${filter === "receitas" || filter === "despesas" ? `&tipo=${filter}` : filter === "pendentes" ? "&status=pendentes" : ""}`;

/** "Últimos lançamentos": the chips switch the list in place, with no trip to the server. */
export function RecentLedger({ views, month, monthName }: { views: RecentViews; month: string; monthName: string }) {
  const [filter, setFilter] = useState<RecentFilter>("todas");
  const current = FILTERS.find((f) => f.key === filter)!;
  const { rows, count } = views[filter];
  const summary = `Mostrando ${rows.length} de ${count} ${count === 1 ? current.noun[0] : current.noun[1]}`;

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-hairline p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-headline-sm text-on-surface">Últimos lançamentos</h2>
          <p className="mt-0.5 text-body-sm text-secondary">Extrato recente de {monthName}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filtrar extrato"
            className="grid w-full grid-cols-2 rounded-lg border border-hairline bg-surface p-1 text-label-md min-[400px]:flex min-[400px]:w-auto"
          >
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "relative flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 whitespace-nowrap after:absolute after:-inset-1",
                  filter === key
                    ? "bg-surface-container-lowest font-semibold text-primary shadow-xs"
                    : "text-secondary hover:text-on-surface",
                )}
              >
                {Icon && <Icon className="size-3.5" aria-hidden />}
                {label}
                {key === "pendentes" && views.pendentes.count > 0 && ` (${views.pendentes.count})`}
              </button>
            ))}
          </div>
          <span className="hidden sm:block">
            <Link href="/lancamentos/novo" className={buttonClass("primary", "sm")}>
              <CirclePlus className="size-4" aria-hidden /> Lançar gasto
            </Link>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState>{views.todas.count === 0 ? FILTERS[0].empty : current.empty}</EmptyState>
        </div>
      ) : (
        <TransactionList rows={rows} />
      )}

      <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline p-4 text-body-sm text-secondary sm:flex-row">
        <span aria-live="polite">{summary}</span>
        <Link href={fullHref(month, filter)} className={buttonClass("secondary", "sm")}>
          Ver extrato completo
        </Link>
      </div>
    </>
  );
}
