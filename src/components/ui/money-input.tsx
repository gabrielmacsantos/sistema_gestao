"use client";

import { useState, type InputHTMLAttributes } from "react";
import { formatCentsInput, maskMoneyInput, MONEY_MASK_MAX_DIGITS, parseMoneyToCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Input } from "./form";

const MAX_CENTS = 10 ** MONEY_MASK_MAX_DIGITS - 1;

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
  /** Starting text, in any format parseMoneyToCents reads ("1234,56", "52,30"). */
  defaultValue?: string;
  /** Controlled text; pair it with onValueChange. */
  value?: string;
  onValueChange?: (text: string) => void;
  /** Lets "-" mean a withdrawal. */
  negative?: boolean;
  /** Shows "R$" inside the field. */
  showCurrency?: boolean;
};

/**
 * Amount field with the card-machine mask: the digits typed are the cents ("5230" shows 52,30).
 * The form sends the shown text, which parseMoneyToCents reads back to the same integer cents.
 */
export function MoneyInput({
  defaultValue = "",
  value,
  onValueChange,
  negative = false,
  showCurrency = true,
  className,
  ...props
}: Props) {
  const mask = (text: string) => maskMoneyInput(text, { negative }).text;
  const [own, setOwn] = useState(() => mask(defaultValue));
  const text = value === undefined ? own : mask(value);
  const change = (next: string) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const input = (
    <Input
      {...props}
      inputMode={negative ? "text" : "numeric"}
      autoComplete="off"
      value={text}
      onChange={(e) => change(mask(e.target.value))}
      onPaste={(e) => {
        // A pasted amount is read as written ("50" is R$ 50,00), not digit by digit.
        const cents = parseMoneyToCents(e.clipboardData.getData("text"));
        if (cents === null) return;
        e.preventDefault();
        const sign = cents < 0 && negative ? "-" : "";
        change(cents ? `${sign}${formatCentsInput(Math.min(Math.abs(cents), MAX_CENTS))}` : "");
      }}
      className={cn("tabular-nums", showCurrency && "pl-10", className)}
    />
  );
  if (!showCurrency) return input;
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-secondary"
        aria-hidden
      >
        R$
      </span>
      {input}
    </div>
  );
}
