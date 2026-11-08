"use client";

import { useCallback, useState, useTransition } from "react";
import { FormMessage } from "@/components/ui/form";
import type { CategoryOption } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TransactionDraft } from "@/lib/validation";
import { readNfceAction, readReceiptAction, readStatementAction, type ImportResult } from "./actions";
import { DraftReview } from "./draft-review";
import { NfceTab } from "./nfce-tab";
import { ReceiptTab, StatementTab } from "./upload-tabs";

const TABS = [
  { id: "nfce", label: "QR Code NFC-e" },
  { id: "foto", label: "Foto do cupom" },
  { id: "extrato", label: "Extrato" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ImportClient({
  categories,
  photoEnabled,
}: {
  categories: CategoryOption[];
  photoEnabled: boolean;
}) {
  const [tab, setTab] = useState<TabId>("nfce");
  const [drafts, setDrafts] = useState<TransactionDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const run = useCallback((fn: () => Promise<ImportResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.drafts) setDrafts(result.drafts);
      else setError(result.error);
    });
  }, []);

  const onQr = useCallback((text: string) => run(() => readNfceAction(text)), [run]);

  if (drafts) {
    return <DraftReview drafts={drafts} categories={categories} onCancel={() => setDrafts(null)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setError(null); }}
            className={cn(
              "rounded-md py-2 text-body-sm font-medium sm:text-body-md",
              tab === t.id
                ? "bg-surface-container-lowest shadow-sm"
                : "text-secondary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-4">
        {tab === "nfce" && <NfceTab onQr={onQr} busy={busy} />}
        {tab === "foto" &&
          (photoEnabled ? (
            <ReceiptTab onPhoto={(data) => run(() => readReceiptAction(data))} busy={busy} />
          ) : (
            <p className="text-body-md text-secondary">
              A leitura de fotos precisa de uma chave da Claude API. Defina <code>ANTHROPIC_API_KEY</code> no
              arquivo <code>.env</code> e reinicie o servidor.
            </p>
          ))}
        {tab === "extrato" && <StatementTab onFile={(data) => run(() => readStatementAction(data))} busy={busy} />}
      </div>

      {busy && <p className="text-body-md text-secondary">Processando...</p>}
      {error && <FormMessage ok={false} message={error} />}
    </div>
  );
}
