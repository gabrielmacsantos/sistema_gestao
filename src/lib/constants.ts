export const PAYMENT_METHODS = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Boleto",
  "Transferência",
  "Débito automático",
];

export const TYPE_LABEL = { EXPENSE: "Despesa", INCOME: "Receita" } as const;

export const SOURCE_LABEL = {
  MANUAL: "Manual",
  RECURRING: "Gasto fixo",
  NFCE: "NFC-e",
  RECEIPT_PHOTO: "Foto do cupom",
  BANK_IMPORT: "Extrato",
} as const;

export type CategoryOption = { id: string; name: string; type: "EXPENSE" | "INCOME"; color: string };
