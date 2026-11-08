import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 text-base text-on-surface placeholder:text-secondary/60 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary aria-[invalid=true]:border-danger sm:text-body-md";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-20 py-2.5", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={htmlFor} className="text-label-md font-semibold text-on-surface">
        {label}
      </label>
      {children}
      {error?.length ? (
        <p className="text-body-sm text-danger">{error[0]}</p>
      ) : hint ? (
        <p className="text-body-sm text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({ ok, message }: { ok?: boolean; message?: string }) {
  if (!message) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={cn(
        "rounded-lg px-3 py-2 text-body-md",
        ok ? "bg-success-container text-success" : "bg-danger-container text-danger",
      )}
    >
      {message}
    </p>
  );
}
