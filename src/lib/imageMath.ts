/** Pure helpers for the image tools: sizes, savings, file names, the ICO container and favicon snippets. */

export type ImageFormat = 'jpeg' | 'png' | 'webp';
export const IMAGE_FORMATS: ImageFormat[] = ['jpeg', 'png', 'webp'];
export const MIME: Record<ImageFormat, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const EXT: Record<ImageFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

/** Browsers refuse canvases beyond about this many pixels (Safari is the strictest). */
export const MAX_PIXELS = 16_777_216;
export const MAX_SIDE = 16_384;

/** The format a MIME type maps to, or null for one the tools don’t write. */
export function formatOf(mime: string): ImageFormat | null {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpeg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return null;
}

/** "holiday photo.PNG" + webp → "holiday photo.webp"; a suffix goes before the extension. */
export function outputName(name: string, format: ImageFormat, suffix = ''): string {
  const base = name.replace(/\.[^./\\]{1,5}$/, '') || 'image';
  return `${base}${suffix}.${EXT[format]}`;
}

/** How much smaller the new file is: positive percent saved, negative when it grew. */
export function savings(before: number, after: number): { percent: number; bigger: boolean; label: string } {
  if (before <= 0) return { percent: 0, bigger: after > 0, label: '' };
  const percent = ((before - after) / before) * 100;
  const shown = Math.abs(percent) < 0.1 ? '0' : Math.abs(percent).toFixed(Math.abs(percent) < 10 ? 1 : 0);
  return { percent, bigger: after > before, label: after > before ? `${shown}% bigger` : `${shown}% smaller` };
}

export interface ResizeRequest {
  unit: 'px' | 'percent';
  width: number;
  height: number;
  percent: number;
}

/** Output dimensions (whole pixels, at least 1) or why they can’t be made. */
export function targetSize(src: { w: number; h: number }, req: ResizeRequest): { ok: true; w: number; h: number } | { ok: false; message: string } {
  let w: number;
  let h: number;
  if (req.unit === 'percent') {
    if (!(req.percent > 0)) return { ok: false, message: 'Enter a percentage above 0' };
    w = Math.round((src.w * req.percent) / 100);
    h = Math.round((src.h * req.percent) / 100);
  } else {
    if (!(req.width > 0) || !(req.height > 0)) return { ok: false, message: 'Enter a width and height above 0' };
    w = Math.round(req.width);
    h = Math.round(req.height);
  }
  w = Math.max(1, w);
  h = Math.max(1, h);
  if (w > MAX_SIDE || h > MAX_SIDE) return { ok: false, message: `Browsers can’t make images wider or taller than ${MAX_SIDE.toLocaleString('en-US')} px` };
  if (w * h > MAX_PIXELS) return { ok: false, message: `That’s ${(w * h / 1e6).toFixed(0)} megapixels; browsers stop at about 16` };
  return { ok: true, w, h };
}

/** The other side when the aspect ratio is locked. */
export function lockedSide(src: { w: number; h: number }, known: 'width' | 'height', value: number): number {
  if (!(value > 0)) return 0;
  return Math.max(1, Math.round(known === 'width' ? (value * src.h) / src.w : (value * src.w) / src.h));
}

/**
 * Sizes to draw through when shrinking: halve while the image is still more
 * than twice the target, then draw the target. One big jump skips pixels and
 * looks jagged; halving averages them.
 */
export function halvingSteps(from: { w: number; h: number }, to: { w: number; h: number }): { w: number; h: number }[] {
  const steps: { w: number; h: number }[] = [];
  let w = from.w;
  let h = from.h;
  while (w / 2 >= to.w && h / 2 >= to.h && steps.length < 20) {
    w = Math.max(to.w, Math.floor(w / 2));
    h = Math.max(to.h, Math.floor(h / 2));
    if (w === to.w && h === to.h) break;
    steps.push({ w, h });
  }
  steps.push({ w: to.w, h: to.h });
  return steps;
}

/** Width and height of a PNG, read from its IHDR chunk, or null if the bytes aren’t a PNG. */
export function pngSize(png: Uint8Array): { w: number; h: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.length < 24 || sig.some((b, i) => png[i] !== b)) return null;
  if (String.fromCharCode(png[12]!, png[13]!, png[14]!, png[15]!) !== 'IHDR') return null;
  const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

/**
 * An .ico file holding the given PNG images. ICO entries may be PNG data
 * (supported since Windows Vista and by every browser); widths of 256 are
 * stored as 0. Layout: 6-byte header, 16 bytes per entry, then the images.
 */
export function buildIco(pngs: Uint8Array[]): Uint8Array {
  if (!pngs.length) throw new Error('An ICO file needs at least one image');
  const sizes = pngs.map((p, i) => {
    const s = pngSize(p);
    if (!s) throw new Error(`Image ${i + 1} isn’t a PNG`);
    if (s.w > 256 || s.h > 256) throw new Error(`Image ${i + 1} is larger than 256 px`);
    return s;
  });
  const headerSize = 6 + 16 * pngs.length;
  const total = headerSize + pngs.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true); // reserved
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, pngs.length, true);
  let offset = headerSize;
  pngs.forEach((p, i) => {
    const e = 6 + 16 * i;
    const { w, h } = sizes[i]!;
    out[e] = w >= 256 ? 0 : w;
    out[e + 1] = h >= 256 ? 0 : h;
    out[e + 2] = 0; // palette colors
    out[e + 3] = 0; // reserved
    v.setUint16(e + 4, 1, true); // color planes
    v.setUint16(e + 6, 32, true); // bits per pixel
    v.setUint32(e + 8, p.length, true);
    v.setUint32(e + 12, offset, true);
    out.set(p, offset);
    offset += p.length;
  });
  return out;
}

export const FAVICON_FILES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
] as const;
export const ICO_SIZES = [16, 32, 48] as const;

export function faviconHtml(): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join('\n') + '\n';
}

export function webManifest(opts: { name: string; color: string }): string {
  const name = opts.name.trim();
  const manifest = {
    name,
    short_name: name,
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: opts.color,
    background_color: opts.color,
    display: 'standalone',
  };
  return JSON.stringify(manifest, null, 2) + '\n';
}

/** Layout of the image inside a square icon: the box it is fitted into, keeping its shape. */
export function fitBox(size: number, paddingPct: number, aspect: number): { x: number; y: number; w: number; h: number } {
  const pad = (size * Math.min(40, Math.max(0, paddingPct))) / 100;
  const inner = size - 2 * pad;
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const w = a >= 1 ? inner : inner * a;
  const h = a >= 1 ? inner / a : inner;
  return { x: (size - w) / 2, y: (size - h) / 2, w, h };
}
