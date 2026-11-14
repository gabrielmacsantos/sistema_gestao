import "server-only";
import { searchMatcher } from "@/lib/search";
import type { TransactionInput } from "@/lib/validation";
import * as repo from "../repositories/transactions";
import { DomainError } from "../errors";
import { assertCategory } from "./categories";

/**
 * The ledger's entries for the filters, narrowed by the typed search. The search runs on this
 * user's rows only, after the query; no LIKE, which handles accents badly and has wildcards.
 */
export async function searchTransactions(userId: string, filters: repo.TransactionFilters, search: string) {
  const rows = await repo.listTransactions(userId, filters);
  if (!search.trim()) return rows;
  const match = searchMatcher(search);
  return rows.filter((t) =>
    match({
      description: t.description,
      amountCents: t.amountCents,
      merchantName: t.merchantName,
      notes: t.notes,
      categoryName: t.category?.name,
    }),
  );
}

export async function saveTransaction(userId: string, input: TransactionInput, id?: string) {
  const categoryId = await assertCategory(userId, input.categoryId, input.type);
  const data = { ...input, categoryId };

  if (!id) {
    return repo.createTransaction(userId, { ...data, source: "MANUAL" });
  }

  const existing = await repo.findTransaction(userId, id);
  if (!existing) throw new DomainError("Lançamento não encontrado.");
  // Source, recurring link and imported metadata are kept; only user-editable fields change.
  await repo.updateTransaction(userId, id, data);
}

export async function setTransactionStatus(userId: string, id: string, status: "PAID" | "PENDING") {
  const { count } = await repo.updateTransaction(userId, id, { status });
  if (!count) throw new DomainError("Lançamento não encontrado.");
}

/**
 * Recurring occurrences become SKIPPED tombstones so they are not regenerated;
 * everything else is deleted.
 */
export async function removeTransaction(userId: string, id: string) {
  const existing = await repo.findTransaction(userId, id);
  if (!existing) throw new DomainError("Lançamento não encontrado.");

  if (existing.recurringId) {
    await repo.updateTransaction(userId, id, { status: "SKIPPED" });
  } else {
    await repo.deleteTransaction(userId, id);
  }
}
