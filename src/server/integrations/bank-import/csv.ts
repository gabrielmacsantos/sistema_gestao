import { createHash } from "node:crypto";
import Papa from "papaparse";
import { parseDateInput } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import type { TransactionDraft } from "@/lib/validation";

/**
 * How amounts are signed in the file:
 * - "negative-expense": bank account statements (debits are negative)
 * - "positive-expense": credit card bills (purchases are positive)
 */
export type CsvSignMode = "negative-expense" | "positive-expense";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const DATE_HEADERS = ["data", "date", "data lancamento", "data da compra"];
const DESCRIPTION_HEADERS = ["descricao", "description", "historico", "lancamento", "title", "estabelecimento", "memo"];
const AMOUNT_HEADERS = ["valor", "amount", "valor (r$)", "value"];

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalize);
  const exact = normalized.findIndex((h) => candidates.includes(h));
  if (exact >= 0) return exact;
  return normalized.findIndex((h) => candidates.some((c) => h.startsWith(c)));
}

function parseCsvDate(value: string): string | null {
  const v = value.trim();
  let iso: string | null = null;
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) iso = `${br[3]}-${br[2]}-${br[1]}`;
  else if (/^\d{4}-\d{2}-\d{2}/.test(v)) iso = v.slice(0, 10);
  return iso && parseDateInput(iso) ? iso : null;
}

export class CsvFormatError extends Error {}

export function parseCsv(content: string, signMode: CsvSignMode): TransactionDraft[] {
  const parsed = Papa.parse<string[]>(content.replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
  });
  const [headers, ...rows] = parsed.data;
  if (!headers) throw new CsvFormatError("Arquivo vazio.");

  const dateCol = findColumn(headers, DATE_HEADERS);
  const descCol = findColumn(headers, DESCRIPTION_HEADERS);
  const amountCol = findColumn(headers, AMOUNT_HEADERS);
  if (dateCol < 0 || descCol < 0 || amountCol < 0) {
    throw new CsvFormatError(
      "Não encontramos as colunas de data, descrição e valor. Use um cabeçalho como: Data;Descrição;Valor",
    );
  }

  // Identical rows (same day, value and text) are legitimate; the occurrence index keeps their ids distinct.
  const seen = new Map<string, number>();

  return rows.flatMap((row) => {
    const amount = parseMoneyToCents(row[amountCol] ?? "");
    const description = (row[descCol] ?? "").trim().slice(0, 120);
    if (amount === null || amount === 0 || !description) return [];

    const date = parseCsvDate(row[dateCol] ?? "");
    const isExpense = signMode === "negative-expense" ? amount < 0 : amount > 0;

    const base = `${date}|${amount}|${normalize(description)}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    const hash = createHash("sha256").update(`${base}|${occurrence}`).digest("hex").slice(0, 32);

    return [
      {
        source: "BANK_IMPORT" as const,
        type: isExpense ? ("EXPENSE" as const) : ("INCOME" as const),
        description,
        amountCents: Math.abs(amount),
        date,
        merchantName: null,
        merchantTaxId: null,
        paymentMethod: null,
        externalId: `csv:${hash}`,
        attachment: null,
        items: [],
        warnings: date ? [] : ["Data inválida no arquivo."],
        duplicate: false,
      },
    ];
  });
}
