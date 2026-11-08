import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { currentMonth } from "@/lib/dates";
import { RecurringForm } from "../recurring-form";

export const metadata: Metadata = { title: "Novo gasto fixo" };

export default async function NewRecurringPage() {
  const userId = await requireUserId();
  const categories = await listCategories(userId);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Novo gasto fixo" />
      <Card>
        <RecurringForm
          categories={categories}
          initial={{
            type: "EXPENSE",
            description: "",
            amountCents: "",
            dayOfMonth: "10",
            startMonth: currentMonth(),
            endMonth: "",
            categoryId: "",
            paymentMethod: "",
          }}
        />
      </Card>
    </div>
  );
}
