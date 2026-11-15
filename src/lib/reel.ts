/** Full turns a digit reel makes before it lands on the target digit. */
export const REEL_SPINS = 1;

export type ReelChar = {
  /** Position counted from the end, so a digit keeps its reel when the number grows ("999,99" -> "1.000,00"). */
  key: number;
  char: string;
  digit: number | null;
};

/** Splits an already formatted amount ("R$ 1.250,45") into reels (digits) and fixed characters. */
export function reelChars(text: string): ReelChar[] {
  const chars = Array.from(text);
  return chars.map((char, i) => ({
    key: chars.length - 1 - i,
    char,
    digit: /^[0-9]$/.test(char) ? Number(char) : null,
  }));
}

/** Cells the strip moves up (0-9 repeated REEL_SPINS + 1 times) to show `digit` after `spins` turns. */
export function reelCell(digit: number, spins = REEL_SPINS): number {
  return spins * 10 + digit;
}
