/** QR codes (any text, UTF-8) as SVG and PNG. */
import qrcode from 'qrcode-generator';

export type Ecc = 'L' | 'M' | 'Q' | 'H';

export interface Qr {
  size: number;
  isDark: (row: number, col: number) => boolean;
}

// The library writes one byte per UTF-16 unit; QR byte mode should carry UTF-8
qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s));

/** A QR code for the text, or an error when it doesn't fit (the largest code holds about 2.9 KB). */
export function makeQr(text: string, ecc: Ecc): { ok: true; qr: Qr } | { ok: false; message: string } {
  try {
    const q = qrcode(0, ecc);
    q.addData(text, 'Byte');
    q.make();
    return { ok: true, qr: { size: q.getModuleCount(), isDark: (r, c) => q.isDark(r, c) } };
  } catch {
    return { ok: false, message: 'Too much data for a QR code at this error correction level; shorten the text or pick level L' };
  }
}

/** SVG markup with one path for all dark modules. */
export function qrSvg(qr: Qr, opts: { margin: number; fg: string; bg: string; scale?: number }): string {
  const n = qr.size + opts.margin * 2;
  let d = '';
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.isDark(r, c)) d += `M${c + opts.margin} ${r + opts.margin}h1v1h-1z`;
    }
  }
  const px = (opts.scale ?? 10) * n;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${opts.bg}"/><path d="${d}" fill="${opts.fg}"/></svg>`;
}

/** Text for common QR payloads. */
export const QR_TEMPLATES = {
  wifi: (ssid: string, password: string, security: 'WPA' | 'WEP' | 'nopass', hidden: boolean) => {
    const esc = (s: string) => s.replace(/([\;,:"])/g, '\\$1');
    return `WIFI:T:${security};S:${esc(ssid)};${security === 'nopass' ? '' : `P:${esc(password)};`}${hidden ? 'H:true;' : ''};`;
  },
  email: (to: string, subject: string, body: string) => {
    const q = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join('&');
    return `mailto:${to}${q ? `?${q}` : ''}`;
  },
  phone: (number: string) => `tel:${number.replace(/[^\d+]/g, '')}`,
  sms: (number: string, message: string) => `SMSTO:${number.replace(/[^\d+]/g, '')}:${message}`,
};
