import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Banknote,
  CalendarSync,
  ChevronRight,
  CircleCheck,
  CirclePlus,
  CircleMinus,
  Landmark,
  Lightbulb,
  Lock,
  Camera,
  PiggyBank,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { MonthPicker } from "@/components/month-picker";
import { TransactionList } from "@/components/transaction-list";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, CardTitle, EmptyState, MetricCard, Pill } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth";
import { listTransactions } from "@/server/repositories/transactions";
import { ensureOccurrences, projectedOccurrences } from "@/server/services/recurring";
import {
  BUDGET_WARNING_RATIO,
  budgetStatus,
  expensesByCategory,
  monthlySeries,
  monthSummary,
} from "@/server/services/reports";
import { percentChange, ratio, splitExpenses } from "@/lib/cashflow";
import { formatDayMonth, formatMonthLabel, monthRange } from "@/lib/dates";
import { formatBRL, formatPercent } from "@/lib/money";
import { monthParam, type SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { CashFlowChart, ChartLegend } from "./cash-flow-chart";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  const month = monthParam(await searchParams);
  await ensureOccurrences(user.id);

  const { start, end } = monthRange(month);
  const [summary, categories, series, budgets, transactions, projected] = await Promise.all([
    monthSummary(user.id, month),
    expensesByCategory(user.id, month),
    monthlySeries(user.id, month, 6),
    budgetStatus(user.id, month),
    listTransactions(user.id, { start, end }),
    projectedOccurrences(user.id, month),
  ]);

  const income = summary.incomePaid + summary.incomePending;
  const expense = summary.expensePaid + summary.expensePending;
  const free = summary.forecast;
  const split = splitExpenses(transactions, projected);
  const previous = series.at(-2);
  const incomeDelta = previous ? percentChange(series.at(-1)?.income ?? 0, previous.income) : null;
  const totalByCategory = categories.reduce((s, c) => s + c.totalCents, 0);
  const alerts = budgets.filter((b) => b.ratio >= BUDGET_WARNING_RATIO);
  const fixed = transactions
    .filter((t) => t.recurringId && t.type === "EXPENSE")
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const pendingCount = transactions.filter((t) => t.status === "PENDING").length;
  const recent = transactions.slice(0, 6);
  const monthLabel = formatMonthLabel(month);

  return (
    <div className="flex flex-col gap-6">
      {/* Title, month and quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-headline-md text-on-surface sm:text-headline-lg">Gestão financeira e despesas</h1>
          <p className="mt-0.5 text-body-md text-secondary">
            Acompanhe seu fluxo de caixa, compromissos fixos e comprovantes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker month={month} basePath="/dashboard" />
          <div className="hidden gap-2 md:flex">
            <Link href="/lancamentos/novo?tipo=receita" className={buttonClass("income", "sm")}>
              <ArrowDown className="size-[18px]" aria-hidden /> Nova entrada
            </Link>
            <Link href="/fixos/novo" className={buttonClass("secondary", "sm")}>
              <CalendarSync className="size-[18px] text-primary" aria-hidden /> Cadastrar fixo
            </Link>
            <Link href="/lancamentos/novo" className={buttonClass("primary", "sm")}>
              <CirclePlus className="size-[18px]" aria-hidden /> Novo gasto
            </Link>
          </div>
        </div>
      </div>

      {/* 1. KPI bento */}
      <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <MetricCard
          label="Entradas no mês"
          icon={<ArrowDown className="size-[18px]" />}
          iconClassName="bg-success-container text-success"
          value={formatBRL(income)}
          valueClassName="text-success"
          pill={
            incomeDelta !== null ? (
              <Pill className="bg-success-container text-success">
                {incomeDelta >= 0 ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
                {incomeDelta >= 0 ? "+" : ""}
                {formatPercent(incomeDelta)} vs. anterior
              </Pill>
            ) : summary.incomePending ? (
              <Pill className="bg-surface-container text-secondary">{formatBRL(summary.incomePending)} a receber</Pill>
            ) : undefined
          }
          meter={{ ratio: income > 0 ? 1 : 0, className: "bg-success" }}
        />
        <MetricCard
          label="Total gasto no mês"
          icon={<Banknote className="size-[18px]" />}
          iconClassName="bg-surface-container-high text-primary"
          value={formatBRL(expense)}
          pill={
            income > 0 ? (
              <Pill className={expense > income ? "bg-danger-container text-danger" : "bg-error-container/60 text-error"}>
                <TrendingUp className="size-3" aria-hidden />
                {formatPercent(ratio(expense, income))} da receita
              </Pill>
            ) : summary.expensePending ? (
              <Pill className="bg-warning-container text-warning">{formatBRL(summary.expensePending)} a pagar</Pill>
            ) : undefined
          }
          meter={{ ratio: ratio(expense, income), className: "bg-primary" }}
        />
        <MetricCard
          label="Fixos comprometidos"
          icon={<Lock className="size-[18px]" />}
          iconClassName="bg-secondary-container text-on-secondary-container"
          value={formatBRL(split.fixedCents)}
          pill={
            split.fixedCount > 0 ? (
              <Pill className="bg-surface-container-high text-primary">
                <CircleCheck className="size-3" aria-hidden />
                {split.fixedPaidCount} de {split.fixedCount} pagos
              </Pill>
            ) : undefined
          }
          meter={{ ratio: ratio(split.fixedPaidCount, split.fixedCount), className: "bg-on-secondary-container" }}
        />
        <MetricCard
          label="Gastos variáveis"
          icon={<ShoppingBag className="size-[18px]" />}
          iconClassName="bg-surface-container-low text-tertiary"
          value={formatBRL(split.variableCents)}
          pill={
            <Pill className="bg-surface-container text-secondary">
              <ArrowLeftRight className="size-3" aria-hidden />
              {split.variableCount} {split.variableCount === 1 ? "lançamento" : "lançamentos"}
            </Pill>
          }
          meter={{ ratio: ratio(split.variableCents, expense), className: "bg-tertiary" }}
        />
        <MetricCard
          label="Saldo livre previsto"
          icon={<PiggyBank className="size-[18px]" />}
          iconClassName="bg-tertiary-fixed text-on-tertiary-fixed"
          value={formatBRL(free)}
          valueClassName={free < 0 ? "text-danger" : "text-tertiary"}
          className="col-span-2 lg:col-span-1"
          pill={
            income > 0 ? (
              <Pill className={free < 0 ? "bg-danger-container text-danger" : "bg-surface-container-low text-tertiary"}>
                <Landmark className="size-3" aria-hidden />
                {formatPercent(ratio(free, income))} livre
              </Pill>
            ) : undefined
          }
          meter={{ ratio: ratio(free, income), className: "bg-tertiary-container" }}
        />
      </section>

      {alerts.length > 0 && (
        <Card className="border-warning/40 bg-warning-container p-4">
          <ul className="flex flex-col gap-1.5 text-body-md text-on-surface">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <AlertTriangle
                  className={cn("mt-0.5 size-4 shrink-0", a.ratio > 1 ? "text-danger" : "text-warning")}
                  aria-hidden
                />
                <span>
                  <strong className="font-semibold">{a.categoryName}</strong>:{" "}
                  {a.ratio > 1
                    ? `orçamento estourado em ${formatBRL(a.spentCents - a.limitCents)}`
                    : `${Math.round(a.ratio * 100)}% do orçamento usado`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Mobile quick actions (the desktop has them in the header) */}
      <Card className="border-primary/20 bg-surface-container-low md:hidden">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <CirclePlus className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-headline-sm text-on-surface">Lançamentos rápidos</h2>
            <p className="text-body-sm text-secondary">Entradas manuais ou leitura de nota e cupom</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/lancamentos/novo?tipo=receita"
            className={buttonClass("secondary", "md", "border-success/40 bg-success-container text-success")}
          >
            <CirclePlus className="size-[18px]" aria-hidden /> Nova entrada
          </Link>
          <Link href="/lancamentos/novo" className={buttonClass("secondary", "md", "bg-secondary-container")}>
            <CircleMinus className="size-[18px]" aria-hidden /> Nova despesa
          </Link>
        </div>
        <Link
          href="/importar"
          className="mt-3 flex flex-col items-center gap-1 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest/60 p-4 text-center transition-colors hover:border-primary"
        >
          <Camera className="size-6 text-primary" aria-hidden />
          <span className="text-label-lg text-on-surface">Anexar comprovante ou foto da nota</span>
          <span className="text-body-sm text-secondary">NFC-e, cupom ou extrato, sempre com revisão</span>
        </Link>
      </Card>

      {/* 2. Cash flow + distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="flex flex-col lg:col-span-8">
          <div className="flex flex-col justify-between gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-headline-sm text-on-surface">Fluxo de caixa mensal</h2>
                <Badge tone="success" dot={false}>
                  <ArrowLeftRight className="size-3" aria-hidden /> Entradas vs. saídas
                </Badge>
              </div>
              <p className="mt-0.5 text-body-sm text-secondary">Receitas contra despesas nos últimos 6 meses.</p>
            </div>
            <ChartLegend />
          </div>

          <div className="my-4 grid grid-cols-1 gap-2 xl:grid-cols-3">
            <FlowStat icon={<ArrowDown className="size-4" />} label="Total entradas" value={`+ ${formatBRL(income)}`} tone="text-success" />
            <FlowStat icon={<ArrowUp className="size-4" />} label="Total saídas" value={formatBRL(expense)} tone="text-on-surface" />
            <FlowStat
              icon={<PiggyBank className="size-4" />}
              label="Saldo líquido"
              value={`${income - expense >= 0 ? "+ " : "− "}${formatBRL(Math.abs(income - expense))}`}
              tone={income - expense >= 0 ? "text-success" : "text-danger"}
              highlight
            />
          </div>

          <CashFlowChart data={series} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4 text-body-md text-secondary">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-4" aria-hidden />
              Taxa de poupança de{" "}
              <strong className="font-semibold text-success">{formatPercent(ratio(Math.max(free, 0), income))}</strong> no mês.
            </span>
            <Link href={`/lancamentos?mes=${month}`} className="flex items-center gap-1 text-label-md font-semibold text-primary">
              Ver lançamentos <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardTitle action={<span className="text-label-sm text-secondary capitalize">{monthLabel.split(" ")[0]}</span>}>
            Distribuição de gastos
          </CardTitle>
          {categories.length === 0 ? (
            <EmptyState>Sem despesas neste mês.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-4">
              {categories.slice(0, 6).map((c) => (
                <li key={c.categoryId ?? "none"} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-body-md">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-on-surface">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="shrink-0 text-secondary tabular-nums">
                      {formatBRL(c.totalCents)} ({Math.round(ratio(c.totalCents, totalByCategory) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${ratio(c.totalCents, totalByCategory) * 100}%`, backgroundColor: c.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {expense > 0 && (
            <div className="mt-6 flex gap-2.5 rounded-xl border border-hairline bg-surface-container-low p-4 text-body-md text-on-surface-variant lg:mt-auto">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p>
                Seus custos fixos representam{" "}
                <strong className="font-semibold text-primary">{formatPercent(ratio(split.fixedCents, expense))}</strong> das
                saídas.{" "}
                {free > 0 ? (
                  <>
                    Você ainda pode gastar até <strong className="font-semibold text-primary">{formatBRL(free)}</strong> sem
                    fechar o mês no negativo.
                  </>
                ) : (
                  <>O mês está previsto para fechar no negativo.</>
                )}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* 3. Fixed costs of the month */}
      {fixed.length > 0 && (
        <section aria-labelledby="fixos-mes">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="fixos-mes" className="flex items-center gap-2 text-headline-sm text-on-surface">
              Gastos fixos do mês
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-sans text-label-sm text-secondary">
                {fixed.length} {fixed.length === 1 ? "item" : "itens"}
              </span>
            </h2>
            <Link href="/fixos" className="flex items-center gap-1 text-label-lg text-primary">
              Ver todos <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="-mx-margin flex snap-x gap-3 overflow-x-auto px-margin pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0 lg:grid-cols-4">
            {fixed.map((t) => (
              <li key={t.id} className="w-40 shrink-0 snap-start md:w-auto">
                <Link
                  href={`/lancamentos/${t.id}`}
                  className="flex h-full flex-col gap-1 rounded-2xl border border-hairline bg-surface-container-lowest p-4 shadow-sm transition-colors hover:bg-surface"
                >
                  <span className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                      <CalendarSync className="size-4" aria-hidden />
                    </span>
                    {t.status === "PENDING" ? <Badge tone="warning">Pendente</Badge> : <Badge tone="success">Pago</Badge>}
                  </span>
                  <span className="truncate text-label-lg text-on-surface">{t.description}</span>
                  <span className="text-body-sm text-secondary">
                    {t.status === "PENDING" ? "Vence" : "Venceu"} {formatDayMonth(t.date)}
                  </span>
                  <span className="mt-1 font-display text-headline-sm font-bold text-on-surface tabular-nums">
                    {formatBRL(t.amountCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Recent ledger */}
      <section className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-4 border-b border-hairline p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-headline-sm text-on-surface">Últimos lançamentos</h2>
            <p className="mt-0.5 text-body-sm text-secondary">Extrato recente de {monthLabel.toLowerCase()}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Filtrar lançamentos" className="flex items-center rounded-lg border border-hairline bg-surface p-1 text-label-md">
              <Link href={`/lancamentos?mes=${month}`} className="rounded-md bg-surface-container-lowest px-2.5 py-1 font-semibold text-primary shadow-xs">
                Todas
              </Link>
              <Link href={`/lancamentos?mes=${month}&tipo=receitas`} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-success hover:bg-surface-container-low">
                <ArrowDown className="size-3.5" aria-hidden /> Entradas
              </Link>
              <Link href={`/lancamentos?mes=${month}&tipo=despesas`} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-secondary hover:text-on-surface">
                <ArrowUp className="size-3.5" aria-hidden /> Saídas
              </Link>
              <Link href={`/lancamentos?mes=${month}&status=pendentes`} className="rounded-md px-2.5 py-1 text-secondary hover:text-on-surface">
                Pendentes{pendingCount > 0 && ` (${pendingCount})`}
              </Link>
            </nav>
            <span className="hidden sm:block">
              <Link href="/lancamentos/novo" className={buttonClass("primary", "sm")}>
                <CirclePlus className="size-4" aria-hidden /> Lançar gasto
              </Link>
            </span>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="p-5">
            <EmptyState>Nenhum lançamento neste mês.</EmptyState>
          </div>
        ) : (
          <TransactionList rows={recent} />
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline p-4 text-body-sm text-secondary sm:flex-row">
          <span>
            Mostrando {recent.length} de {transactions.length} lançamentos de {monthLabel.toLowerCase()}
          </span>
          <Link href={`/lancamentos?mes=${month}`} className={buttonClass("secondary", "sm")}>
            Ver extrato completo
          </Link>
        </div>
      </section>
    </div>
  );
}

function FlowStat({
  icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-hairline p-3",
        highlight ? "bg-surface-container-low" : "bg-surface",
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-label-md whitespace-nowrap text-secondary">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            highlight ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-lowest text-primary",
          )}
          aria-hidden
        >
          {icon}
        </span>
        {label}
      </span>
      <span className={cn("text-numeric-data whitespace-nowrap tabular-nums", tone)}>{value}</span>
    </div>
  );
}
