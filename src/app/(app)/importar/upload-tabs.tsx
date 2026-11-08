"use client";

import { useState } from "react";
import { Camera, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resizeForUpload } from "./image";

export function ReceiptTab({ onPhoto, busy }: { onPhoto: (data: FormData) => void; busy: boolean }) {
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const resized = await resizeForUpload(file);
      const data = new FormData();
      data.set("photo", resized);
      onPhoto(data);
    } catch {
      setError("Não foi possível abrir essa imagem. Tente uma foto em JPG ou PNG.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md text-secondary">
        Tire uma foto do cupom ou recibo. Uma IA lê os dados e você confere antes de salvar. A foto
        fica guardada como comprovante.
      </p>
      <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-label-lg text-on-primary shadow-sm hover:bg-primary-container sm:self-start">
        <Camera className="size-4" aria-hidden /> {busy ? "Lendo a foto..." : "Tirar ou escolher foto"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </label>
      <p className="text-body-sm text-secondary">
        Dica: fotografe o cupom inteiro, esticado e com boa luz. A imagem é enviada à Claude API
        (Anthropic) só para a leitura.
      </p>
      {error && <p className="text-body-md text-danger">{error}</p>}
    </div>
  );
}

export function StatementTab({ onFile, busy }: { onFile: (data: FormData) => void; busy: boolean }) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onFile(new FormData(e.currentTarget));
      }}
    >
      <p className="text-body-md text-secondary">
        Importe o extrato do banco ou a fatura do cartão em OFX (recomendado) ou CSV. Lançamentos já
        importados são detectados e não se repetem.
      </p>
      <input
        type="file"
        name="statement"
        accept=".ofx,.qfx,.csv,text/csv"
        required
        className="text-body-md file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-surface-container file:px-4 file:text-body-md file:font-medium"
      />
      <fieldset className="flex flex-col gap-2 text-body-md">
        <legend className="mb-1 font-medium">Para CSV: como os valores aparecem?</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="signMode" value="negative-expense" defaultChecked /> Gastos negativos
          (extrato de conta)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="signMode" value="positive-expense" /> Gastos positivos (fatura de
          cartão)
        </label>
      </fieldset>
      <Button type="submit" disabled={busy} className="sm:self-start">
        <FileUp className="size-4" aria-hidden /> {busy ? "Lendo arquivo..." : "Ler arquivo"}
      </Button>
    </form>
  );
}
