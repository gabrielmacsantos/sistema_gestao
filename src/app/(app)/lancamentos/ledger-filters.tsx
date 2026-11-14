"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/form";

type Filters = {
  mes: string;
  tipo?: string;
  status?: string;
  categoria?: string;
  busca?: string;
};

/**
 * Search box (waits 300 ms after the last key before asking the server) and the status and
 * category filters, applied as soon as they change. Everything lives in the URL.
 */
export function LedgerFilters({
  filters,
  categories,
}: {
  filters: Filters;
  categories: { id: string; name: string; type: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(filters.busca ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(changes: Partial<Filters>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...changes })) if (value) next.set(key, value);
    // A new filter starts again from the first page.
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  return (
    <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
      <label className="relative col-span-full lg:col-span-1">
        <span className="sr-only">Buscar lançamentos</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
          aria-hidden
        />
        <Input
          type="search"
          value={text}
          onChange={(e) => {
            const value = e.target.value;
            setText(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply({ busca: value.trim() }), 300);
          }}
          placeholder="Buscar no extrato…"
          enterKeyHint="search"
          autoComplete="off"
          className="h-11 pl-9"
        />
      </label>
      <Select
        defaultValue={filters.status ?? ""}
        onChange={(e) => apply({ status: e.target.value })}
        aria-label="Status"
        className="h-11"
      >
        <option value="">Todos os status</option>
        <option value="pendentes">Pendentes</option>
      </Select>
      <Select
        defaultValue={filters.categoria ?? ""}
        onChange={(e) => apply({ categoria: e.target.value })}
        aria-label="Categoria"
        className="h-11"
      >
        <option value="">Todas as categorias</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.type === "EXPENSE" ? "despesa" : "receita"})
          </option>
        ))}
      </Select>
      <p className="sr-only" aria-live="polite">
        {pending ? "Buscando…" : ""}
      </p>
    </div>
  );
}
