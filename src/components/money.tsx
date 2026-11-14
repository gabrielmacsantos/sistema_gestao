import { formatBRL, formatBRLCompact } from "@/lib/money";

/** An amount that "Ocultar valores" can hide: see [data-money] in globals.css. */
export function Money({ cents, compact = false }: { cents: number; compact?: boolean }) {
  return <span data-money>{compact ? formatBRLCompact(cents) : formatBRL(cents)}</span>;
}
