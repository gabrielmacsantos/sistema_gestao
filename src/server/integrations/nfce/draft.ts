import { parseDateInput } from "@/lib/dates";
import type { TransactionDraft } from "@/lib/validation";
import type { NfcePageData } from "./parsers/standard-portal";
import { parseStandardPortal } from "./parsers/standard-portal";
import type { NfceQr } from "./qrcode";

type PageParser = (html: string) => NfcePageData;

// States whose portal does not follow the standard layout get an entry here.
const PARSERS_BY_UF: Partial<Record<string, PageParser>> = {};

export function parserFor(uf: string): PageParser {
  return PARSERS_BY_UF[uf] ?? parseStandardPortal;
}

/** Combines what the QR Code carries with what was read from the SEFAZ page (if anything). */
export function buildNfceDraft(qr: NfceQr, page: NfcePageData | null): TransactionDraft {
  const warnings: string[] = [];
  const parsedPage = page && (page.items.length > 0 || page.totalCents !== null) ? page : null;

  if (!parsedPage) {
    warnings.push(
      "Não foi possível ler os detalhes da nota no site da SEFAZ. Confira e complete os dados.",
    );
  }

  let date = parsedPage?.date && parseDateInput(parsedPage.date) ? parsedPage.date : null;
  if (!date && qr.day) {
    const candidate = `${qr.issueMonth}-${String(qr.day).padStart(2, "0")}`;
    date = parseDateInput(candidate) ? candidate : null;
  }
  if (!date) warnings.push("Data da compra não encontrada.");

  const amountCents = parsedPage?.totalCents ?? qr.totalCents ?? 0;
  if (!amountCents) warnings.push("Valor total não encontrado.");

  const merchantName = parsedPage?.merchantName ?? null;

  return {
    source: "NFCE",
    type: "EXPENSE",
    description: merchantName ?? "Compra NFC-e",
    amountCents,
    date,
    merchantName,
    merchantTaxId: parsedPage?.merchantTaxId ?? qr.issuerTaxId,
    paymentMethod: parsedPage?.paymentMethod ?? null,
    externalId: qr.accessKey,
    attachment: null,
    items: parsedPage?.items ?? [],
    warnings,
    duplicate: false,
  };
}
