const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Short label for charts, e.g. "R$ 2,6 mil". */
export function formatBRLCompact(cents: number): string {
  return brlCompact.format(cents / 100);
}

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

/** 0.433 -> "43,3%". */
export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

/**
 * Parses user/document input into integer cents without float arithmetic.
 * Accepts "1.234,56", "1234,56", "1234.56", "R$ 12", "-3,5".
 */
export function parseMoneyToCents(input: string): number | null {
  let s = input.replace(/R\$|\s| /g, "").trim();
  if (!s) return null;

  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart: string;
  let decPart = "";

  if (lastComma > lastDot) {
    // Brazilian format: dots are thousand separators.
    intPart = s.slice(0, lastComma).replace(/\./g, "");
    decPart = s.slice(lastComma + 1);
  } else if (lastDot > lastComma) {
    const after = s.slice(lastDot + 1);
    const dotCount = s.split(".").length - 1;
    const head = s.slice(0, s.indexOf("."));
    if (lastComma === -1 && head !== "0" && head !== "" && (dotCount > 1 || after.length === 3)) {
      // "1.234" or "1.234.567" — thousand separators only.
      intPart = s.replace(/\./g, "");
    } else {
      intPart = s.slice(0, lastDot).replace(/,/g, "");
      decPart = after;
    }
  } else {
    intPart = s;
  }

  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart) || (!intPart && !decPart)) {
    return null;
  }
  if (decPart.length > 2) {
    // Round half up on the third decimal digit.
    const roundUp = Number(decPart[2]) >= 5;
    decPart = decPart.slice(0, 2);
    const cents = Number(intPart || "0") * 100 + Number(decPart) + (roundUp ? 1 : 0);
    return negative ? -cents : cents;
  }

  const cents = Number(intPart || "0") * 100 + Number(decPart.padEnd(2, "0"));
  return negative ? -cents : cents;
}

/** Value for a money <input>, e.g. 123456 -> "1234,56". */
export function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  const value = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${value}` : value;
}
