import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { findRecurring } from "@/server/repositories/recurrings";
import { currentMonth } from "@/lib/dates";
import { centsToInput } from "@/lib/money";
import { deleteRecurringAction, endRecurringAction } from "../actions";
import { RecurringForm } from "../recurring-form";

export const metadata: Metadata = { title: "Editar gasto fixo" };

export default async function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const [recurring, categories] = await Promise.all([findRecurring(userId, id), listCategories(userId)]);
  if (!recurring) notFound();
  const active = !recurring.endMonth || recurring.endMonth > currentMonth();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageHeader title="Editar gasto fixo" />
      <Card>
        <RecurringForm
          id={recurring.id}
          categories={categories}
          initial={{
            type: recurring.type,
            description: recurring.description,
            amountCents: centsToInput(recurring.amountCents),
            dayOfMonth: String(recurring.dayOfMonth),
            startMonth: recurring.startMonth,
            endMonth: recurring.endMonth ?? "",
            categoryId: recurring.categoryId ?? "",
            paymentMethod: recurring.paymentMethod ?? "",
          }}
        />
      </Card>
      <Card className="flex flex-col gap-3 text-body-md">
        {active && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-secondary">Parar de gerar a partir do próximo mês</span>
            <ConfirmButton action={endRecurringAction.bind(null, recurring.id)} label="Encerrar" size="sm" />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-secondary">
            Excluir o modelo (o histórico de lançamentos é mantido)
          </span>
          <ConfirmButton
            action={deleteRecurringAction.bind(null, recurring.id)}
            label="Excluir"
            confirmLabel="Excluir mesmo"
            size="sm"
          />
        </div>
      </Card>
    </div>
  );
}
