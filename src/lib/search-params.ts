import { currentMonth, isValidMonth } from "./dates";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

/** `?mes=YYYY-MM`, defaulting to the current month. */
export function monthParam(params: Record<string, string | string[] | undefined>): string {
  const value = param(params, "mes");
  return isValidMonth(value) ? value : currentMonth();
}
