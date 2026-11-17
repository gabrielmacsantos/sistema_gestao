"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { MoneyInput } from "@/components/ui/money-input";
import { useGoalCelebration } from "@/components/use-goal-celebration";
import type { CategoryOption } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";
import { createGoalAction, depositGoalAction, setBudgetAction } from "./actions";

export function BudgetForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setBudgetAction, {});
  const errors = state.fieldErrors ?? {};
  const values = state.ok ? {} : (state.values ?? {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage ok={state.ok} message={state.message} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" htmlFor="budget-category" error={errors.categoryId}>
          <Select id="budget-category" name="categoryId" defaultValue={values.categoryId ?? ""} required>
            <option value="" disabled>
              Escolha
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Limite mensal (R$)" htmlFor="budget-amount" error={errors.amountCents}>
          <MoneyInput id="budget-amount" name="amountCents" placeholder="0,00" defaultValue={values.amountCents} />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Definir limite"}
      </Button>
    </form>
  );
}

export function GoalForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createGoalAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useGoalCelebration(state, userId, formRef);
  const errors = state.fieldErrors ?? {};
  const values = state.ok ? {} : (state.values ?? {});

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <FormMessage ok={state.ok} message={state.message} />
      <Field label="Nome da meta" htmlFor="goal-name" error={errors.name}>
        <Input id="goal-name" name="name" placeholder="Ex.: Reserva de emergência" defaultValue={values.name} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor alvo (R$)" htmlFor="goal-target" error={errors.targetCents}>
          <MoneyInput id="goal-target" name="targetCents" placeholder="0,00" defaultValue={values.targetCents} />
        </Field>
        <Field label="Já guardado (R$)" htmlFor="goal-saved" error={errors.savedCents}>
          <MoneyInput id="goal-saved" name="savedCents" placeholder="0,00" defaultValue={values.savedCents} />
        </Field>
      </div>
      <Field label="Prazo" htmlFor="goal-deadline" error={errors.deadline}>
        <Input id="goal-deadline" name="deadline" type="date" defaultValue={values.deadline} />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Criar meta"}
      </Button>
    </form>
  );
}

export function DepositForm({ goalId, userId }: { goalId: string; userId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    depositGoalAction.bind(null, goalId),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useGoalCelebration(state, userId, formRef);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <MoneyInput name="amountCents" placeholder="0,00" aria-label="Valor a guardar" className="h-9" />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Guardar
        </Button>
      </div>
      {state.fieldErrors?.amountCents && (
        <p className="text-body-sm text-danger">{state.fieldErrors.amountCents[0]}</p>
      )}
    </form>
  );
}
