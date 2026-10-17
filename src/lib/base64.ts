/** Base64 encoding and decoding of text and files, UTF-8 safe. */

const CHUNK = 0x8000;

/** Standard or URL-safe (RFC 4648 §5: - and _ instead of + and /, no padding) Base64 of bytes. */
export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  const b64 = btoa(binary);
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

export function encodeText(text: string, urlSafe = false): string {
  return bytesToBase64(new TextEncoder().encode(text), urlSafe);
}

export type DecodeResult = { ok: true; bytes: Uint8Array } | { ok: false; message: string; index: number | null };

/**
 * Decode Base64, accepting both alphabets, missing padding and whitespace or
 * line breaks (as in MIME and PEM). A "data:...;base64," prefix is skipped.
 */
export function decodeBase64(input: string): DecodeResult {
  let start = 0;
  const dataUrl = /^data:[^,]*;base64,/i.exec(input);
  if (dataUrl) start = dataUrl[0].length;
  let clean = '';
  let padding = 0;
  for (let i = start; i < input.length; i++) {
    const c = input[i]!;
    if (c === ' ' || c === '\n' || c === '\r' || c === '\t') continue;
    if (c === '=') {
      padding++;
      continue;
    }
    if (padding > 0) return { ok: false, message: `Unexpected ${JSON.stringify(c)} after "=" padding`, index: i };
    if (/[A-Za-z0-9+/]/.test(c)) clean += c;
    else if (c === '-') clean += '+';
    else if (c === '_') clean += '/';
    else return { ok: false, message: `${describe(c)} isn't a Base64 character`, index: i };
  }
  if (clean.length % 4 === 1) return { ok: false, message: 'The length is invalid: one character too many or too few', index: null };
  if (padding > 2 || (padding > 0 && (clean.length + padding) % 4 !== 0)) {
    return { ok: false, message: 'Wrong amount of "=" padding at the end', index: null };
  }
  const binary = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { ok: true, bytes };
}

function describe(c: string): string {
  const code = c.codePointAt(0)!;
  return code < 0x20 || code === 0x7f ? `Character U+${code.toString(16).toUpperCase().padStart(4, '0')}` : JSON.stringify(c);
}

/** The bytes as UTF-8 text, or null when they aren't valid UTF-8 (binary data). */
export function bytesToText(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** File type from the first bytes, for previews and download names. */
export function sniffType(bytes: Uint8Array): { mime: string; ext: string } | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return { mime: 'image/png', ext: 'png' };
  if (starts(0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', ext: 'jpg' };
  if (starts(0x47, 0x49, 0x46, 0x38)) return { mime: 'image/gif', ext: 'gif' };
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  if (starts(0x25, 0x50, 0x44, 0x46)) return { mime: 'application/pdf', ext: 'pdf' };
  if (starts(0x50, 0x4b, 0x03, 0x04)) return { mime: 'application/zip', ext: 'zip' };
  if (starts(0x1f, 0x8b)) return { mime: 'application/gzip', ext: 'gz' };
  return null;
}

/** First bytes as a hex dump line, for showing binary output. */
export function hexPreview(bytes: Uint8Array, max = 256): string {
  const lines: string[] = [];
  for (let i = 0; i < Math.min(bytes.length, max); i += 16) {
    const row = bytes.subarray(i, Math.min(i + 16, max, bytes.length));
    const hex = [...row].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = [...row].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
    lines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(47)}  ${ascii}`);
  }
  if (bytes.length > max) lines.push(`… ${(bytes.length - max).toLocaleString()} more bytes`);
  return lines.join('\n');
}
