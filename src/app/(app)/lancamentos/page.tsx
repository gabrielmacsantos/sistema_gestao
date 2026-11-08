import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, CirclePlus, Clock } from "lucide-react";
import { MonthPicker } from "@/components/month-picker";
import { TransactionList } from "@/components/transaction-list";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, MetricCard, PageHeader } from "@/components/ui/card";
import { FormMessage, Select } from "@/components/ui/form";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { listTransactions } from "@/server/repositories/transactions";
import { ensureOccurrences } from "@/server/services/recurring";
import { formatMonthLabel, monthRange } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { monthParam, param, type SearchParams } from "@/lib/search-params";
import { StatusToggle } from "./status-toggle";

export const metadata: Metadata = { title: "Lançamentos" };

const TYPE_FILTERS = { despesas: "EXPENSE", receitas: "INCOME" } as const;

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const month = monthParam(params);
  const tipo = param(params, "tipo");
  const type = tipo === "despesas" || tipo === "receitas" ? TYPE_FILTERS[tipo] : undefined;
  const categoryId = param(params, "categoria");
  const statusParam = param(params, "status");
  const status = statusParam === "pendentes" ? "PENDING" : undefined;
  const imported = param(params, "importados");
  const ignored = Number(param(params, "ignorados") ?? 0);

  await ensureOccurrences(userId);
  const { start, end } = monthRange(month);
  const [transactions, categories] = await Promise.all([
    listTransactions(userId, { start, end, type, categoryId, status }),
    listCategories(userId),
  ]);

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
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center lg:justify-between">
          <MonthPicker month={month} basePath="/lancamentos" params={{ tipo, categoria: categoryId, status: statusParam }} />
          {/* Plain GET form: filters live in the URL. */}
          <form className="grid grid-cols-2 gap-2 sm:flex" action="/lancamentos">
            <input type="hidden" name="mes" value={month} />
            <Select name="tipo" defaultValue={tipo ?? ""} aria-label="Tipo" className="h-9 sm:w-40">
              <option value="">Todos os tipos</option>
              <option value="despesas">Saídas</option>
              <option value="receitas">Entradas</option>
            </Select>
            <Select name="status" defaultValue={statusParam ?? ""} aria-label="Status" className="h-9 sm:w-40">
              <option value="">Todos os status</option>
              <option value="pendentes">Pendentes</option>
            </Select>
            <Select name="categoria" defaultValue={categoryId ?? ""} aria-label="Categoria" className="col-span-2 h-9 sm:w-48">
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "EXPENSE" ? "despesa" : "receita"})
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonClass("secondary", "sm", "col-span-2 sm:col-span-1")}>
              Filtrar
            </button>
          </form>
        </div>

        {transactions.length === 0 ? (
          <div className="p-5">
            <EmptyState>Nenhum lançamento em {formatMonthLabel(month).toLowerCase()}.</EmptyState>
          </div>
        ) : (
          <TransactionList
            rows={transactions}
            leading={(t) => (
              <StatusToggle id={t.id} status={t.status === "PENDING" ? "PENDING" : "PAID"} type={t.type} />
            )}
          />
        )}
      </section>
    </>
  );
}
