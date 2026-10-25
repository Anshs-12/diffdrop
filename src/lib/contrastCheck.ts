/** WCAG 2.x contrast checks, and the nearest text color that passes. */
import { contrast, parseColor, toHex, type Rgba } from './color';
import { oklchToRgba, toOklch } from './palette';

export const CHECKS = [
  { id: 'aa', label: 'AA normal text', min: 4.5 },
  { id: 'aa-large', label: 'AA large text', min: 3 },
  { id: 'aaa', label: 'AAA normal text', min: 7 },
  { id: 'aaa-large', label: 'AAA large text', min: 4.5 },
  { id: 'ui', label: 'UI components', min: 3 },
] as const;

export type CheckId = (typeof CHECKS)[number]['id'];

/**
 * WCAG compares the exact ratio with the threshold, so 4.499 fails AA.
 * The ratio is shown rounded down to two decimals, so it never reads as a pass when it isn’t.
 */
export function results(ratio: number): { id: CheckId; label: string; min: number; pass: boolean }[] {
  return CHECKS.map((c) => ({ ...c, pass: ratio >= c.min }));
}

/** Two decimals, rounded down (4.4999 → "4.49", never "4.50"). */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100 + 1e-9) / 100).toFixed(2);
}

/** Paint a translucent color over an opaque one. */
export function flatten(top: Rgba, under: Rgba): Rgba {
  const a = top.a;
  const ch = (t: number, u: number) => Math.round(t * a + u * (1 - a));
  return { r: ch(top.r, under.r), g: ch(top.g, under.g), b: ch(top.b, under.b), a: 1 };
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

export type Pair =
  | { ok: true; fg: Rgba; bg: Rgba; ratio: number; translucent: boolean }
  | { ok: false; which: 'text' | 'background' | 'both' };

/** Parse both colors; a translucent background is shown over white and translucent text over the background. */
export function checkPair(fgText: string, bgText: string): Pair {
  const f = parseColor(fgText);
  const b = parseColor(bgText);
  if (!f || !b) return { ok: false, which: !f && !b ? 'both' : !f ? 'text' : 'background' };
  const bg = b.a < 1 ? flatten(b, WHITE) : { ...b, a: 1 };
  const fg = f.a < 1 ? flatten(f, bg) : { ...f, a: 1 };
  return { ok: true, fg, bg, ratio: contrast(fg, bg), translucent: f.a < 1 || b.a < 1 };
}

/**
 * The passing text color closest to `fg`: same OKLCH hue and chroma (reduced
 * only if needed to stay in sRGB), with the lightness moved as little as
 * possible. Null when no lightness reaches the target on this background.
 */
export function suggestText(fg: Rgba, bg: Rgba, target: number): { color: Rgba; hex: string; ratio: number } | null {
  if (contrast(fg, bg) >= target) return null;
  const ok = toOklch(fg);
  let best: { color: Rgba; dl: number } | null = null;
  for (const dir of [1, -1]) {
    for (let i = 1; ; i++) {
      const l = Math.min(1, Math.max(0, ok.l + dir * i * 0.0025));
      const c = oklchToRgba({ l, c: ok.c, h: ok.h });
      if (contrast(c, bg) >= target) {
        const dl = Math.abs(l - ok.l);
        if (!best || dl < best.dl) best = { color: c, dl };
        break;
      }
      if (l === 0 || l === 1) break;
    }
  }
  if (!best) return null;
  return { color: best.color, hex: toHex(best.color), ratio: contrast(best.color, bg) };
}
