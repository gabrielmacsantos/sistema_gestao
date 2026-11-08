import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, Lock, Plus } from "lucide-react";
import { CategoryBadge } from "@/components/category-badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardTitle, EmptyState, MetricCard, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listRecurrings } from "@/server/services/recurring";
import { currentMonth, formatMonthShort } from "@/lib/dates";
import { formatBRL } from "@/lib/money";

export const metadata: Metadata = { title: "Gastos fixos" };

export default async function RecurringPage() {
  const userId = await requireUserId();
  const recurrings = await listRecurrings(userId);
  const month = currentMonth();
  const isActive = (r: (typeof recurrings)[number]) => !r.endMonth || r.endMonth >= month;

  const active = recurrings.filter(isActive);
  const ended = recurrings.filter((r) => !isActive(r));
  const total = (type: "EXPENSE" | "INCOME") =>
    active.filter((r) => r.type === type && r.startMonth <= month).reduce((s, r) => s + r.amountCents, 0);

  return (
    <>
      <PageHeader
        title="Gastos e receitas fixos"
        description="Cada item gera automaticamente um lançamento pendente por mês, a partir do mês em que foi cadastrado."
        action={
          <Link href="/fixos/novo" className={buttonClass()}>
            <Plus className="size-4" aria-hidden /> Novo
          </Link>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4">
        <MetricCard
          label="Despesas fixas/mês"
          icon={<Lock className="size-[18px]" />}
          iconClassName="bg-secondary-container text-on-secondary-container"
          value={formatBRL(total("EXPENSE"))}
        />
        <MetricCard
          label="Receitas fixas/mês"
          icon={<ArrowDown className="size-[18px]" />}
          iconClassName="bg-success-container text-success"
          value={formatBRL(total("INCOME"))}
          valueClassName="text-success"
        />
      </div>

      {recurrings.length === 0 ? (
        <EmptyState>Nenhum gasto fixo cadastrado. Comece pelo aluguel, contas e assinaturas.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <RecurringList items={active} />
          {ended.length > 0 && (
            <Card>
              <CardTitle>Encerrados</CardTitle>
              <RecurringList items={ended} bare />
            </Card>
          )}
        </div>
      )}
    </>
  );
}

type RecurringItem = Awaited<ReturnType<typeof listRecurrings>>[number];

function RecurringList({ items, bare }: { items: RecurringItem[]; bare?: boolean }) {
  const list = (
    <ul className="divide-y divide-surface-container-low">
      {items.map((r) => (
        <li key={r.id}>
          <Link href={`/fixos/${r.id}`} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-container text-body-sm leading-none">
              <span className="text-[10px] text-secondary">dia</span>
              <span className="font-semibold">{r.dayOfMonth}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-body-md font-medium">{r.description}</span>
              <span className="flex flex-wrap gap-x-3 text-body-sm text-secondary">
                {r.category && <CategoryBadge name={r.category.name} color={r.category.color} />}
                <span>
                  {formatMonthShort(r.startMonth)}
                  {r.endMonth ? ` até ${formatMonthShort(r.endMonth)}` : " · sem fim"}
                </span>
              </span>
            </span>
            <span
              className={
                r.type === "INCOME"
                  ? "text-body-md font-semibold text-primary tabular-nums"
                  : "text-body-md font-semibold tabular-nums"
              }
            >
              {formatBRL(r.amountCents)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
  return bare ? list : <Card className="p-0">{list}</Card>;
}
