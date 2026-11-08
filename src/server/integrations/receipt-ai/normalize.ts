import { z } from "zod";
import { parseDateInput } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import type { TransactionDraft } from "@/lib/validation";

/** Structured output requested from the model. Kept free of server-only imports so it is testable. */
export const receiptSchema = z.object({
  is_receipt: z.boolean(),
  merchant_name: z.string().nullable(),
  merchant_tax_id: z.string().nullable(),
  date: z.string().nullable(),
  total: z.string().nullable(),
  payment_method: z.string().nullable(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().nullable(),
      unit_price: z.string().nullable(),
      total: z.string().nullable(),
    }),
  ),
});
export type ReceiptExtraction = z.infer<typeof receiptSchema>;

const positiveCents = (value: string | null) => {
  const cents = value ? parseMoneyToCents(value) : null;
  return cents !== null && cents >= 0 ? cents : null;
};

export function toDraft(data: ReceiptExtraction | null, attachment: string | null): TransactionDraft {
  const warnings: string[] = [];

  if (!data) {
    return {
      source: "RECEIPT_PHOTO",
      type: "EXPENSE",
      description: "",
      amountCents: 0,
      date: null,
      merchantName: null,
      merchantTaxId: null,
      paymentMethod: null,
      externalId: null,
      attachment,
      items: [],
      warnings: ["Não foi possível ler a foto. Preencha os dados manualmente."],
      duplicate: false,
    };
  }

  if (!data.is_receipt) warnings.push("A imagem não parece ser um comprovante de compra.");

  const items = data.items.flatMap((item) => {
    const totalCents = positiveCents(item.total);
    const description = item.description.trim().slice(0, 200);
    if (totalCents === null || !description) return [];
    return [
      {
        description,
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
        unit: null,
        unitPriceCents: positiveCents(item.unit_price),
        totalCents,
      },
    ];
  });

  let amountCents = positiveCents(data.total);
  if (amountCents === null) {
    amountCents = items.reduce((sum, i) => sum + i.totalCents, 0);
    warnings.push(
      amountCents
        ? "Total não encontrado; usamos a soma dos itens."
        : "Total não encontrado. Informe o valor.",
    );
  }

  const date = data.date && parseDateInput(data.date) ? data.date : null;
  if (!date) warnings.push("Data não encontrada. Informe a data da compra.");

  const taxId = data.merchant_tax_id?.replace(/\D/g, "") || null;
  const merchantName = data.merchant_name?.trim().slice(0, 120) || null;

  return {
    source: "RECEIPT_PHOTO",
    type: "EXPENSE",
    description: merchantName ?? "",
    amountCents,
    date,
    merchantName,
    merchantTaxId: taxId && (taxId.length === 14 || taxId.length === 11) ? taxId : null,
    paymentMethod: data.payment_method?.trim().slice(0, 40) || null,
    externalId: null,
    attachment,
    items,
    warnings,
    duplicate: false,
  };
}
