"use client";

import { useId, useLayoutEffect, useRef, type CSSProperties } from "react";
import { formatBRL } from "@/lib/money";
import { REEL_SPINS, reelCell, reelChars } from "@/lib/reel";

const DIGITS = Array.from({ length: (REEL_SPINS + 1) * 10 }, (_, i) => i % 10);

const at = (cell: number) => `translateY(calc(var(--reel-cell) * -${cell}))`;

function cssNumber(style: CSSStyleDeclaration, name: string): number {
  const n = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(n) ? n : 0;
}

/** One digit: a strip of 0-9 cells that spins up and lands on `digit`. Spins on mount and on change. */
function Reel({ digit, order }: { digit: number; order: number }) {
  const strip = useRef<HTMLSpanElement>(null);
  const blur = useRef<SVGFEGaussianBlurElement>(null);
  const previous = useRef<number | null>(null);
  const filterId = useId();

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
    const css = getComputedStyle(el);
    const duration = cssNumber(css, "--reel-dur");
    const delay = order * cssNumber(css, "--reel-stagger");
    const spinBlur = cssNumber(css, "--reel-spin-blur");
    el.style.transition = `transform var(--reel-dur) var(--reel-ease) ${delay}ms`;
    el.style.transform = at(reelCell(digit));
    el.style.filter = `url(#${CSS.escape(filterId)})`;

    // Vertical-only blur (CSS blur() would smear sideways), decaying as this reel settles.
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start - delay) / duration, 0), 1);
      blur.current?.setAttribute("stdDeviation", `0 ${(spinBlur * (1 - t) ** 2).toFixed(2)}`);
      if (t < 1) raf = requestAnimationFrame(tick);
      else el.style.filter = "";
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.style.filter = "";
    };
  }, [digit, order, filterId]);

  return (
    <span className="t-reel-col">
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter id={filterId} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur ref={blur} stdDeviation="0 0" />
        </filter>
      </svg>
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
