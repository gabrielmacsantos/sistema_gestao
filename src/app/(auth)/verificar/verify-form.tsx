"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { useErrorShake } from "@/components/ui/use-error-shake";
import type { ActionState } from "@/lib/validation";
import { resendCodeAction, verifyCodeAction } from "./actions";

export function VerifyForm({ maskedEmail }: { maskedEmail: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(verifyCodeAction, {});
  const [resent, resend, resending] = useActionState<ActionState, FormData>(resendCodeAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useErrorShake(formRef, state);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md text-secondary">
        Enviamos um código de 6 números para <strong className="text-on-surface">{maskedEmail}</strong>. Ele vale por
        10 minutos.
      </p>
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <FormMessage ok={state.ok} message={state.message} />
        <Field label="Código" htmlFor="code">
          <Input
            id="code"
            name="code"
            className="t-input text-center font-semibold tracking-[0.5em]"
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            aria-invalid={state.ok === false}
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Aguarde..." : "Confirmar"}
        </Button>
      </form>
      <form action={resend} className="flex flex-col gap-2">
        <FormMessage ok={resent.ok} message={resent.message} />
        <Button type="submit" variant="ghost" disabled={resending}>
          {resending ? "Enviando..." : "Reenviar código"}
        </Button>
      </form>
      <p className="text-center text-body-md text-secondary">
        <Link href="/login" className="font-medium text-primary">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
