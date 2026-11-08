import "server-only";
import type { ConfirmedDraft, ImportSource, TransactionDraft } from "@/lib/validation";
import { listCategories } from "../repositories/categories";
import { createTransaction, findExistingExternalIds } from "../repositories/transactions";
import { DomainError, isUniqueViolation } from "../errors";
import { isOwnUpload } from "../storage";

/** Flags drafts that were already imported, so the review screen can show them unchecked. */
export async function markDuplicates(userId: string, drafts: TransactionDraft[]): Promise<TransactionDraft[]> {
  const bySource = new Map<ImportSource, string[]>();
  for (const d of drafts) {
    if (d.externalId) bySource.set(d.source, [...(bySource.get(d.source) ?? []), d.externalId]);
  }
  const existing = new Set<string>();
  for (const [source, ids] of bySource) {
    for (const id of await findExistingExternalIds(userId, source, ids)) existing.add(`${source}:${id}`);
  }
  return drafts.map((d) => ({
    ...d,
    duplicate: !!d.externalId && existing.has(`${d.source}:${d.externalId}`),
  }));
}

/** Persists drafts the user reviewed. Already-imported ones are skipped, never duplicated. */
export async function confirmDrafts(userId: string, drafts: ConfirmedDraft[]) {
  const categories = await listCategories(userId);
  const categoryType = new Map(categories.map((c) => [c.id, c.type]));

  for (const d of drafts) {
    if (d.categoryId && categoryType.get(d.categoryId) !== d.type) {
      throw new DomainError("Categoria inválida em um dos lançamentos.");
    }
    if (d.attachment && !isOwnUpload(userId, d.attachment)) {
      throw new DomainError("Anexo inválido.");
    }
  }

  let created = 0;
  let skipped = 0;
  for (const d of drafts) {
    try {
      await createTransaction(
        userId,
        {
          type: d.type,
          description: d.description,
          amountCents: d.amountCents,
          date: d.date,
          status: "PAID",
          source: d.source,
          categoryId: d.categoryId,
          paymentMethod: d.paymentMethod,
          merchantName: d.merchantName,
          merchantTaxId: d.merchantTaxId,
          externalId: d.externalId,
          attachment: d.attachment,
        },
        d.items,
      );
      created++;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      skipped++;
    }
  }
  return { created, skipped };
}
