import type { Metadata } from "next";
import { CategoryBadge } from "@/components/category-badge";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { deleteCategoryAction } from "./actions";
import { CategoryForm } from "./category-form";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const userId = await requireUserId();
  const categories = await listCategories(userId);

  return (
    <>
      <PageHeader title="Categorias" />
      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle>Nova categoria</CardTitle>
          <CategoryForm />
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {(["EXPENSE", "INCOME"] as const).map((type) => (
            <Card key={type}>
              <CardTitle>{type === "EXPENSE" ? "Despesas" : "Receitas"}</CardTitle>
              <ul className="divide-y divide-surface-container-low">
                {categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                      <CategoryBadge name={c.name} color={c.color} />
                      <ConfirmButton
                        action={deleteCategoryAction.bind(null, c.id)}
                        label="Excluir"
                        size="sm"
                      />
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="text-body-sm text-secondary">
          Ao excluir uma categoria, os lançamentos dela ficam como &quot;Sem categoria&quot;.
        </p>
      </div>
    </>
  );
}
