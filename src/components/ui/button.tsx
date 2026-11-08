import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "income" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-sm hover:bg-primary-container active:scale-[0.99] disabled:opacity-60",
  income: "bg-tertiary text-on-tertiary shadow-sm hover:bg-tertiary-container active:scale-[0.99] disabled:opacity-60",
  secondary:
    "border border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low disabled:opacity-60",
  ghost: "text-secondary hover:bg-surface-container-low hover:text-on-surface",
  danger: "bg-danger/10 text-danger hover:bg-danger hover:text-white disabled:opacity-60",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-label-md",
  md: "h-11 px-4 text-label-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
