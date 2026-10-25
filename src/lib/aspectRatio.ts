/** Aspect ratios: simplify, solve for a missing side, and common sizes. */

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export const PRESETS = ['16:9', '4:3', '1:1', '21:9', '9:16', '3:2', '4:5'] as const;

/** Ratios people use by name, for "close to" hints. */
const NAMED = [
  [16, 9], [4, 3], [1, 1], [21, 9], [9, 16], [3, 2], [2, 3], [4, 5], [5, 4], [16, 10], [3, 4], [2, 1], [1.85, 1], [2.39, 1],
] as const;

export type Simplified =
  | { ok: true; w: number; h: number; decimal: number; near: string | null }
  | { ok: false; message: string };

const MAX = 1e9;

/** A dimension as typed: a positive number, or the reason it isn’t one. */
export function parseSide(text: string): number | string {
  const t = text.trim();
  if (!t) return 'empty';
  if (!/^\d+(\.\d+)?$/.test(t)) return 'Use a positive number, like 1920';
  const n = Number(t);
  if (n <= 0) return 'Use a number above 0';
  if (n > MAX) return 'That number is too large';
  return n;
}

/** Whole numbers with no common factor: 1920 × 1080 → 16:9. Decimals are scaled up first (1.5 × 1 → 3:2). */
export function simplify(width: number, height: number): Simplified {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return { ok: false, message: 'Width and height must be above 0' };
  let w = width;
  let h = height;
  let scale = 1;
  while ((!Number.isInteger(w * scale) || !Number.isInteger(h * scale)) && scale < 1e6) scale *= 10;
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  const g = gcd(w, h);
  const sw = w / g;
  const sh = h / g;
  const decimal = width / height;
  return { ok: true, w: sw, h: sh, decimal, near: nearName(sw, sh, decimal) };
}

/** Named ratios within 2.5% of this one, closest first, when the exact ratio isn’t itself a familiar one. */
function nearName(w: number, h: number, decimal: number): string | null {
  const hits: { name: string; err: number }[] = [];
  for (const [a, b] of NAMED) {
    if (a === w && b === h) return null;
    const err = Math.abs(a / b - decimal) / (a / b);
    if (err < 0.025) hits.push({ name: `${a}:${b}`, err });
  }
  return hits.length ? hits.sort((x, y) => x.err - y.err).map((x) => x.name).join(' or ') : null;
}

/** "16:9", "16/9", "16x9", "1.85:1" or "2.39" → [w, h]. */
export function parseRatio(text: string): [number, number] | null {
  const t = text.trim();
  const m = /^(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)$/i.exec(t);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return a > 0 && b > 0 ? [a, b] : null;
  }
  if (/^\d+(\.\d+)?$/.test(t) && Number(t) > 0) return [Number(t), 1];
  return null;
}

/** The other side for a ratio: width from height, or height from width. Exact value plus a whole-pixel one. */
export function solve(ratio: [number, number], known: 'width' | 'height', value: number): { exact: number; rounded: number } {
  const [rw, rh] = ratio;
  const exact = known === 'width' ? (value * rh) / rw : (value * rw) / rh;
  return { exact, rounded: Math.round(exact) };
}

/** Common screen and media sizes. */
const SIZES: { w: number; h: number; label: string }[] = [
  { w: 640, h: 360, label: 'nHD' },
  { w: 854, h: 480, label: '480p' },
  { w: 1280, h: 720, label: '720p HD' },
  { w: 1920, h: 1080, label: '1080p Full HD' },
  { w: 2560, h: 1440, label: '1440p QHD' },
  { w: 3840, h: 2160, label: '4K UHD' },
  { w: 7680, h: 4320, label: '8K UHD' },
  { w: 640, h: 480, label: 'VGA' },
  { w: 800, h: 600, label: 'SVGA' },
  { w: 1024, h: 768, label: 'XGA' },
  { w: 1600, h: 1200, label: 'UXGA' },
  { w: 2048, h: 1536, label: 'QXGA' },
  { w: 1080, h: 1080, label: 'Square post' },
  { w: 512, h: 512, label: 'Icon' },
  { w: 2048, h: 2048, label: 'Large square' },
  { w: 2560, h: 1080, label: 'Ultrawide FHD' },
  { w: 3440, h: 1440, label: 'Ultrawide QHD' },
  { w: 5120, h: 2160, label: 'Ultrawide 5K' },
  { w: 720, h: 1280, label: 'Vertical 720p' },
  { w: 1080, h: 1920, label: 'Vertical 1080p, stories' },
  { w: 1080, h: 720, label: '3:2 photo' },
  { w: 1500, h: 1000, label: '3:2 photo' },
  { w: 3000, h: 2000, label: '6 MP' },
  { w: 6000, h: 4000, label: '24 MP' },
  { w: 1080, h: 1350, label: 'Portrait post' },
  { w: 1280, h: 1024, label: 'SXGA' },
  { w: 1280, h: 800, label: 'WXGA' },
  { w: 1440, h: 900, label: 'WXGA+' },
  { w: 1920, h: 1200, label: 'WUXGA' },
  { w: 2560, h: 1600, label: 'WQXGA' },
  { w: 1200, h: 630, label: 'Link preview image' },
];

export interface SizeRow {
  w: number;
  h: number;
  label: string;
  /** False when the size is only close to the ratio (2560 × 1080 is sold as 21:9 but is 64:27). */
  exact: boolean;
}

/** Known sizes at (or within 3% of) the ratio; if there are none, sizes from common widths. */
export function commonSizes(ratio: [number, number]): SizeRow[] {
  const r = ratio[0] / ratio[1];
  const rows = SIZES.map((s) => ({ ...s, err: Math.abs(s.w / s.h - r) / r }))
    .filter((s) => s.err < 0.03)
    .map(({ w, h, label, err }) => ({ w, h, label, exact: err < 1e-9 }))
    .sort((a, b) => a.w * a.h - b.w * b.h);
  if (rows.length) return rows;
  const out: SizeRow[] = [];
  const widths = r >= 1 ? [640, 1280, 1920, 2560, 3840] : [360, 720, 1080, 1440, 2160];
  for (const w of widths) {
    const h = (w * ratio[1]) / ratio[0];
    out.push({ w, h: Math.round(h), label: '', exact: Number.isInteger(h) });
  }
  return out;
}
