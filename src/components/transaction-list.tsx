import type { ReactNode } from "react";
import Link from "next/link";
import { Banknote, CalendarSync, Paperclip, ReceiptText, ShoppingBag } from "lucide-react";
import type { listTransactions } from "@/server/repositories/transactions";
import { SOURCE_LABEL } from "@/lib/constants";
import { formatDayMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CategoryBadge } from "./category-badge";
import { StatusBadge } from "./ui/card";

type Row = Awaited<ReturnType<typeof listTransactions>>[number];

function subtitle(t: Row) {
  return t.merchantName ?? (t.recurringId ? SOURCE_LABEL.RECURRING : SOURCE_LABEL[t.source]);
}

/** 36px round wash with an icon that hints the origin; tinted with the category color. */
function RowIcon({ t }: { t: Row }) {
  const Icon =
    t.type === "INCOME" ? Banknote : t.recurringId ? CalendarSync : t.source === "MANUAL" ? ShoppingBag : ReceiptText;
  const color = t.type === "INCOME" ? "var(--color-success)" : (t.category?.color ?? "var(--color-secondary)");
  return (
    <span
      className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ color }}
      aria-hidden
    >
      <span className="absolute inset-0 bg-current opacity-12" />
      <Icon className="relative size-[18px]" />
    </span>
  );
}

function Amount({ t, className }: { t: Row; className?: string }) {
  return (
    <span
      className={cn(
        "text-numeric-data whitespace-nowrap tabular-nums",
        t.type === "INCOME" ? "text-success" : "text-on-surface",
        className,
      )}
    >
      {t.type === "INCOME" ? "+ " : "− "}
      {formatBRL(t.amountCents)}
    </span>
  );
}

function Receipt({ t }: { t: Row }) {
  if (!t.attachment) {
    return <span className="text-body-sm text-outline-variant italic">Sem anexo</span>;
  }
  return (
    <a
      href={`/api/anexos/${t.attachment}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2 py-1 text-label-sm text-primary transition-colors hover:border-primary"
    >
      <Paperclip className="size-3.5" aria-hidden /> comprovante
    </a>
  );
}

/**
 * Ledger: a table from md (56px rows) and a compact list on phones (64px rows).
 * `leading` renders an optional control (e.g. the paid toggle) before each row.
 */
export function TransactionList({ rows, leading }: { rows: Row[]; leading?: (t: Row) => ReactNode }) {
  return (
    <>
      <ul className="divide-y divide-surface-container-low md:hidden">
        {rows.map((t) => (
          <li key={t.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            {leading?.(t)}
            <Link href={`/lancamentos/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              {!leading && <RowIcon t={t} />}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-label-lg text-on-surface">{t.description}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-secondary">
                  {formatDayMonth(t.date)}
                  {t.status === "PENDING" && <StatusBadge status={t.status} type={t.type} />}
                  {t.attachment && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-1.5 text-label-sm text-primary">
                      <Paperclip className="size-3" aria-hidden /> anexo
                    </span>
                  )}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Amount t={t} />
                {t.category && <span className="text-label-sm text-secondary">{t.category.name}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-surface text-label-sm text-secondary uppercase">
              {leading && <th className="w-12 py-3 pl-4" aria-label="Pago" />}
              <th className="px-4 py-3 font-semibold">Descrição</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell">Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.id}
                className={cn(
                  "h-14 border-b border-surface-container-low transition-colors last:border-0 hover:bg-surface",
                  t.type === "INCOME" && "bg-success-container/40",
                )}
              >
                {leading && <td className="py-2 pl-4">{leading(t)}</td>}
                <td className="px-4 py-2">
                  <Link href={`/lancamentos/${t.id}`} className="flex min-w-0 items-center gap-3">
                    <RowIcon t={t} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-label-lg text-on-surface hover:text-primary">
                        {t.description}
                      </span>
                      <span className="truncate text-label-sm font-medium text-secondary normal-case">
                        {subtitle(t)}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {t.category ? (
                    <CategoryBadge name={t.category.name} color={t.category.color} />
                  ) : (
                    <span className="text-body-sm text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-body-md whitespace-nowrap text-on-surface-variant">
                  {formatDayMonth(t.date)}
                </td>
                <td className="px-4 py-2 text-right">
                  <Amount t={t} />
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={t.status} type={t.type} />
                </td>
                <td className="hidden px-4 py-2 lg:table-cell">
                  <Receipt t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
