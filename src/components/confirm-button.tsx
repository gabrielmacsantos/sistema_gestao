"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui/button";

/** Two-step destructive button: first click asks for confirmation, second runs the action. */
export function ConfirmButton({
  action,
  label,
  confirmLabel = "Confirmar",
  size = "md",
}: {
  action: () => Promise<unknown>;
  label: string;
  confirmLabel?: string;
  size?: "sm" | "md";
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="secondary" size={size} onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <Button
        variant="danger"
        size={size}
        disabled={pending}
        onClick={() => startTransition(async () => void (await action()))}
      >
        {pending ? "Aguarde..." : confirmLabel}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </span>
  );
}
