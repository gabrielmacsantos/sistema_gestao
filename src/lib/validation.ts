import { z } from "zod";
import { parseDateInput, isValidMonth } from "./dates";
import { parseMoneyToCents } from "./money";

export const transactionTypes = ["EXPENSE", "INCOME"] as const;
export const transactionTypeSchema = z.enum(transactionTypes);

const requiredText = (max: number, message = "Campo obrigatório") =>
  z.string().trim().min(1, message).max(max, `Máximo de ${max} caracteres`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : null));

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : null));

/** Money typed by the user ("1.234,56") -> positive integer cents. */
export const moneySchema = z.string().transform((value, ctx) => {
  const cents = parseMoneyToCents(value);
  if (cents === null || cents <= 0) {
    ctx.addIssue({ code: "custom", message: "Informe um valor maior que zero" });
    return z.NEVER;
  }
  return cents;
});

const nonNegativeMoneySchema = z.string().transform((value, ctx) => {
  if (!value.trim()) return 0;
  const cents = parseMoneyToCents(value);
  if (cents === null || cents < 0) {
    ctx.addIssue({ code: "custom", message: "Valor inválido" });
    return z.NEVER;
  }
  return cents;
});

export const dateInputSchema = z.string().transform((value, ctx) => {
  const date = parseDateInput(value);
  if (!date) {
    ctx.addIssue({ code: "custom", message: "Data inválida" });
    return z.NEVER;
  }
  return date;
});

const optionalDateInputSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Data inválida" });
      return z.NEVER;
    }
    return date;
  });

export const monthSchema = z.string().refine(isValidMonth, "Mês inválido");

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("E-mail inválido"));

export const signupSchema = z.object({
  name: requiredText(80),
  email: emailSchema,
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
});

export const transactionSchema = z.object({
  type: transactionTypeSchema,
  description: requiredText(120),
  amountCents: moneySchema,
  date: dateInputSchema,
  status: z.enum(["PAID", "PENDING"]),
  categoryId: optionalId,
  paymentMethod: optionalText(40),
  notes: optionalText(500),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const recurringSchema = z
  .object({
    type: transactionTypeSchema,
    description: requiredText(120),
    amountCents: moneySchema,
    dayOfMonth: z.coerce
      .number<string>()
      .int("Dia inválido")
      .min(1, "Dia entre 1 e 31")
      .max(31, "Dia entre 1 e 31"),
    startMonth: monthSchema,
    endMonth: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || isValidMonth(v), "Mês inválido"),
    categoryId: optionalId,
    paymentMethod: optionalText(40),
  })
  .refine((v) => !v.endMonth || v.endMonth >= v.startMonth, {
    message: "O mês final deve ser depois do inicial",
    path: ["endMonth"],
  });
export type RecurringInput = z.infer<typeof recurringSchema>;

export const categorySchema = z.object({
  name: requiredText(40),
  type: transactionTypeSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Escolha uma categoria"),
  amountCents: moneySchema,
});

export const goalSchema = z.object({
  name: requiredText(80),
  targetCents: moneySchema,
  savedCents: nonNegativeMoneySchema,
  deadline: optionalDateInputSchema,
});
export type GoalInput = z.infer<typeof goalSchema>;

export const importSources = ["NFCE", "RECEIPT_PHOTO", "BANK_IMPORT"] as const;
export type ImportSource = (typeof importSources)[number];

export const draftItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().positive().default(1),
  unit: z.string().max(10).nullable().default(null),
  unitPriceCents: z.number().int().nonnegative().nullable().default(null),
  totalCents: z.number().int().nonnegative(),
});
export type DraftItem = z.infer<typeof draftItemSchema>;

/**
 * Normalized draft produced by every import source (NFC-e, receipt photo, bank statement).
 * Drafts are only persisted after the user reviews and confirms them.
 */
export const draftSchema = z.object({
  source: z.enum(importSources),
  type: transactionTypeSchema,
  description: z.string().trim().max(120),
  amountCents: z.number().int().nonnegative(),
  date: z.string().nullable(), // "YYYY-MM-DD"
  merchantName: z.string().max(120).nullable().default(null),
  merchantTaxId: z.string().max(20).nullable().default(null),
  paymentMethod: z.string().max(40).nullable().default(null),
  externalId: z.string().max(100).nullable().default(null),
  attachment: z.string().max(200).nullable().default(null),
  items: z.array(draftItemSchema).default([]),
  /** Human-readable notes about what could not be read automatically. */
  warnings: z.array(z.string()).default([]),
  /** Set when a transaction with the same externalId already exists. */
  duplicate: z.boolean().default(false),
});
export type TransactionDraft = z.infer<typeof draftSchema>;

/** A draft after the user's review, ready to be saved. */
export const confirmedDraftSchema = z.object({
  source: z.enum(importSources),
  type: transactionTypeSchema,
  description: requiredText(120),
  amountCents: z.number().int().positive("Informe um valor maior que zero"),
  date: dateInputSchema,
  categoryId: z.string().nullable(),
  paymentMethod: z.string().max(40).nullable(),
  merchantName: z.string().max(120).nullable(),
  merchantTaxId: z.string().max(20).nullable(),
  externalId: z.string().max(100).nullable(),
  attachment: z.string().max(200).nullable(),
  items: z.array(draftItemSchema),
});
export type ConfirmedDraft = z.infer<typeof confirmedDraftSchema>;

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, so the form can be refilled after React resets it. */
  values?: Record<string, string>;
};

export function toActionError(error: z.ZodError, values?: Record<string, string>): ActionState {
  return {
    ok: false,
    message: "Confira os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
    values,
  };
}

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}
