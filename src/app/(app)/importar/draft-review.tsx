"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Select } from "@/components/ui/form";
import { type CategoryOption } from "@/lib/constants";
import { centsToInput, formatBRL, parseMoneyToCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ConfirmedDraft, TransactionDraft } from "@/lib/validation";
import { confirmImportAction } from "./actions";

type Row = {
  draft: TransactionDraft;
  include: boolean;
  type: "EXPENSE" | "INCOME";
  description: string;
  amount: string;
  date: string;
  categoryId: string;
};

const toRow = (draft: TransactionDraft): Row => ({
  draft,
  include: !draft.duplicate,
  type: draft.type,
  description: draft.description,
  amount: draft.amountCents ? centsToInput(draft.amountCents) : "",
  date: draft.date ?? "",
  categoryId: "",
});

/** Single review screen shared by every import source. Nothing is saved until the user confirms. */
export function DraftReview({
  drafts,
  categories,
  onCancel,
}: {
  drafts: TransactionDraft[];
  categories: CategoryOption[];
  onCancel: () => void;
}) {
  const [rows, setRows] = useState(() => drafts.map(toRow));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const single = rows.length === 1;
  const selected = rows.filter((r) => r.include);
  const duplicates = rows.filter((r) => r.draft.duplicate).length;

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  function confirm() {
    setError(null);
    const payload: Array<ConfirmedDraft | Record<string, unknown>> = selected.map((r) => ({
      source: r.draft.source,
      type: r.type,
      description: r.description,
      amountCents: parseMoneyToCents(r.amount) ?? 0,
      date: r.date,
      categoryId: r.categoryId || null,
      paymentMethod: r.draft.paymentMethod,
      merchantName: r.draft.merchantName,
      merchantTaxId: r.draft.merchantTaxId,
      externalId: r.draft.externalId,
      attachment: r.draft.attachment,
      items: r.draft.items,
    }));
    startTransition(async () => {
      const result = await confirmImportAction(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Confira antes de salvar</h2>
        <p className="text-body-md text-secondary">
          {single
            ? "Revise os dados lidos e corrija o que for preciso."
            : `${rows.length} lançamentos encontrados${duplicates ? `, ${duplicates} já importados (desmarcados)` : ""}.`}
        </p>
      </div>

      {!single && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: true })))}>
            Marcar todos
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: false })))}>
            Desmarcar todos
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => {
          const options = categories.filter((c) => c.type === row.type);
          return (
            <li
              key={i}
              className={cn(
                "rounded-2xl border border-hairline bg-surface-container-lowest p-3",
                !row.include && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                {!single && (
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => update(i, { include: e.target.checked })}
                    className="mt-3 size-5 accent-primary"
                    aria-label={`Importar ${row.description || "lançamento"}`}
                  />
                )}
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_8rem_9.5rem_9rem_10rem]">
                  <Input
                    aria-label="Descrição"
                    value={row.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Descrição"
                    className="col-span-2 sm:col-span-1"
                  />
                  <Input
                    aria-label="Valor"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => update(i, { amount: e.target.value })}
                    placeholder="0,00"
                  />
                  <Input
                    aria-label="Data"
                    type="date"
                    value={row.date}
                    onChange={(e) => update(i, { date: e.target.value })}
                  />
                  <Select
                    aria-label="Tipo"
                    value={row.type}
                    onChange={(e) => update(i, { type: e.target.value as Row["type"], categoryId: "" })}
                  >
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Receita</option>
                  </Select>
                  <Select
                    aria-label="Categoria"
                    value={row.categoryId}
                    onChange={(e) => update(i, { categoryId: e.target.value })}
                  >
                    <option value="">Sem categoria</option>
                    {options.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {(row.draft.duplicate || row.draft.warnings.length > 0) && (
                <ul className="mt-2 flex flex-col gap-1 text-body-sm text-warning">
                  {row.draft.duplicate && (
                    <li className="flex gap-1">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> Já importado antes. Se marcar, será ignorado.
                    </li>
                  )}
                  {row.draft.warnings.map((w) => (
                    <li key={w} className="flex gap-1">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> {w}
                    </li>
                  ))}
                </ul>
              )}

              {(row.draft.merchantName || row.draft.paymentMethod) && (
                <p className="mt-2 text-body-sm text-secondary">
                  {[row.draft.merchantName, row.draft.merchantTaxId && `CNPJ ${row.draft.merchantTaxId}`, row.draft.paymentMethod]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              {row.draft.items.length > 0 && (
                <details className="mt-2 text-body-md">
                  <summary className="cursor-pointer text-body-sm font-medium text-secondary">
                    {row.draft.items.length} itens
                  </summary>
                  <ul className="mt-1 divide-y divide-surface-container-low">
                    {row.draft.items.map((item, j) => (
                      <li key={j} className="flex justify-between gap-2 py-1 text-body-sm">
                        <span className="truncate">
                          {item.quantity.toLocaleString("pt-BR")} × {item.description}
                        </span>
                        <span className="shrink-0 tabular-nums">{formatBRL(item.totalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {error && <FormMessage ok={false} message={error} />}

      <div className="sticky bottom-20 flex gap-2 rounded-xl bg-surface py-2 backdrop-blur md:bottom-0">
        <Button onClick={confirm} disabled={pending || selected.length === 0} className="flex-1 sm:flex-none">
          {pending ? "Salvando..." : single ? "Salvar lançamento" : `Salvar ${selected.length} lançamentos`}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
