"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { useErrorShake } from "@/components/ui/use-error-shake";
import type { ActionState } from "@/lib/validation";
import { loginAction, signupAction } from "./actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    mode === "login" ? loginAction : signupAction,
    {},
  );
  const errors = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useErrorShake(formRef, state);
  // A refusal of the whole form (wrong password) marks the credentials fields, not just a message.
  const refused = state.ok === false && !state.fieldErrors;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <FormMessage ok={state.ok} message={state.fieldErrors ? undefined : state.message} />
      {mode === "signup" && (
        <Field label="Nome" htmlFor="name" error={errors.name}>
          <Input
            id="name"
            name="name"
            className="t-input"
            placeholder="Seu nome"
            autoComplete="name"
            defaultValue={state.values?.name}
            aria-invalid={!!errors.name}
            required
          />
        </Field>
      )}
      <Field label="E-mail" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          className="t-input"
          placeholder="voce@exemplo.com"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email}
          aria-invalid={!!errors.email || refused}
          required
        />
      </Field>
      <Field
        label="Senha"
        htmlFor="password"
        error={errors.password}
        hint={mode === "signup" ? "Mínimo de 8 caracteres" : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          className="t-input"
          placeholder={mode === "login" ? "Sua senha" : "Crie uma senha"}
          aria-invalid={!!errors.password || refused}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
      <p className="text-center text-body-md text-secondary">
        {mode === "login" ? (
          <>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-primary">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
