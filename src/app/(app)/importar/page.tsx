import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth";
import { listCategories } from "@/server/repositories/categories";
import { ImportClient } from "./import-client";

export const metadata: Metadata = { title: "Importar" };

export default async function ImportPage() {
  const userId = await requireUserId();
  const categories = await listCategories(userId);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Importar" />
      <ImportClient categories={categories} photoEnabled={!!process.env.ANTHROPIC_API_KEY} />
    </div>
  );
}
