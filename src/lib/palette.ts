/** Palettes built from one color in OKLCH, so lightness steps look even to the eye. */
import { rgbToOklch, toHex, type Rgba } from './color';

export interface Oklch {
  l: number; // 0–1
  c: number;
  h: number; // degrees
}

const fromLinear = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/** OKLCH to gamma-encoded sRGB channels (0–1), unclamped: values outside 0–1 are out of gamut. */
function oklchToSrgb({ l: L, c: C, h: H }: Oklch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const EPS = 0.0005;
const inGamut = (rgb: number[]) => rgb.every((v) => v >= -EPS && v <= 1 + EPS);

/**
 * The sRGB color for an OKLCH value. Colors outside sRGB keep their lightness
 * and hue and lose chroma until they fit (the way CSS maps them).
 */
export function oklchToRgba(color: Oklch): Rgba {
  const l = Math.min(1, Math.max(0, color.l));
  let c = Math.max(0, color.c);
  let rgb = oklchToSrgb({ l, c, h: color.h });
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToSrgb({ l, c: mid, h: color.h }))) lo = mid;
      else hi = mid;
    }
    c = lo;
    rgb = oklchToSrgb({ l, c, h: color.h });
  }
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return { r: ch(rgb[0]), g: ch(rgb[1]), b: ch(rgb[2]), a: 1 };
}

export function toOklch(c: Rgba): Oklch {
  return rgbToOklch(c);
}

export interface Palette {
  id: PaletteId;
  name: string;
  /** Labels for each color, used as keys in the exports (50, 100… or 1, 2…). */
  keys: string[];
  colors: Rgba[];
  note: string;
}

export type PaletteId = 'scale' | 'complementary' | 'analogous' | 'triadic' | 'split' | 'tetradic' | 'monochrome';
export const PALETTE_IDS: PaletteId[] = ['scale', 'complementary', 'analogous', 'triadic', 'split', 'tetradic', 'monochrome'];

/** Tailwind-style step names and the lightness and relative chroma each one aims for. */
export const SCALE_STEPS = [
  { key: '50', l: 0.971, c: 0.06 },
  { key: '100', l: 0.936, c: 0.14 },
  { key: '200', l: 0.885, c: 0.27 },
  { key: '300', l: 0.808, c: 0.48 },
  { key: '400', l: 0.711, c: 0.8 },
  { key: '500', l: 0.637, c: 1 },
  { key: '600', l: 0.577, c: 1 },
  { key: '700', l: 0.505, c: 0.9 },
  { key: '800', l: 0.444, c: 0.75 },
  { key: '900', l: 0.396, c: 0.6 },
  { key: '950', l: 0.258, c: 0.4 },
] as const;

/** The step whose target lightness is closest to the color’s; the color itself sits there. */
export function nearestStep(base: Rgba): number {
  const { l } = toOklch(base);
  let best = 0;
  SCALE_STEPS.forEach((s, i) => {
    if (Math.abs(s.l - l) < Math.abs(SCALE_STEPS[best]!.l - l)) best = i;
  });
  return best;
}

/** A 50–950 scale in the color’s hue, with the color itself at the step nearest its lightness. */
export function scale(base: Rgba): Rgba[] {
  const b = { ...base, a: 1 };
  const ok = toOklch(b);
  const at = nearestStep(b);
  // Chroma relative to the step the base sits on, so a muted color gives a muted scale
  const peak = ok.c / SCALE_STEPS[at]!.c;
  return SCALE_STEPS.map((s, i) => (i === at ? b : oklchToRgba({ l: s.l, c: peak * s.c, h: ok.h })));
}

