/** UUID generation (v4 and v7, RFC 9562), formatting and validation. Pure functions; randomness is passed in or taken from crypto. */

export type UuidVersion = 4 | 7;

export interface UuidFormat {
  upper: boolean;
  dashes: boolean;
  braces: boolean;
}

export const MAX_UUIDS = 1000;

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

/** 16 bytes as the canonical lowercase 8-4-4-4-12 form. */
export function bytesToUuid(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) s += '-';
    s += HEX[b[i]!];
  }
  return s;
}

/** A random (version 4) UUID from 16 random bytes. */
export function uuidV4(rand: Uint8Array = randomBytes(16)): string {
  const b = rand.slice(0, 16);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  return bytesToUuid(b);
}

/**
 * A time-ordered (version 7) UUID: 48-bit Unix time in ms, version 7, 12 bits
 * `seq` (rand_a), variant 10, then 62 random bits.
 */
export function uuidV7(ms: number, seq: number, rand: Uint8Array = randomBytes(8)): string {
  const b = new Uint8Array(16);
  // 48-bit big-endian timestamp (ms fits in a double exactly)
  let t = Math.floor(ms);
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = 0x70 | ((seq >> 8) & 0x0f);
  b[7] = seq & 0xff;
  b.set(rand.slice(0, 8), 8);
  b[8] = (b[8]! & 0x3f) | 0x80;
  return bytesToUuid(b);
}

/**
 * `count` v7 UUIDs that sort in creation order: within one millisecond the
 * 12-bit rand_a field counts up from a random start (RFC 9562 method 3); when
 * it runs out, the timestamp moves forward a millisecond.
 */
export function uuidV7Batch(count: number, now: number = Date.now(), rand: (n: number) => Uint8Array = randomBytes): string[] {
  const out: string[] = [];
  let ms = now;
  let seq = (rand(2)[0]! << 4) & 0x7ff; // random start in the lower half, leaving room to count
  for (let i = 0; i < count; i++) {
    if (seq > 0xfff) {
      ms++;
      seq = (rand(2)[0]! << 4) & 0x7ff;
    }
    out.push(uuidV7(ms, seq++, rand(8)));
  }
  return out;
}

export function generateUuids(count: number, version: UuidVersion, now = Date.now()): string[] {
  const n = Math.max(1, Math.min(MAX_UUIDS, Math.floor(count) || 1));
  if (version === 7) return uuidV7Batch(n, now);
  return Array.from({ length: n }, () => uuidV4());
}

export function formatUuid(u: string, f: UuidFormat): string {
  let s = f.dashes ? u : u.replace(/-/g, '');
  if (f.upper) s = s.toUpperCase();
  return f.braces ? `{${s}}` : s;
}

export type UuidCheck =
  | { status: 'empty' }
  | { status: 'invalid'; message: string }
  | {
      status: 'valid';
      canonical: string;
      version: number;
      variant: string;
      label: string;
      time?: Date;
    };

const VERSION_NAMES: Record<number, string> = {
  1: 'version 1 (time and node)',
  2: 'version 2 (DCE security)',
  3: 'version 3 (MD5 name-based)',
  4: 'version 4 (random)',
  5: 'version 5 (SHA-1 name-based)',
  6: 'version 6 (reordered time)',
  7: 'version 7 (Unix time-ordered)',
  8: 'version 8 (custom)',
};

/** Accepts the canonical form, upper case, braces, a urn:uuid: prefix or 32 hex digits without dashes. */
export function checkUuid(input: string): UuidCheck {
  let s = input.trim();
  if (!s) return { status: 'empty' };
  s = s.replace(/^urn:uuid:/i, '');
  if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);
  let hex: string;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) hex = s.replace(/-/g, '');
  else if (/^[0-9a-f]{32}$/i.test(s)) hex = s;
  else {
    const bad = s.replace(/-/g, '').match(/[^0-9a-f]/i);
    if (bad)
      return {
        status: 'invalid',
        message: `Not a UUID: “${bad[0]}” isn’t a hex digit`,
      };
    const digits = s.replace(/-/g, '').length;
    if (digits !== 32)
      return {
        status: 'invalid',
        message: `Not a UUID: it has ${digits} hex digits, a UUID has 32`,
      };
    return {
      status: 'invalid',
      message: 'Not a UUID: the dashes go after digits 8, 12, 16 and 20 (8-4-4-4-12)',
    };
  }
  hex = hex.toLowerCase();
  const canonical = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  if (/^0{32}$/.test(hex))
    return {
      status: 'valid',
      canonical,
      version: 0,
      variant: 'nil',
      label: 'The nil UUID (all zeros)',
    };
  if (/^f{32}$/.test(hex))
    return {
      status: 'valid',
      canonical,
      version: 15,
      variant: 'max',
      label: 'The max UUID (all ones)',
    };
  const version = parseInt(hex[12]!, 16);
  const v = parseInt(hex[16]!, 16);
  const variant = v < 8 ? 'NCS (reserved)' : v < 12 ? 'RFC 9562' : v < 14 ? 'Microsoft (reserved)' : 'future (reserved)';
  if (variant !== 'RFC 9562')
    return {
      status: 'valid',
      canonical,
      version,
      variant,
      label: `Valid format, but the variant is ${variant}, not RFC 9562`,
    };
  const name = VERSION_NAMES[version];
  if (!name)
    return {
      status: 'valid',
      canonical,
      version,
      variant,
      label: `Valid format, but version ${version} isn’t defined`,
    };
  const time = version === 7 ? new Date(parseInt(hex.slice(0, 12), 16)) : undefined;
  return {
    status: 'valid',
    canonical,
    version,
    variant,
    label: `Valid UUID, ${name}`,
    time,
  };
}
