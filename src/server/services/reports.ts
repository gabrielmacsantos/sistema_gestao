import "server-only";
import { cache } from "react";
import { addMonths, monthOf, monthRange } from "@/lib/dates";
import { listBudgets } from "../repositories/budgets";
import { listCategories } from "../repositories/categories";
import * as tx from "../repositories/transactions";
import { projectedOccurrences } from "./recurring";

export type MonthSummary = {
  incomePaid: number;
  incomePending: number;
  expensePaid: number;
  expensePending: number;
  /** Paid income minus paid expenses. */
  balance: number;
  /** Including pending and projected recurring entries. */
  forecast: number;
};

export async function monthSummary(userId: string, month: string): Promise<MonthSummary> {
  const { start, end } = monthRange(month);
  const [groups, projected] = await Promise.all([
    tx.sumByTypeAndStatus(userId, start, end),
    projectedOccurrences(userId, month),
  ]);

  const sum = (type: string, status: string) =>
    groups.find((g) => g.type === type && g.status === status)?._sum.amountCents ?? 0;
  const projectedSum = (type: string) =>
    projected.filter((p) => p.type === type).reduce((acc, p) => acc + p.amountCents, 0);

  const incomePaid = sum("INCOME", "PAID");
  const incomePending = sum("INCOME", "PENDING") + projectedSum("INCOME");
  const expensePaid = sum("EXPENSE", "PAID");
  const expensePending = sum("EXPENSE", "PENDING") + projectedSum("EXPENSE");

  return {
    incomePaid,
    incomePending,
    expensePaid,
    expensePending,
    balance: incomePaid - expensePaid,
    forecast: incomePaid + incomePending - expensePaid - expensePending,
  };
}

export type CategoryTotal = { categoryId: string | null; name: string; color: string; totalCents: number };

async function totalsByCategory(userId: string, month: string, withProjected: boolean): Promise<CategoryTotal[]> {
  const { start, end } = monthRange(month);
  const [groups, categories, projected] = await Promise.all([
    tx.sumByCategory(userId, "EXPENSE", start, end),
    listCategories(userId, "EXPENSE"),
    withProjected ? projectedOccurrences(userId, month) : [],
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string | null, number>();
  for (const g of groups) totals.set(g.categoryId, (totals.get(g.categoryId) ?? 0) + (g._sum.amountCents ?? 0));
  for (const p of projected) {
    if (p.type === "EXPENSE") totals.set(p.categoryId, (totals.get(p.categoryId) ?? 0) + p.amountCents);
  }

  return [...totals]
    .map(([categoryId, totalCents]) => {
      const category = categoryId ? byId.get(categoryId) : undefined;
      return {
        categoryId,
        name: category?.name ?? "Sem categoria",
        color: category?.color ?? "#94a3b8",
        totalCents,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);
}

// Cached per request: the dashboard needs it both directly and through budgetStatus.
export const expensesByCategory = cache((userId: string, month: string) => totalsByCategory(userId, month, false));

/** Like expensesByCategory, plus the month's projected recurring expenses: the same base as monthSummary. */
export const forecastByCategory = cache((userId: string, month: string) => totalsByCategory(userId, month, true));

export type MonthlyPoint = { month: string; income: number; expense: number };

/** Same totals as monthSummary: future months also count their projected recurring entries. */
export async function monthlySeries(userId: string, lastMonth: string, count = 6): Promise<MonthlyPoint[]> {
  const firstMonth = addMonths(lastMonth, -(count - 1));
  const months = Array.from({ length: count }, (_, i) => addMonths(firstMonth, i));
  const { start } = monthRange(firstMonth);
  const { end } = monthRange(lastMonth);
  const [rows, projected] = await Promise.all([
    tx.listForPeriod(userId, start, end),
    Promise.all(months.map((month) => projectedOccurrences(userId, month))),
  ]);

  const points = new Map<string, MonthlyPoint>(months.map((month) => [month, { month, income: 0, expense: 0 }]));
  for (const row of [...rows, ...projected.flat()]) {
    const point = points.get(monthOf(row.date));
    if (!point) continue;
    if (row.type === "INCOME") point.income += row.amountCents;
    else point.expense += row.amountCents;
  }
  return [...points.values()];
}

export type BudgetStatus = {
  id: string;
  categoryId: string;
  categoryName: string;
  color: string;
  limitCents: number;
  spentCents: number;
  /** spent / limit, e.g. 0.85 */
  ratio: number;
};

/** Alert thresholds shown in the UI. */
export const BUDGET_WARNING_RATIO = 0.8;

export async function budgetStatus(userId: string, month: string): Promise<BudgetStatus[]> {
  const [budgets, totals] = await Promise.all([listBudgets(userId), expensesByCategory(userId, month)]);
  const spentById = new Map(totals.map((t) => [t.categoryId, t.totalCents]));

  return budgets.map((b) => {
    const spentCents = spentById.get(b.categoryId) ?? 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      color: b.category.color,
      limitCents: b.amountCents,
      spentCents,
      ratio: b.amountCents > 0 ? spentCents / b.amountCents : 0,
    };
  });
}
