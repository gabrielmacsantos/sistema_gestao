import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { todayInput } from "@/lib/dates";
import { param, type SearchParams } from "@/lib/search-params";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Novo lançamento" };

export default async function NewTransactionPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireUserId();
  const type = param(await searchParams, "tipo") === "receita" ? "INCOME" : "EXPENSE";
  const categories = await listCategories(userId);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Novo lançamento" />
      <Card>
        <TransactionForm
          categories={categories}
          initial={{
            type,
            description: "",
            amountCents: "",
            date: todayInput(),
            status: "PAID",
            categoryId: "",
            paymentMethod: "",
            notes: "",
          }}
        />
      </Card>
    </div>
  );
}
