"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SlidingTabs } from "@/components/sliding-tabs";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { MoneyInput } from "@/components/ui/money-input";
import { PAYMENT_METHODS, type CategoryOption } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";
import { saveRecurringAction } from "./actions";

export type RecurringFormValues = {
  type: "EXPENSE" | "INCOME";
  description: string;
  amountCents: string;
  dayOfMonth: string;
  startMonth: string;
  endMonth: string;
  categoryId: string;
  paymentMethod: string;
};

export function RecurringForm({
  id,
  categories,
  initial,
}: {
  id?: string;
  categories: CategoryOption[];
  initial: RecurringFormValues;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveRecurringAction.bind(null, id),
    {},
  );
  const [type, setType] = useState(initial.type);
  // Controlled, so switching the type swaps the options without remounting the select; a choice that does not
  // exist for the other type shows as "Sem categoria" and comes back if the type is switched back.
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const errors = state.fieldErrors ?? {};
  const values: RecurringFormValues = { ...initial, ...state.values };
  const options = categories.filter((c) => c.type === type);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage ok={state.ok} message={state.message} />
      {id && (
        <p className="rounded-lg bg-surface-container px-3 py-2 text-body-sm text-secondary">
          As alterações valem para os próximos meses. Lançamentos já gerados não mudam.
        </p>
      )}

      <fieldset>
        <legend className="sr-only">Tipo</legend>
        <SlidingTabs kind="radio" fill>
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <label key={t} data-active={type === t} data-tone={t === "EXPENSE" ? "exp" : undefined} className="t-tab">
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
        </SlidingTabs>
      </fieldset>

      <Field label="Descrição" htmlFor="description" error={errors.description}>
        <Input
          id="description"
          name="description"
          defaultValue={values.description}
          placeholder="Ex.: Aluguel, Internet, Salário"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" htmlFor="amountCents" error={errors.amountCents}>
          <MoneyInput id="amountCents" name="amountCents" placeholder="0,00" defaultValue={values.amountCents} />
        </Field>
        <Field label="Dia do vencimento" htmlFor="dayOfMonth" error={errors.dayOfMonth}>
          <Input
            id="dayOfMonth"
            name="dayOfMonth"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            defaultValue={values.dayOfMonth}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Começa em" htmlFor="startMonth" error={errors.startMonth}>
          <Input id="startMonth" name="startMonth" type="month" defaultValue={values.startMonth} required />
        </Field>
        <Field label="Termina em" htmlFor="endMonth" error={errors.endMonth} hint="Vazio = sem fim">
          <Input id="endMonth" name="endMonth" type="month" defaultValue={values.endMonth} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" htmlFor="categoryId" error={errors.categoryId}>
          <Select
            id="categoryId"
            name="categoryId"
            value={options.some((c) => c.id === categoryId) ? categoryId : ""}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
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
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <Link href="/fixos" className={buttonClass("secondary")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
