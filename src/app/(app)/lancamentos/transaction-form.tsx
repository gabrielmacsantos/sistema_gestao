"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { PAYMENT_METHODS, type CategoryOption } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";
import { saveTransactionAction } from "./actions";

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
  const values: TransactionFormValues = { ...initial, ...state.values };
  const options = categories.filter((c) => c.type === type);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage ok={state.ok} message={state.message} />

      <fieldset>
        <legend className="sr-only">Tipo</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container p-1">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <label
              key={t}
              className={cn(
                "cursor-pointer rounded-md py-2 text-center text-body-md font-medium",
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
        <Input id="description" name="description" defaultValue={values.description} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" htmlFor="amountCents" error={errors.amountCents}>
          <Input
            id="amountCents"
            name="amountCents"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={values.amountCents}
            required
          />
        </Field>
        <Field label="Data" htmlFor="date" error={errors.date}>
          <Input id="date" name="date" type="date" defaultValue={values.date} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" htmlFor="categoryId" error={errors.categoryId}>
          <Select
            id="categoryId"
            name="categoryId"
            key={type}
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
          <Select id="status" name="status" defaultValue={values.status}>
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
