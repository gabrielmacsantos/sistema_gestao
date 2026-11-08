"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/server/auth";
import { DomainError } from "@/server/errors";
import { CsvFormatError, decodeStatement, parseStatement } from "@/server/integrations/bank-import";
import { readNfce } from "@/server/integrations/nfce";
import { extractReceipt, type ReceiptImage } from "@/server/integrations/receipt-ai/extract";
import { confirmDrafts, markDuplicates } from "@/server/services/imports";
import { ALLOWED_IMAGE_TYPES, saveUpload } from "@/server/storage";
import { confirmedDraftSchema, type TransactionDraft } from "@/lib/validation";

export type ImportResult = { drafts: TransactionDraft[]; error?: undefined } | { error: string; drafts?: undefined };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_STATEMENT_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

async function toResult(fn: () => Promise<TransactionDraft[]>): Promise<ImportResult> {
  try {
    return { drafts: await fn() };
  } catch (error) {
    if (error instanceof DomainError || error instanceof CsvFormatError) return { error: error.message };
    throw error;
  }
}

export async function readNfceAction(qrText: string): Promise<ImportResult> {
  const userId = await requireUserId();
  return toResult(async () => {
    if (typeof qrText !== "string" || qrText.length > 2000) {
      throw new DomainError("QR Code inválido.");
    }
    return markDuplicates(userId, [await readNfce(qrText)]);
  });
}

export async function readReceiptAction(formData: FormData): Promise<ImportResult> {
  const userId = await requireUserId();
  return toResult(async () => {
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("Escolha uma foto.");
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new DomainError("Formato não suportado. Envie JPG, PNG ou WebP.");
    }
    if (file.size > MAX_IMAGE_BYTES) throw new DomainError("A foto deve ter no máximo 8 MB.");

    const data = Buffer.from(await file.arrayBuffer());
    const attachment = await saveUpload(userId, data, file.type);
    const draft = await extractReceipt({ data, mediaType: file.type as ReceiptImage["mediaType"] }, attachment);
    return [draft];
  });
}

export async function readStatementAction(formData: FormData): Promise<ImportResult> {
  const userId = await requireUserId();
  return toResult(async () => {
    const file = formData.get("statement");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("Escolha um arquivo OFX ou CSV.");
    if (file.size > MAX_STATEMENT_BYTES) throw new DomainError("O arquivo deve ter no máximo 5 MB.");
    const signMode = formData.get("signMode") === "positive-expense" ? "positive-expense" : "negative-expense";

    const content = decodeStatement(Buffer.from(await file.arrayBuffer()));
    const drafts = parseStatement(file.name, content, signMode);
    if (drafts.length === 0) throw new DomainError("Nenhum lançamento encontrado no arquivo.");
    if (drafts.length > MAX_ROWS) throw new DomainError(`O arquivo tem mais de ${MAX_ROWS} lançamentos.`);
    return markDuplicates(userId, drafts);
  });
}

const confirmSchema = z.array(confirmedDraftSchema).min(1, "Selecione ao menos um lançamento.").max(MAX_ROWS);

export async function confirmImportAction(drafts: unknown): Promise<{ error: string } | void> {
  const userId = await requireUserId();
  const parsed = confirmSchema.safeParse(drafts);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row = typeof issue.path[0] === "number" ? ` (linha ${issue.path[0] + 1})` : "";
    return { error: `${issue.message}${row}` };
  }

  let result;
  try {
    result = await confirmDrafts(userId, parsed.data);
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(`/lancamentos?importados=${result.created}&ignorados=${result.skipped}`);
}
