import type { Metadata } from "next";
import { ConfirmButton } from "@/components/confirm-button";
import { MonthPicker } from "@/components/month-picker";
import { ProgressBar } from "@/components/progress-bar";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { listGoals } from "@/server/services/budgets";
import { ensureOccurrences } from "@/server/services/recurring";
import { BUDGET_WARNING_RATIO, budgetStatus } from "@/server/services/reports";
import { formatDate } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { monthParam, type SearchParams } from "@/lib/search-params";
import { deleteBudgetAction, deleteGoalAction } from "./actions";
import { BudgetForm, DepositForm, GoalForm } from "./forms";

export const metadata: Metadata = { title: "Orçamentos e metas" };

export default async function BudgetsPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireUserId();
  const month = monthParam(await searchParams);
  await ensureOccurrences(userId);
  const [statuses, categories, goals] = await Promise.all([
    budgetStatus(userId, month),
    listCategories(userId, "EXPENSE"),
    listGoals(userId),
  ]);

  return (
    <>
      <PageHeader title="Orçamentos e metas" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <Card>
            <CardTitle action={<MonthPicker month={month} basePath="/orcamentos" />}>Orçamento</CardTitle>
            {statuses.length === 0 ? (
              <EmptyState>Defina limites de gasto por categoria abaixo.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-4">
                {statuses.map((s) => {
                  const tone = s.ratio > 1 ? "over" : s.ratio >= BUDGET_WARNING_RATIO ? "warn" : "ok";
                  return (
                    <li key={s.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-body-md">
                        <span className="font-medium">{s.categoryName}</span>
                        <ConfirmButton action={deleteBudgetAction.bind(null, s.id)} label="Remover" size="sm" />
                      </div>
                      <ProgressBar ratio={s.ratio} tone={tone} label={`Orçamento de ${s.categoryName}`} />
                      <p className="text-body-sm text-secondary">
                        {formatBRL(s.spentCents)} de {formatBRL(s.limitCents)}
                        {tone === "over" && (
                          <span className="ml-1 font-medium text-danger">
                            · estourou {formatBRL(s.spentCents - s.limitCents)}
                          </span>
                        )}
                        {tone === "warn" && (
                          <span className="ml-1 font-medium text-warning">
                            · {Math.round(s.ratio * 100)}% usado
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>Definir limite</CardTitle>
            <BudgetForm categories={categories} />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <Card>
            <CardTitle>Metas de economia</CardTitle>
            {goals.length === 0 ? (
              <EmptyState>Nenhuma meta ainda.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-5">
                {goals.map((g) => {
                  const ratio = g.targetCents > 0 ? g.savedCents / g.targetCents : 0;
                  return (
                    <li key={g.id} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 text-body-md">
                        <span className="font-medium">{g.name}</span>
                        <ConfirmButton action={deleteGoalAction.bind(null, g.id)} label="Excluir" size="sm" />
                      </div>
                      <ProgressBar ratio={ratio} tone="ok" label={`Progresso da meta ${g.name}`} />
                      <p className="text-body-sm text-secondary">
                        {formatBRL(g.savedCents)} de {formatBRL(g.targetCents)} ({Math.round(ratio * 100)}%)
                        {g.deadline && ` · até ${formatDate(g.deadline)}`}
                        {ratio >= 1 && (
                          <span className="ml-1 font-medium text-primary">· concluída!</span>
                        )}
                      </p>
                      <DepositForm goalId={g.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>Nova meta</CardTitle>
            <GoalForm />
          </Card>
        </section>
      </div>
    </>
  );
}
