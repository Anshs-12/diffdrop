/** Color parsing, conversion (hex, RGB, HSL, HSV, CMYK, OKLCH), contrast and palettes. */

export interface Rgba {
  r: number; // 0–255
  g: number;
  b: number;
  a: number; // 0–1
}

const NAMED: Record<string, string> = {
  black: '000000', white: 'ffffff', red: 'ff0000', lime: '00ff00', blue: '0000ff', yellow: 'ffff00', cyan: '00ffff',
  aqua: '00ffff', magenta: 'ff00ff', fuchsia: 'ff00ff', silver: 'c0c0c0', gray: '808080', grey: '808080', maroon: '800000',
  olive: '808000', green: '008000', purple: '800080', teal: '008080', navy: '000080', orange: 'ffa500', pink: 'ffc0cb',
  brown: 'a52a2a', gold: 'ffd700', coral: 'ff7f50', crimson: 'dc143c', indigo: '4b0082', violet: 'ee82ee', tomato: 'ff6347',
  salmon: 'fa8072', khaki: 'f0e68c', orchid: 'da70d6', plum: 'dda0dd', tan: 'd2b48c', turquoise: '40e0d0', skyblue: '87ceeb',
  steelblue: '4682b4', slategray: '708090', lavender: 'e6e6fa', beige: 'f5f5dc', ivory: 'fffff0', mintcream: 'f5fffa',
  chocolate: 'd2691e', firebrick: 'b22222', forestgreen: '228b22', seagreen: '2e8b57', royalblue: '4169e1', hotpink: 'ff69b4',
  rebeccapurple: '663399', transparent: '00000000',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A CSS number or percentage: "50%" of `full`, or the plain number. */
function num(s: string, full: number): number {
  return s.endsWith('%') ? (parseFloat(s) / 100) * full : parseFloat(s);
}

function hueDeg(s: string): number {
  const v = parseFloat(s);
  if (s.endsWith('rad')) return (v * 180) / Math.PI;
  if (s.endsWith('turn')) return v * 360;
  if (s.endsWith('grad')) return v * 0.9;
  return v;
}

/** Parse any common CSS color: #rgb, #rrggbbaa, rgb(), hsl(), hwb(), oklch(), names. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(NAMED[s] ?? s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? Math.round((parseInt(h.slice(6, 8), 16) / 255) * 1000) / 1000 : 1,
    };
  }
  const fn = /^(rgba?|hsla?|hwb|oklch)\(\s*([^)]*)\)$/.exec(s);
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  if (parts.some((p) => !/^[-+]?(\d+\.?\d*|\.\d+)(%|deg|rad|turn|grad)?$/.test(p))) return null;
  const alpha = parts[3] != null ? clamp(num(parts[3], 1), 0, 1) : 1;
  const [p0, p1, p2] = parts as [string, string, string];
  switch (fn[1]) {
    case 'rgb':
    case 'rgba':
      return { r: clamp(Math.round(num(p0, 255)), 0, 255), g: clamp(Math.round(num(p1, 255)), 0, 255), b: clamp(Math.round(num(p2, 255)), 0, 255), a: alpha };
    case 'hsl':
    case 'hsla':
      return { ...hslToRgb(hueDeg(p0), clamp(num(p1, 100), 0, 100), clamp(num(p2, 100), 0, 100)), a: alpha };
    case 'hwb':
      return { ...hwbToRgb(hueDeg(p0), clamp(num(p1, 100), 0, 100), clamp(num(p2, 100), 0, 100)), a: alpha };
    case 'oklch':
      return { ...oklchToRgb(p0.endsWith('%') ? parseFloat(p0) / 100 : parseFloat(p0), num(p1, 0.4), hueDeg(p2)), a: alpha };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Conversions
// ─────────────────────────────────────────────────────────────

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = s / 100;
  const ll = l / 100;
  const f = (n: number) => {
    const k = (n + hh * 12) % 12;
    const a = ss * Math.min(ll, 1 - ll);
    return Math.round(255 * (ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return { r: f(0), g: f(8), b: f(4) };
}

function hwbToRgb(h: number, w: number, bl: number): { r: number; g: number; b: number } {
  const ww = w / 100;
  const bb = bl / 100;
  if (ww + bb >= 1) {
    const gray = Math.round((ww / (ww + bb)) * 255);
    return { r: gray, g: gray, b: gray };
  }
  const base = hslToRgb(h, 100, 50);
  const f = (c: number) => Math.round(((c / 255) * (1 - ww - bb) + ww) * 255);
  return { r: f(base.r), g: f(base.g), b: f(base.b) };
}

export function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function rgbToHsv({ r, g, b }: Rgba): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const { h } = rgbToHsl({ r, g, b, a: 1 });
  return { h, s: max ? ((max - min) / max) * 100 : 0, v: max * 100 };
}

export function rgbToCmyk({ r, g, b }: Rgba): { c: number; m: number; y: number; k: number } {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const f = (x: number) => ((1 - x / 255 - k) / (1 - k)) * 100;
  return { c: f(r), m: f(g), y: f(b), k: k * 100 };
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => Math.round(clamp(v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055, 0, 1) * 255);

/** OKLCH (perceptual lightness 0–1, chroma, hue°) from sRGB. */
export function rgbToOklch({ r, g, b }: Rgba): { l: number; c: number; h: number } {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  return { l: L, c: C, h: C < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function oklchToRgb(L: number, C: number, H: number): { r: number; g: number; b: number } {
  const a = C * Math.cos((H * Math.PI) / 180);
  const bb = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;
  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

// ─────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const r1 = (n: number) => Math.round(n * 10) / 10;

export function toHex(c: Rgba): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${c.a < 1 ? hex2(c.a * 255) : ''}`;
}

/** Every format, as CSS strings ready to copy. */
export function formats(c: Rgba): { label: string; value: string }[] {
  const { h, s, l } = rgbToHsl(c);
  const hsv = rgbToHsv(c);
  const cmyk = rgbToCmyk(c);
  const ok = rgbToOklch(c);
  const alpha = c.a < 1 ? ` / ${r1(c.a * 100) / 100}` : '';
  const name = Object.entries(NAMED).find(([, v]) => v === toHex(c).slice(1) && c.a === 1)?.[0];
  return [
    { label: 'HEX', value: toHex(c) },
    { label: 'RGB', value: `rgb(${c.r} ${c.g} ${c.b}${alpha})` },
    { label: 'HSL', value: `hsl(${r1(h)} ${r1(s)}% ${r1(l)}%${alpha})` },
    { label: 'HSV', value: `${r1(hsv.h)}°, ${r1(hsv.s)}%, ${r1(hsv.v)}%` },
    { label: 'OKLCH', value: `oklch(${r1(ok.l * 100)}% ${Math.round(ok.c * 1000) / 1000} ${r1(ok.h)}${alpha})` },
    { label: 'CMYK', value: `${Math.round(cmyk.c)}%, ${Math.round(cmyk.m)}%, ${Math.round(cmyk.y)}%, ${Math.round(cmyk.k)}%` },
    ...(name ? [{ label: 'Name', value: name }] : []),
  ];
}

// ─────────────────────────────────────────────────────────────
// Contrast and palettes
// ─────────────────────────────────────────────────────────────

/** WCAG 2 relative luminance. */
export function luminance(c: Rgba): number {
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
}

/** WCAG 2 contrast ratio (1–21). */
export function contrast(a: Rgba, b: Rgba): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

export function wcagLevel(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA large';
  return 'Fail';
}

/** Mix two colors in sRGB (t = share of `b`). */
function mix(a: Rgba, b: Rgba, t: number): Rgba {
  return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t), a: 1 };
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

/** Tints (toward white) and shades (toward black), lightest first, with the color in the middle. */
export function tintsAndShades(c: Rgba, steps = 5): Rgba[] {
  const base = { ...c, a: 1 };
  const tints = Array.from({ length: steps }, (_, i) => mix(base, WHITE, (steps - i) / (steps + 1)));
  const shades = Array.from({ length: steps }, (_, i) => mix(base, BLACK, (i + 1) / (steps + 1)));
  return [...tints, base, ...shades];
}

/** Color-wheel harmonies, rotating the hue in HSL. */
export function harmonies(c: Rgba): { name: string; colors: Rgba[] }[] {
  const { h, s, l } = rgbToHsl(c);
  const at = (deg: number) => ({ ...hslToRgb(h + deg, s, l), a: 1 });
  return [
    { name: 'Complementary', colors: [at(0), at(180)] },
    { name: 'Analogous', colors: [at(-30), at(0), at(30)] },
    { name: 'Triadic', colors: [at(0), at(120), at(240)] },
    { name: 'Split complementary', colors: [at(0), at(150), at(210)] },
    { name: 'Tetradic', colors: [at(0), at(90), at(180), at(270)] },
  ];
}

// ─────────────────────────────────────────────────────────────
// CSS gradients
// ─────────────────────────────────────────────────────────────

export interface GradientStop {
  color: string;
  /** Position in percent. */
  at: number;
}

export type GradientKind = 'linear' | 'radial' | 'conic';

export function gradientCss(kind: GradientKind, angle: number, stops: GradientStop[]): string {
  const list = [...stops].sort((a, b) => a.at - b.at).map((s) => `${s.color} ${Math.round(s.at)}%`).join(', ');
  if (kind === 'linear') return `linear-gradient(${Math.round(angle)}deg, ${list})`;
  if (kind === 'radial') return `radial-gradient(circle, ${list})`;
  return `conic-gradient(from ${Math.round(angle)}deg, ${list})`;
}
