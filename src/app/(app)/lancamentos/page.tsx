import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, CirclePlus, Clock } from "lucide-react";
import { MonthPicker } from "@/components/month-picker";
import { TransactionList } from "@/components/transaction-list";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, MetricCard, PageHeader } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { ensureOccurrences } from "@/server/services/recurring";
import { searchTransactions } from "@/server/services/transactions";
import { formatMonthLabel, monthRange } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { monthParam, param, type SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { LedgerFilters } from "./ledger-filters";
import { StatusToggle } from "./status-toggle";

export const metadata: Metadata = { title: "Lançamentos" };

const TYPE_FILTERS = { despesas: "EXPENSE", receitas: "INCOME" } as const;
const PAGE = 50;

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const month = monthParam(params);
  const tipo = param(params, "tipo");
  const type = tipo === "despesas" || tipo === "receitas" ? TYPE_FILTERS[tipo] : undefined;
  const categoryId = param(params, "categoria");
  const statusParam = param(params, "status");
  const status = statusParam === "pendentes" ? "PENDING" : undefined;
  const busca = param(params, "busca")?.trim() ?? "";
  const shown = Math.max(PAGE, Math.ceil(Number(param(params, "ver") ?? 0) / PAGE) * PAGE || PAGE);
  const imported = param(params, "importados");
  const ignored = Number(param(params, "ignorados") ?? 0);

  await ensureOccurrences(userId);
  const { start, end } = monthRange(month);
  const [transactions, categories] = await Promise.all([
    searchTransactions(userId, { start, end, type, categoryId, status }, busca),
    listCategories(userId),
  ]);
  const filters = { mes: month, tipo, status: statusParam, categoria: categoryId, busca: busca || undefined };
  const filterHref = (changes: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...changes })) if (value) query.set(key, value);
    return `/lancamentos?${query}`;
  };

  const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  const pending = transactions.filter((t) => t.status === "PENDING").reduce((s, t) => s + t.amountCents, 0);

  return (
    <>
      <PageHeader
        title="Lançamentos"
        description="Despesas e receitas do mês. Toque no círculo para marcar como pago."
        action={
          <>
            <Link href="/lancamentos/novo?tipo=receita" className={buttonClass("income", "sm")}>
              <ArrowDown className="size-[18px]" aria-hidden /> Nova entrada
            </Link>
            <Link href="/lancamentos/novo" className={buttonClass("primary", "sm")}>
              <CirclePlus className="size-[18px]" aria-hidden /> Novo gasto
            </Link>
          </>
        }
      />

      {imported !== undefined && (
        <div className="mb-4">
          <FormMessage
            ok
            message={`${imported} lançamento(s) importado(s)${ignored ? `, ${ignored} já existiam e foram ignorados` : ""}. Lançamentos de outros meses aparecem no mês correspondente.`}
          />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <MetricCard
          label="Entradas"
          icon={<ArrowDown className="size-[18px]" />}
          iconClassName="bg-success-container text-success"
          value={formatBRL(income)}
          valueClassName="text-success"
        />
        <MetricCard
          label="Saídas"
          icon={<ArrowUp className="size-[18px]" />}
          iconClassName="bg-surface-container-high text-primary"
          value={formatBRL(expense)}
        />
        <MetricCard
          label="Pendente"
          icon={<Clock className="size-[18px]" />}
          iconClassName="bg-warning-container text-warning"
          value={formatBRL(pending)}
          valueClassName={pending ? "text-warning" : undefined}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <MonthPicker
            month={month}
            basePath="/lancamentos"
            params={{ tipo, categoria: categoryId, status: statusParam, busca: busca || undefined }}
          />
          <nav aria-label="Tipo" className="flex items-center self-start rounded-lg border border-hairline bg-surface p-1 text-label-md">
            {(
              [
                [undefined, "Todos"],
                ["receitas", "Entradas"],
                ["despesas", "Saídas"],
              ] as const
            ).map(([value, label]) => (
              <Link
                key={label}
                href={filterHref({ tipo: value })}
                scroll={false}
                aria-current={tipo === value ? "true" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-1.5 after:absolute after:-inset-1",
                  tipo === value ? "bg-surface-container-lowest font-semibold text-primary shadow-xs" : "text-secondary hover:text-on-surface",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-b border-hairline px-4 pb-4">
          <LedgerFilters key={`${month}|${tipo}`} filters={filters} categories={categories} />
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-5">
            {busca || tipo || status || categoryId ? (
              <>
                <EmptyState>
                  {busca ? `Nenhum lançamento encontrado para “${busca}”.` : "Nenhum lançamento com esses filtros."}
                </EmptyState>
                <Link href={`/lancamentos?mes=${month}`} className={buttonClass("secondary", "sm")}>
                  Limpar filtros
                </Link>
              </>
            ) : (
              <EmptyState>Nenhum lançamento em {formatMonthLabel(month).toLowerCase()}.</EmptyState>
            )}
          </div>
        ) : (
          <>
            <TransactionList
              rows={transactions.slice(0, shown)}
              leading={(t) => (
                <StatusToggle id={t.id} status={t.status === "PENDING" ? "PENDING" : "PAID"} type={t.type} />
              )}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline p-4 text-body-sm text-secondary">
              <span>
                Mostrando {Math.min(shown, transactions.length)} de {transactions.length}{" "}
                {transactions.length === 1 ? "lançamento" : "lançamentos"}
              </span>
              {transactions.length > shown && (
                <Link href={filterHref({ ver: String(shown + PAGE) })} scroll={false} className={buttonClass("secondary", "sm")}>
                  Mostrar mais {Math.min(PAGE, transactions.length - shown)}
                </Link>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
