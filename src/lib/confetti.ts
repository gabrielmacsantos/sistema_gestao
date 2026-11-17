// One burst of paper confetti from one point (client only). A fixed, full-screen canvas that ignores pointer events,
// lets the pieces fall by gravity and removes itself. It has no pointer or touch listeners at all: it never follows
// the cursor or the finger. The index.html version (burstConfetti) is the same engine.

export type BurstOptions = { x?: number; y?: number; count?: number; colors?: string[] };

const DURATION_MS = 3500;
const FADE_FROM_MS = 2200;
const MAX_PIECES = 140;
const COLOR_TOKENS = ["--color-primary", "--color-tertiary", "--color-success", "--color-warning", "--color-primary-fixed"];
const SHAPES = ["rect", "strip", "circle"] as const;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  vspin: number;
  flip: number;
  shape: (typeof SHAPES)[number];
  color: string;
};

let active: (() => void) | null = null;

function themeColors(): string[] {
  const css = getComputedStyle(document.documentElement);
  const colors = COLOR_TOKENS.map((token) => css.getPropertyValue(token).trim()).filter(Boolean);
  return colors.length > 0 ? colors : ["#00685f", "#4edea3", "#fbbf24", "#6bd8cb"];
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * Fires the burst and returns a function that stops it and removes the canvas (call it when the screen unmounts).
 * With "reduce motion" nothing is shown. The numbers here are visual physics, not money.
 */
export function burstConfetti({ x, y, count = 110, colors }: BurstOptions = {}): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  active?.();

  const canvas = document.createElement("canvas");
  canvas.id = "goal-confetti";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "65", width: "100%", height: "100%", pointerEvents: "none" });
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  document.body.appendChild(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.scale(dpr, dpr);

  const palette = colors && colors.length > 0 ? colors : themeColors();
  const ox = x ?? w / 2;
  const oy = y ?? h * 0.25;
  const pieces: Piece[] = Array.from({ length: Math.min(count, MAX_PIECES) }, () => {
    const angle = ((-90 + (Math.random() - 0.5) * 140) * Math.PI) / 180;
    const speed = 7 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      spin: Math.random() * Math.PI * 2,
      vspin: (Math.random() - 0.5) * 0.4,
      flip: Math.random() * Math.PI * 2,
      shape: pick(SHAPES),
      color: pick(palette),
    };
  });

  let raf = 0;
  const started = performance.now();
  let last = started;
  const stop = () => {
    cancelAnimationFrame(raf);
    canvas.remove();
    if (active === stop) active = null;
  };

  const frame = (now: number) => {
    const elapsed = now - started;
    const step = Math.min((now - last) / 16.67, 2.5);
    last = now;
    ctx.clearRect(0, 0, w, h);
    const fade = Math.min(Math.max(1 - (elapsed - FADE_FROM_MS) / (DURATION_MS - FADE_FROM_MS), 0), 1);
    let alive = 0;
    for (const p of pieces) {
      p.vx *= Math.pow(0.985, step);
      p.vy = p.vy * Math.pow(0.985, step) + 0.32 * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.spin += p.vspin * step;
      p.flip += 0.15 * step;
      if (p.y > h + 24) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.scale(1, Math.cos(p.flip)); // tumbling paper
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "strip") {
        ctx.fillRect(-p.size / 6, -p.size / 2, p.size / 3, p.size);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      }
      ctx.restore();
    }
    if (elapsed >= DURATION_MS || alive === 0) {
      stop();
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  active = stop;
  raf = requestAnimationFrame(frame);
  return stop;
}
