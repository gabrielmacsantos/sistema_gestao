"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { formatBRL } from "@/lib/money";
import { REEL_SPINS, reelCell, reelChars } from "@/lib/reel";

const DIGITS = Array.from({ length: (REEL_SPINS + 1) * 10 }, (_, i) => i % 10);

const at = (cell: number) => `translateY(calc(var(--reel-cell) * -${cell}))`;

/** One digit: a strip of 0-9 cells that spins up and lands on `digit`. Spins on mount and on change. */
function Reel({ digit, order }: { digit: number; order: number }) {
  const strip = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = strip.current;
    const from = previous.current;
    previous.current = digit;
    if (!el || from === digit) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transition = "none";
      el.style.transform = at(reelCell(digit));
      return;
    }

    // Restart from the old digit (or 0 on first paint), then spin up to the new one.
    el.style.transition = "none";
    el.style.transform = at(from ?? 0);
    void el.offsetHeight;
    const stagger = Number.parseFloat(getComputedStyle(el).getPropertyValue("--reel-stagger")) || 0;
    el.style.transition = `transform var(--reel-dur) var(--reel-ease) ${order * stagger}ms`;
    el.style.transform = at(reelCell(digit));
  }, [digit, order]);

  return (
    <span className="t-reel-col">
      <span ref={strip} className="t-reel-strip" style={{ transform: at(reelCell(digit)) }}>
        {DIGITS.map((d, i) => (
          <span key={i} className="t-reel-digit">{d}</span>
        ))}
      </span>
    </span>
  );
}

/**
 * A BRL amount whose digits spin to the new value (transitions.dev "Spinning counter"). Takes integer
 * cents and shows exactly what `formatBRL` does, cents included. Marked data-money, so "Ocultar valores"
 * hides it; the text is also there for screen readers.
 */
export function AnimatedCurrency({
  cents,
  prefix = "",
  className,
}: {
  cents: number;
  /** Fixed text before the amount, e.g. "+ ". */
  prefix?: string;
  className?: string;
}) {
  const text = prefix + formatBRL(cents);
  // Not integer cents: show it as is, never rounded, and skip the animation.
  if (!Number.isSafeInteger(cents)) return <span data-money className={className}>{text}</span>;

  const chars = reelChars(text);
  let order = 0;
  return (
    <span data-money className={className}>
      <span className="sr-only">{text}</span>
      <span className="t-reel" aria-hidden style={{ "--reel-cell": "1.3em" } as CSSProperties}>
        {chars.map((c) =>
          c.digit === null ? (
            <span key={c.key} className="t-reel-char">{c.char}</span>
          ) : (
            <Reel key={c.key} digit={c.digit} order={order++} />
          ),
        )}
      </span>
    </span>
  );
}
