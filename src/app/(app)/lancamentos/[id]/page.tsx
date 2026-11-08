import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { findTransaction } from "@/server/repositories/transactions";
import { SOURCE_LABEL } from "@/lib/constants";
import { dateToInput } from "@/lib/dates";
import { centsToInput, formatBRL } from "@/lib/money";
import { deleteTransactionAction } from "../actions";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Editar lançamento" };

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const [transaction, categories] = await Promise.all([findTransaction(userId, id), listCategories(userId)]);
  if (!transaction) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageHeader
        title="Editar lançamento"
        action={
          <ConfirmButton
            action={deleteTransactionAction.bind(null, transaction.id)}
            label="Excluir"
            confirmLabel="Excluir mesmo"
            size="sm"
          />
        }
      />

      <Card>
        <p className="mb-4 text-body-sm text-secondary">
          Origem: {SOURCE_LABEL[transaction.source]}
          {transaction.merchantName && ` · ${transaction.merchantName}`}
          {transaction.merchantTaxId && ` · CNPJ/CPF ${transaction.merchantTaxId}`}
        </p>
        <TransactionForm
          id={transaction.id}
          categories={categories}
          initial={{
            type: transaction.type,
            description: transaction.description,
            amountCents: centsToInput(transaction.amountCents),
            date: dateToInput(transaction.date),
            status: transaction.status === "PENDING" ? "PENDING" : "PAID",
            categoryId: transaction.categoryId ?? "",
            paymentMethod: transaction.paymentMethod ?? "",
            notes: transaction.notes ?? "",
          }}
        />
      </Card>

      {transaction.items.length > 0 && (
        <Card>
          <CardTitle>Itens da nota</CardTitle>
          <ul className="divide-y divide-surface-container-low text-body-md">
            {transaction.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate">{item.description}</span>
                  <span className="text-body-sm text-secondary">
                    {item.quantity.toLocaleString("pt-BR")} {item.unit ?? "un"}
                    {item.unitPriceCents !== null && ` × ${formatBRL(item.unitPriceCents)}`}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatBRL(item.totalCents)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {transaction.attachment && (
        <Card>
          <CardTitle>Comprovante</CardTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- private file served by an authenticated route */}
          <img
            src={`/api/anexos/${transaction.attachment}`}
            alt="Foto do comprovante"
            className="max-h-[32rem] w-full rounded-lg object-contain"
          />
        </Card>
      )}
    </div>
  );
}