/** Five lightness steps of the same hue and chroma, darkest first, including the color itself. */
export function monochrome(base: Rgba): Rgba[] {
  const b = { ...base, a: 1 };
  const ok = toOklch(b);
  const step = 0.13;
  let lo = ok.l - 2 * step;
  if (lo < 0.12) lo = 0.12;
  if (lo + 4 * step > 0.97) lo = 0.97 - 4 * step;
  const ls = Array.from({ length: 5 }, (_, i) => lo + i * step);
  // Put the exact base color in the slot closest to it
  let idx = 0;
  ls.forEach((l, i) => {
    if (Math.abs(l - ok.l) < Math.abs(ls[idx]! - ok.l)) idx = i;
  });
  return ls.map((l, i) => (i === idx ? b : oklchToRgba({ l, c: ok.c, h: ok.h })));
}

/** The color with its hue turned by `deg`, keeping OKLCH lightness and chroma. */
export function rotate(base: Rgba, deg: number): Rgba {
  if (deg === 0) return { ...base, a: 1 };
  const ok = toOklch(base);
  return oklchToRgba({ l: ok.l, c: ok.c, h: (((ok.h + deg) % 360) + 360) % 360 });
}

const nums = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));

/** Every palette for a base color. */
export function palettes(base: Rgba): Palette[] {
  const turn = (degs: number[]) => degs.map((d) => rotate(base, d));
  return [
    { id: 'scale', name: 'Tints and shades', keys: SCALE_STEPS.map((s) => s.key), colors: scale(base), note: '50 is the lightest, 950 the darkest; your color sits at the nearest step.' },
    { id: 'complementary', name: 'Complementary', keys: nums(2), colors: turn([0, 180]), note: 'The opposite hue: strong contrast, good for one accent.' },
    { id: 'analogous', name: 'Analogous', keys: nums(3), colors: turn([-30, 0, 30]), note: 'Neighbouring hues 30° apart: calm and cohesive.' },
    { id: 'triadic', name: 'Triadic', keys: nums(3), colors: turn([0, 120, 240]), note: 'Three hues evenly spaced around the wheel.' },
    { id: 'split', name: 'Split complementary', keys: nums(3), colors: turn([0, 150, 210]), note: 'The two hues either side of the complement: contrast with less tension.' },
    { id: 'tetradic', name: 'Tetradic', keys: nums(4), colors: turn([0, 90, 180, 270]), note: 'Four hues 90° apart; let one lead and use the others sparingly.' },
    { id: 'monochrome', name: 'Monochrome', keys: nums(5), colors: monochrome(base), note: 'One hue at five lightness levels.' },
  ];
}

export type ExportFormat = 'hex' | 'css' | 'tailwind4' | 'tailwind3';
export const EXPORT_FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'hex', label: 'Hex list' },
  { id: 'css', label: 'CSS variables' },
  { id: 'tailwind4', label: 'Tailwind v4' },
  { id: 'tailwind3', label: 'Tailwind v3' },
];

/** A safe CSS / JS identifier from what the user typed ("Brand Blue" → "brand-blue"). */
export function slugName(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(s) ? s : s ? `c-${s}` : 'brand';
}

export function exportPalette(p: Pick<Palette, 'keys' | 'colors'>, format: ExportFormat, name: string): string {
  const n = slugName(name);
  const rows = p.keys.map((k, i) => [k, toHex(p.colors[i]!)] as const);
  switch (format) {
    case 'hex':
      return rows.map(([, hex]) => hex).join('\n') + '\n';
    case 'css':
      return `:root {\n${rows.map(([k, hex]) => `  --${n}-${k}: ${hex};`).join('\n')}\n}\n`;
    case 'tailwind4':
      return `@theme {\n${rows.map(([k, hex]) => `  --color-${n}-${k}: ${hex};`).join('\n')}\n}\n`;
    case 'tailwind3': {
      const key = /^[a-z][a-z0-9]*$/.test(n) ? n : `'${n}'`;
      return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        ${key}: {\n${rows
        .map(([k, hex]) => `          ${/^\d+$/.test(k) ? k : `'${k}'`}: '${hex}',`)
        .join('\n')}\n        },\n      },\n    },\n  },\n};\n`;
    }
  }
}
