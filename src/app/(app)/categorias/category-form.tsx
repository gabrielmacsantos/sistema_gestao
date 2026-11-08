"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";
import { createCategoryAction } from "./actions";

export function CategoryForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createCategoryAction, {});
  const errors = state.fieldErrors ?? {};
  const values = state.ok ? {} : (state.values ?? {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage ok={state.ok} message={state.message} />
      <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <Field label="Nome" htmlFor="name" error={errors.name} className="col-span-2 sm:col-span-1">
          <Input id="name" name="name" defaultValue={values.name} required />
        </Field>
        <Field label="Tipo" htmlFor="type">
          <Select id="type" name="type" defaultValue={values.type ?? "EXPENSE"}>
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </Select>
        </Field>
        <Field label="Cor" htmlFor="color" error={errors.color}>
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue={values.color ?? "#6366f1"}
            className="w-14 p-1"
          />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Adicionar categoria"}
      </Button>
    </form>
  );
}
