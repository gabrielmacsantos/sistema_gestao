import * as cheerio from "cheerio";
import { parseMoneyToCents } from "@/lib/money";
import type { DraftItem } from "@/lib/validation";

export type NfcePageData = {
  merchantName: string | null;
  merchantTaxId: string | null;
  /** "YYYY-MM-DD" */
  date: string | null;
  totalCents: number | null;
  paymentMethod: string | null;
  items: DraftItem[];
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function afterLabel(text: string): string {
  return clean(text.replace(/^[^:]*:/, ""));
}

/**
 * Parser for the public NFC-e consultation page layout shared by most SEFAZ portals
 * (#tabResult items, #totalNota totals, .txtTopo merchant). States with a different
 * layout get their own parser in this folder.
 */
export function parseStandardPortal(html: string): NfcePageData {
  const $ = cheerio.load(html);

  const items: DraftItem[] = [];
  $("#tabResult tr").each((_, row) => {
    const $row = $(row);
    const description = clean($row.find(".txtTit").first().text());
    const totalCents = parseMoneyToCents(clean($row.find(".valor").first().text()));
    if (!description || totalCents === null) return;

    const quantity = Number(afterLabel($row.find(".Rqtd").text()).replace(",", "."));
    const unit = afterLabel($row.find(".RUN").text()) || null;
    const unitPriceCents = parseMoneyToCents(afterLabel($row.find(".RvlUnit").text()));

    items.push({
      description: description.slice(0, 200),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: unit ? unit.slice(0, 10) : null,
      unitPriceCents,
      totalCents,
    });
  });

  let totalCents: number | null = null;
  let paymentMethod: string | null = null;
  $("#totalNota #linhaTotal").each((_, line) => {
    const $line = $(line);
    const label = clean($line.find("label").text()).toLowerCase();
    const value = parseMoneyToCents(clean($line.find(".totalNumb").text()));
    if (label.startsWith("valor a pagar") && value !== null) totalCents = value;
    else if (label.startsWith("valor total") && value !== null && totalCents === null) totalCents = value;
    if (!paymentMethod && $line.find("label.tx").length) {
      paymentMethod = clean($line.find("label.tx").text()) || null;
    }
  });

  const merchantName = clean($(".txtTopo").first().text()) || null;
  const cnpjText = $(".text")
    .toArray()
    .map((el) => $(el).text())
    .find((t) => /CNPJ/i.test(t));
  const merchantTaxId = cnpjText?.replace(/\D/g, "").slice(0, 14) || null;

  const pageText = clean($("body").text());
  const dateMatch = pageText.match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;

  return {
    merchantName: merchantName ? merchantName.slice(0, 120) : null,
    merchantTaxId: merchantTaxId && merchantTaxId.length === 14 ? merchantTaxId : null,
    date,
    totalCents,
    paymentMethod: paymentMethod ? (paymentMethod as string).slice(0, 40) : null,
    items,
  };
}
