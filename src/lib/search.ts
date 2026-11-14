/** Pure text search for the ledger. The same code lives in index.html (block `// <ledger-search>`). */

export type Searchable = {
  description: string;
  amountCents: number;
  merchantName?: string | null;
  notes?: string | null;
  categoryName?: string | null;
};

/** Lowercase, without accents and repeated spaces: "Açaí  Bom" -> "acai bom". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** "45,90", "R$ 1.234,5" or "12" as integer cents; null when the term is not an amount. */
export function searchAmountCents(term: string): number | null {
  const m = /^(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(term.trim().toLowerCase());
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** Prepares the typed term once (words and amount); the returned test runs per entry. */
export function searchMatcher(query: string): (entry: Searchable) => boolean {
  const words = normalizeText(query).split(" ").filter(Boolean);
  const cents = searchAmountCents(query);
  if (!words.length) return () => true;
  return (entry) =>
    entry.amountCents === cents ||
    words.every((word) =>
      [entry.description, entry.merchantName, entry.notes, entry.categoryName].some(
        (t) => t && normalizeText(t).includes(word),
      ),
    );
}

/**
 * Whether an entry matches what was typed: every word appears in its description, place, notes
 * or category (ignoring case and accents), or the whole term is its amount ("45,90").
 */
export function matchesSearch(entry: Searchable, query: string): boolean {
  return searchMatcher(query)(entry);
}
