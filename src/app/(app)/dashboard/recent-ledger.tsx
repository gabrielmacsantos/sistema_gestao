"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, CirclePlus } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { SlidingTabs } from "@/components/sliding-tabs";
import { TransactionList } from "@/components/transaction-list";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

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
        <div className="recent-actions flex flex-wrap items-center gap-2">
          <SlidingTabs fill aria-label="Filtrar extrato">
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`recent-tab-${key}`}
                aria-selected={filter === key}
                aria-controls="recent-ledger-panel"
                tabIndex={filter === key ? 0 : -1}
                data-active={filter === key}
                onClick={() => setFilter(key)}
                className="t-tab"
              >
                {Icon && <Icon className="size-3.5" aria-hidden />}
                {label}
                {key === "pendentes" && views.pendentes.count > 0 && ` (${views.pendentes.count})`}
              </button>
            ))}
          </SlidingTabs>
          <span className="hidden sm:block">
            <Link href="/lancamentos/novo" className={buttonClass("primary", "sm")}>
              <CirclePlus className="size-4" aria-hidden /> Lançar gasto
            </Link>
          </span>
        </div>
      </div>

      <div role="tabpanel" id="recent-ledger-panel" aria-labelledby={`recent-tab-${filter}`}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>{views.todas.count === 0 ? FILTERS[0].empty : current.empty}</EmptyState>
          </div>
        ) : (
          <TransactionList rows={rows} />
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline p-4 text-body-sm text-secondary sm:flex-row">
        <span aria-live="polite">{summary}</span>
        <Link href={fullHref(month, filter)} className={buttonClass("secondary", "sm")}>
          Ver extrato completo
        </Link>
      </div>
    </>
  );
}
