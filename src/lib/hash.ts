/** MD5 (RFC 1321, in TypeScript) and SHA hashes (Web Crypto), with hex/Base64 output and a checksum compare. */

export const HASH_ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
export type HashAlgo = (typeof HASH_ALGOS)[number];
export type ShaAlgo = Exclude<HashAlgo, 'MD5'>;

/** Broken for collision resistance: fine for checksums, not for passwords or signatures. */
export const WEAK_ALGOS: ReadonlySet<HashAlgo> = new Set(['MD5', 'SHA-1']);

export const MAX_HASH_FILE = 200 * 1024 * 1024;

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const K = new Int32Array(64).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0);

function md5Block(state: Int32Array, w: Int32Array) {
  let a = state[0]!;
  let b = state[1]!;
  let c = state[2]!;
  let d = state[3]!;
  for (let i = 0; i < 64; i++) {
    let f: number;
    let g: number;
    if (i < 16) {
      f = (b & c) | (~b & d);
      g = i;
    } else if (i < 32) {
      f = (d & b) | (~d & c);
      g = (5 * i + 1) & 15;
    } else if (i < 48) {
      f = b ^ c ^ d;
      g = (3 * i + 5) & 15;
    } else {
      f = c ^ (b | ~d);
      g = (7 * i) & 15;
    }
    const tmp = d;
    d = c;
    c = b;
    const x = (a + f + K[i]! + w[g]!) | 0;
    b = (b + ((x << S[i]!) | (x >>> (32 - S[i]!)))) | 0;
    a = tmp;
  }
  state[0] = (state[0]! + a) | 0;
  state[1] = (state[1]! + b) | 0;
  state[2] = (state[2]! + c) | 0;
  state[3] = (state[3]! + d) | 0;
}

/** MD5 of bytes. Works through the input in place (only the last block is copied), so large files are fine. */
export function md5(data: Uint8Array): Uint8Array {
  const state = new Int32Array([0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476]);
  const w = new Int32Array(16);
  const len = data.length;
  const full = len - (len % 64);
  for (let off = 0; off < full; off += 64) {
    for (let j = 0; j < 16; j++) {
      const p = off + j * 4;
      w[j] = data[p]! | (data[p + 1]! << 8) | (data[p + 2]! << 16) | (data[p + 3]! << 24);
    }
    md5Block(state, w);
  }
  // Padding: 0x80, zeros, then the bit length as 64-bit little-endian
  const tailLen = len - full;
  const tail = new Uint8Array(tailLen < 56 ? 64 : 128);
  tail.set(data.subarray(full));
  tail[tailLen] = 0x80;
  const bits = len * 8;
  const lo = bits % 2 ** 32;
  const hi = Math.floor(bits / 2 ** 32);
  const end = tail.length - 8;
  for (let i = 0; i < 4; i++) {
    tail[end + i] = (lo >>> (8 * i)) & 0xff;
    tail[end + 4 + i] = (hi >>> (8 * i)) & 0xff;
  }
  for (let off = 0; off < tail.length; off += 64) {
    for (let j = 0; j < 16; j++) {
      const p = off + j * 4;
      w[j] = tail[p]! | (tail[p + 1]! << 8) | (tail[p + 2]! << 16) | (tail[p + 3]! << 24);
    }
    md5Block(state, w);
  }
  const out = new Uint8Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out[i * 4 + j] = (state[i]! >>> (8 * j)) & 0xff;
  return out;
}

export async function hashBytes(algo: HashAlgo, data: Uint8Array): Promise<Uint8Array> {
  if (algo === 'MD5') return md5(data);
  return new Uint8Array(await crypto.subtle.digest(algo, data as BufferSource));
}

/** HMAC with SHA-1/256/384/512 (Web Crypto has no HMAC-MD5). */
export async function hmacBytes(algo: ShaAlgo, key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: algo }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data as BufferSource));
}

export type HashFormat = 'hex' | 'HEX' | 'base64';

export function toHex(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += x.toString(16).padStart(2, '0');
  return s;
}

export function toBase64(b: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function formatHash(b: Uint8Array, f: HashFormat): string {
  if (f === 'base64') return toBase64(b);
  const h = toHex(b);
  return f === 'HEX' ? h.toUpperCase() : h;
}

function base64ToHex(s: string): string | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return Array.from(bin, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * Normalises an expected checksum to lowercase hex: accepts hex in any case
 * (spaces and colons ignored, an "algo:" prefix or trailing file name from
 * sha256sum output dropped) or Base64.
 */
export function normalizeExpected(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/^(md5|sha-?1|sha-?256|sha-?384|sha-?512)\s*[:=-]\s*/i, '');
  const first = s.split(/\s+/)[0]!;
  // "hash  filename" as printed by sha256sum and friends
  if (/^[0-9a-f]+$/i.test(first) && [32, 40, 64, 96, 128].includes(first.length)) return first.toLowerCase();
  const compact = s.replace(/[\s:]/g, '');
  if (/^[0-9a-f]+$/i.test(compact) && [32, 40, 64, 96, 128].includes(compact.length)) return compact.toLowerCase();
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(compact)) return base64ToHex(compact);
  return null;
}

/** Which algorithm's hash (given as raw bytes) equals the expected value, if any. */
export function findMatch(expected: string, hashes: Partial<Record<HashAlgo, Uint8Array>>): HashAlgo | null {
  const want = normalizeExpected(expected);
  if (!want) return null;
  for (const algo of HASH_ALGOS) {
    const h = hashes[algo];
    if (h && toHex(h) === want) return algo;
  }
  return null;
}
