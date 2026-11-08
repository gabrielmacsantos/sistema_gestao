import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonthLabel } from "@/lib/dates";

/** Prev/next month links that keep the other query params. */
export function MonthPicker({
  month,
  basePath,
  params = {},
}: {
  month: string;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const href = (m: string) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) query.set(k, v);
    query.set("mes", m);
    return `${basePath}?${query}`;
  };
  const linkClass =
    "flex size-9 items-center justify-center rounded-lg text-secondary hover:bg-surface-container-low hover:text-on-surface";

  return (
    <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-container-lowest p-0.5">
      <Link href={href(addMonths(month, -1))} className={linkClass} aria-label="Mês anterior">
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <span className="min-w-36 text-center text-label-lg text-on-surface">{formatMonthLabel(month)}</span>
      <Link href={href(addMonths(month, 1))} className={linkClass} aria-label="Próximo mês">
        <ChevronRight className="size-5" aria-hidden />
      </Link>
    </div>
  );
}
