import { TZDate } from "@date-fns/tz";
import { addMonths as addMonthsFns, format, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TIME_ZONE = "America/Sao_Paulo";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidMonth(value: string | undefined | null): value is string {
  return !!value && MONTH_RE.test(value);
}

function inTz(date: Date): TZDate {
  return new TZDate(date.getTime(), TIME_ZONE);
}

/** "YYYY-MM" of the given instant in São Paulo. */
export function monthOf(date: Date): string {
  return format(inTz(date), "yyyy-MM");
}

export function currentMonth(now: Date = new Date()): string {
  return monthOf(now);
}

export function addMonths(month: string, amount: number): string {
  const [y, m] = month.split("-").map(Number);
  return format(addMonthsFns(new Date(y, m - 1, 1), amount), "yyyy-MM");
}

export function compareMonths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** UTC instants for [first day 00:00, next month first day 00:00) in São Paulo. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const start = new TZDate(y, m - 1, 1, TIME_ZONE);
  const end = new TZDate(y, m, 1, TIME_ZONE);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** Midnight in São Paulo of a calendar date. */
export function makeDate(year: number, month: number, day: number): Date {
  return new Date(new TZDate(year, month - 1, day, TIME_ZONE).getTime());
}

/** "YYYY-MM-DD" from a date <input> -> UTC instant of that day's midnight in São Paulo. */
export function parseDateInput(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = makeDate(y, m, d);
  return dateToInput(date) === value ? date : null;
}

export function dateToInput(date: Date): string {
  return format(inTz(date), "yyyy-MM-dd");
}

export function todayInput(now: Date = new Date()): string {
  return dateToInput(now);
}

export function formatDate(date: Date): string {
  return format(inTz(date), "dd/MM/yyyy");
}

/** "05 out" */
export function formatDayMonth(date: Date): string {
  return format(inTz(date), "dd MMM", { locale: ptBR });
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const label = format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthShort(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM/yy", { locale: ptBR });
}

/** Date of a recurring occurrence; the day is clamped to the month length (e.g. 31 -> 30). */
export function occurrenceDate(month: string, dayOfMonth: number): Date {
  const [y, m] = month.split("-").map(Number);
  const day = Math.min(dayOfMonth, getDaysInMonth(new Date(y, m - 1, 1)));
  return makeDate(y, m, day);
}
