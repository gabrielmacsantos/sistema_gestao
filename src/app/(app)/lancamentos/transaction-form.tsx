"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { SpokenTransaction } from "@/lib/voice-parser";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { MoneyInput } from "@/components/ui/money-input";
import { PAYMENT_METHODS, type CategoryOption } from "@/lib/constants";
import { formatCentsInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";
import { saveTransactionAction } from "./actions";
import { VoiceCard } from "./voice-card";

export type TransactionFormValues = {
  type: "EXPENSE" | "INCOME";
  description: string;
  amountCents: string;
  date: string;
  status: "PAID" | "PENDING";
  categoryId: string;
  paymentMethod: string;
  notes: string;
};

const DESCRIPTION_HINT = { EXPENSE: "Ex.: Mercado, Uber, Farmácia", INCOME: "Ex.: Salário, Freela, Bônus" };

export function TransactionForm({
  id,
  categories,
  initial,
}: {
  id?: string;
  categories: CategoryOption[];
  initial: TransactionFormValues;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveTransactionAction.bind(null, id),
    {},
  );
  const [type, setType] = useState(initial.type);
  const errors = state.fieldErrors ?? {};
  // Spoken values fill only the fields the sentence mentioned; the key remounts just those inputs.
  const [spoken, setSpoken] = useState<{ values: Partial<TransactionFormValues>; rev: Record<string, number> }>({
    values: {},
    rev: {},
  });
  const values: TransactionFormValues = { ...initial, ...state.values, ...spoken.values };
  const fillFromVoice = (p: SpokenTransaction) => {
    const next: Partial<TransactionFormValues> = {};
    if (p.description) next.description = p.description;
    if (p.amountCents) next.amountCents = formatCentsInput(Math.min(p.amountCents, 99_999_999_999));
    if (p.date) next.date = p.date;
    if (p.categoryId) next.categoryId = p.categoryId;
    if (p.status) next.status = p.status;
    setType(p.type);
    setSpoken((prev) => ({
      values: { ...prev.values, ...next },
      rev: Object.fromEntries(
        Object.keys(next)
          .map((k) => [k, (prev.rev[k] ?? 0) + 1] as const)
          .concat(Object.entries(prev.rev).filter(([k]) => !(k in next))),
      ),
    }));
  };
  const options = categories.filter((c) => c.type === type);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage ok={state.ok} message={state.message} />

      {!id && <VoiceCard type={type} categories={categories} onParsed={fillFromVoice} />}

      <fieldset>
        <legend className="sr-only">Tipo</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container p-1">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <label
              key={t}
              className={cn(
                "cursor-pointer rounded-md py-2.5 text-center text-body-md font-medium transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                type === t
                  ? t === "EXPENSE"
                    ? "bg-surface-container-lowest text-danger shadow-sm"
                    : "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-secondary",
              )}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              {t === "EXPENSE" ? "Despesa" : "Receita"}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Descrição" htmlFor="description" error={errors.description}>
        <Input
          key={spoken.rev.description ?? 0}
          id="description"
          name="description"
          defaultValue={values.description}
          placeholder={DESCRIPTION_HINT[type]}
          required
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Field label="Valor (R$)" htmlFor="amountCents" error={errors.amountCents}>
          <MoneyInput key={spoken.rev.amountCents ?? 0} id="amountCents" name="amountCents" placeholder="0,00" defaultValue={values.amountCents} />
        </Field>
        <Field label="Data" htmlFor="date" error={errors.date}>
          <Input key={spoken.rev.date ?? 0} id="date" name="date" type="date" defaultValue={values.date} required />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Field label="Categoria" htmlFor="categoryId" error={errors.categoryId}>
          <Select
            id="categoryId"
            name="categoryId"
            key={`${type}-${spoken.rev.categoryId ?? 0}`}
            defaultValue={options.some((c) => c.id === values.categoryId) ? values.categoryId : ""}
          >
            <option value="">Sem categoria</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Situação" htmlFor="status" error={errors.status}>
          <Select key={spoken.rev.status ?? 0} id="status" name="status" defaultValue={values.status}>
            <option value="PAID">{type === "EXPENSE" ? "Pago" : "Recebido"}</option>
            <option value="PENDING">Pendente</option>
          </Select>
        </Field>
      </div>

      <Field label="Forma de pagamento" htmlFor="paymentMethod" error={errors.paymentMethod}>
        <Input
          id="paymentMethod"
          name="paymentMethod"
          list="payment-methods"
          defaultValue={values.paymentMethod}
        />
        <datalist id="payment-methods">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>

      <Field label="Observações" htmlFor="notes" error={errors.notes}>
        <Textarea id="notes" name="notes" defaultValue={values.notes} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <Link href="/lancamentos" className={buttonClass("secondary")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
