import "server-only";
import type { TransactionType } from "@/generated/prisma/enums";
import type { CategoryInput } from "@/lib/validation";
import * as repo from "../repositories/categories";
import { DomainError, isUniqueViolation } from "../errors";

/** Ensures a client-supplied categoryId belongs to the user (and matches the type). */
export async function assertCategory(
  userId: string,
  categoryId: string | null,
  type?: TransactionType,
): Promise<string | null> {
  if (!categoryId) return null;
  const category = await repo.findCategory(userId, categoryId);
  if (!category || (type && category.type !== type)) {
    throw new DomainError("Categoria inválida.");
  }
  return category.id;
}

export async function saveCategory(userId: string, input: CategoryInput, id?: string) {
  try {
    if (id) {
      const { count } = await repo.updateCategory(userId, id, input);
      if (!count) throw new DomainError("Categoria não encontrada.");
    } else {
      await repo.createCategory(userId, input);
    }
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("Já existe uma categoria com esse nome.");
    throw error;
  }
}

export async function removeCategory(userId: string, id: string) {
  const { count } = await repo.deleteCategory(userId, id);
  if (!count) throw new DomainError("Categoria não encontrada.");
}
