"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { setStatusAction } from "./actions";

export function StatusToggle({
  id,
  status,
  type,
}: {
  id: string;
  status: "PAID" | "PENDING";
  type: "EXPENSE" | "INCOME";
}) {
  const [pending, startTransition] = useTransition();
  const paid = status === "PAID";
  const label = paid
    ? "Marcar como pendente"
    : type === "EXPENSE"
      ? "Marcar como pago"
      : "Marcar como recebido";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => startTransition(() => setStatusAction(id, paid ? "PENDING" : "PAID"))}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        paid
          ? "border-success bg-success text-white"
          : "border-outline-variant text-transparent hover:border-primary",
        pending && "opacity-50",
      )}
    >
      <Check className="size-4" aria-hidden />
    </button>
  );
}
