/** IPv4 subnet math. Addresses are unsigned 32-bit numbers. Pure functions. */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Parses dotted-quad "192.168.1.10". Each part is 0–255, decimal, no leading zeros beyond "0". */
export function parseIp(s: string): Result<number> {
  const t = s.trim();
  if (!t) return { ok: false, error: 'Enter an IPv4 address such as 192.168.1.10.' };
  if (t.includes(':')) return { ok: false, error: 'That looks like IPv6. This calculator handles IPv4 only.' };
  const parts = t.split('.');
  if (parts.length !== 4) return { ok: false, error: `“${t}” isn’t an IPv4 address: it needs four numbers separated by dots.` };
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return { ok: false, error: `“${p || '(empty)'}” isn’t a number from 0 to 255.` };
    if (p.length > 1 && p.startsWith('0')) return { ok: false, error: `“${p}” has a leading zero; some systems read that as octal, so write it without.` };
    const v = Number(p);
    if (v > 255) return { ok: false, error: `${v} is out of range: each part of an IPv4 address is 0 to 255.` };
    n = n * 256 + v;
  }
  return { ok: true, value: n >>> 0 };
}

export function formatIp(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function maskFromPrefix(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/** Turns a mask like 255.255.255.0 into its prefix length, or an error for non-contiguous masks. */
export function prefixFromMask(s: string): Result<number> {
  const ip = parseIp(s);
  if (!ip.ok) return { ok: false, error: `Mask: ${ip.error}` };
  const m = ip.value;
  const inverted = ~m >>> 0;
  // A valid mask is ones followed by zeros, so its inverse plus one is a power of two
  if ((inverted & (inverted + 1)) !== 0) {
    return { ok: false, error: `${s.trim()} isn’t a valid subnet mask: the 1 bits must all come first (like 255.255.255.0).` };
  }
  let prefix = 0;
  for (let b = 31; b >= 0 && (m >>> b) & 1; b--) prefix++;
  return { ok: true, value: prefix };
}

function parsePrefix(s: string): Result<number> {
  const t = s.trim().replace(/^\//, '');
  if (!/^\d{1,2}$/.test(t)) return { ok: false, error: `“/${t}” isn’t a prefix length: use a number from 0 to 32.` };
  const v = Number(t);
  if (v > 32) return { ok: false, error: `/${v} is out of range: an IPv4 prefix is 0 to 32.` };
  return { ok: true, value: v };
}

/**
 * Reads "192.168.1.10/24", "192.168.1.10/255.255.255.0", "192.168.1.10 255.255.255.0"
 * or a bare address (taken as /32). An optional separate mask overrides.
 */
export function parseInput(input: string, mask = ''): Result<{ ip: number; prefix: number }> {
  let text = input.trim();
  if (!text) return { ok: false, error: 'Enter an address in CIDR form (192.168.1.10/24) or an address and a mask.' };
  let maskText = mask.trim();
  const slash = text.indexOf('/');
  let prefixText: string | null = null;
  if (slash >= 0) {
    const after = text.slice(slash + 1).trim();
    text = text.slice(0, slash).trim();
    if (after.includes('.')) maskText = maskText || after;
    else prefixText = after;
  } else {
    const parts = text.split(/\s+/);
    if (parts.length === 2) {
      text = parts[0]!;
      maskText = maskText || parts[1]!;
    } else if (parts.length > 2) {
      return { ok: false, error: 'Enter one address, with /prefix or a mask.' };
    }
  }
  const ip = parseIp(text);
  if (!ip.ok) return ip;
  let prefix = 32;
  if (prefixText != null) {
    const p = parsePrefix(prefixText);
    if (!p.ok) return p;
    prefix = p.value;
  } else if (maskText) {
    if (/^\/?\d{1,2}$/.test(maskText)) {
      const p = parsePrefix(maskText);
      if (!p.ok) return p;
      prefix = p.value;
    } else {
      const p = prefixFromMask(maskText);
      if (!p.ok) return p;
      prefix = p.value;
    }
  }
  return { ok: true, value: { ip: ip.value, prefix } };
}

export interface RangeInfo {
  label: string;
  /** "private", "public" or "special" */
  kind: 'private' | 'public' | 'special';
  note: string;
}

const RANGES: { net: string; prefix: number; info: RangeInfo }[] = [
  { net: '0.0.0.0', prefix: 8, info: { label: 'This network', kind: 'special', note: '0.0.0.0/8 means “this host on this network” (RFC 1122); not routable.' } },
  { net: '10.0.0.0', prefix: 8, info: { label: 'Private (RFC 1918)', kind: 'private', note: '10.0.0.0/8 is for private networks and isn’t routed on the internet.' } },
  { net: '100.64.0.0', prefix: 10, info: { label: 'Carrier-grade NAT (RFC 6598)', kind: 'special', note: '100.64.0.0/10 is shared address space used by ISPs between their NAT and customers.' } },
  { net: '127.0.0.0', prefix: 8, info: { label: 'Loopback', kind: 'special', note: '127.0.0.0/8 always refers to the local machine.' } },
  { net: '169.254.0.0', prefix: 16, info: { label: 'Link-local (RFC 3927)', kind: 'special', note: '169.254.0.0/16 is self-assigned when no DHCP server answers; valid only on the local link.' } },
  { net: '172.16.0.0', prefix: 12, info: { label: 'Private (RFC 1918)', kind: 'private', note: '172.16.0.0/12 (172.16.0.0 to 172.31.255.255) is for private networks.' } },
  { net: '192.0.0.0', prefix: 24, info: { label: 'IETF protocol assignments', kind: 'special', note: '192.0.0.0/24 is reserved for protocol assignments (RFC 6890).' } },
  { net: '192.0.2.0', prefix: 24, info: { label: 'Documentation (TEST-NET-1)', kind: 'special', note: '192.0.2.0/24 is reserved for examples in documentation (RFC 5737).' } },
  { net: '192.88.99.0', prefix: 24, info: { label: '6to4 relay anycast (deprecated)', kind: 'special', note: '192.88.99.0/24 was the 6to4 relay anycast range, deprecated by RFC 7526.' } },
  { net: '192.168.0.0', prefix: 16, info: { label: 'Private (RFC 1918)', kind: 'private', note: '192.168.0.0/16 is for private networks, common on home routers.' } },
  { net: '198.18.0.0', prefix: 15, info: { label: 'Benchmarking (RFC 2544)', kind: 'special', note: '198.18.0.0/15 is reserved for network benchmark tests.' } },
  { net: '198.51.100.0', prefix: 24, info: { label: 'Documentation (TEST-NET-2)', kind: 'special', note: '198.51.100.0/24 is reserved for examples in documentation (RFC 5737).' } },
  { net: '203.0.113.0', prefix: 24, info: { label: 'Documentation (TEST-NET-3)', kind: 'special', note: '203.0.113.0/24 is reserved for examples in documentation (RFC 5737).' } },
  { net: '224.0.0.0', prefix: 4, info: { label: 'Multicast', kind: 'special', note: '224.0.0.0/4 (224.0.0.0 to 239.255.255.255) is for multicast groups.' } },
  { net: '255.255.255.255', prefix: 32, info: { label: 'Limited broadcast', kind: 'special', note: '255.255.255.255 is the broadcast address for the local network.' } },
  { net: '240.0.0.0', prefix: 4, info: { label: 'Reserved (former class E)', kind: 'special', note: '240.0.0.0/4 is reserved for future use and isn’t routable.' } },
];

const inRange = (ip: number, net: string, prefix: number) => {
  const m = maskFromPrefix(prefix);
  return ((ip & m) >>> 0) === ((parseIp(net) as { value: number }).value & m) >>> 0;
};

/** What kind of address this is: private, public or a special-purpose range. */
export function classifyRange(ip: number): RangeInfo {
  for (const r of RANGES) if (inRange(ip, r.net, r.prefix)) return r.info;
  return { label: 'Public', kind: 'public', note: 'Not in a private or special-purpose range, so it’s a public (globally routable) address.' };
}

/** The historical classful category (A–E), from before CIDR (1993). */
export function addressClass(ip: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  const first = ip >>> 24;
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D';
  return 'E';
}

export function toBinary(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map((o) => o.toString(2).padStart(8, '0')).join('.');
}

export interface Subnet {
  ip: string;
  prefix: number;
  cidr: string;
  network: string;
  broadcast: string;
  mask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  total: number;
  usable: number;
  /** Explains /31 and /32. */
  hostNote: string | null;
  addressClass: string;
  range: RangeInfo;
  binary: { ip: string; mask: string; network: string; broadcast: string };
}

export function calculate(ip: number, prefix: number): Subnet {
  const mask = maskFromPrefix(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const total = 2 ** (32 - prefix);
  let first = network + 1;
  let last = broadcast - 1;
  let usable = total - 2;
  let hostNote: string | null = null;
  if (prefix === 32) {
    first = last = network;
    usable = 1;
    hostNote = 'A /32 is a single address, used for one host (a loopback or a route to one machine).';
  } else if (prefix === 31) {
    first = network;
    last = broadcast;
    usable = 2;
    hostNote = 'A /31 has no network or broadcast address: both addresses are usable on a point-to-point link (RFC 3021).';
  }
  const cls = addressClass(ip);
  return {
    ip: formatIp(ip),
    prefix,
    cidr: `${formatIp(network)}/${prefix}`,
    network: formatIp(network),
    broadcast: prefix >= 31 ? '–' : formatIp(broadcast),
    mask: formatIp(mask),
    wildcard: formatIp(~mask >>> 0),
    firstHost: formatIp(first),
    lastHost: formatIp(last),
    total,
    usable,
    hostNote,
    addressClass: cls === 'D' ? 'D (multicast)' : cls === 'E' ? 'E (reserved)' : cls,
    range: classifyRange(ip),
    binary: { ip: toBinary(ip), mask: toBinary(mask), network: toBinary(network), broadcast: toBinary(broadcast) },
  };
}

export const MAX_SPLIT_ROWS = 256;

export interface SplitRow {
  cidr: string;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  usable: number;
}

/**
 * Splits a network into subnets of a longer prefix. Returns at most MAX_SPLIT_ROWS
 * rows plus the total count.
 */
export function split(network: number, prefix: number, newPrefix: number): Result<{ rows: SplitRow[]; count: number }> {
  if (!Number.isInteger(newPrefix) || newPrefix < prefix || newPrefix > 32) {
    return { ok: false, error: `The new prefix must be between /${prefix} and /32.` };
  }
  const base = (network & maskFromPrefix(prefix)) >>> 0;
  const count = 2 ** (newPrefix - prefix);
  const size = 2 ** (32 - newPrefix);
  const rows: SplitRow[] = [];
  for (let i = 0; i < Math.min(count, MAX_SPLIT_ROWS); i++) {
    const s = calculate(base + i * size, newPrefix);
    rows.push({ cidr: s.cidr, network: s.network, firstHost: s.firstHost, lastHost: s.lastHost, broadcast: s.broadcast, usable: s.usable });
  }
  return { ok: true, value: { rows, count } };
}

/** The smallest prefix that gives at least `n` subnets. */
export function prefixForCount(prefix: number, n: number): Result<number> {
  if (!Number.isInteger(n) || n < 1) return { ok: false, error: 'Enter a whole number of subnets, 1 or more.' };
  const bits = Math.ceil(Math.log2(n));
  if (prefix + bits > 32) return { ok: false, error: `A /${prefix} can be split into at most ${(2 ** (32 - prefix)).toLocaleString('en-US')} subnets.` };
  return { ok: true, value: prefix + bits };
}

/** A plain-text summary for copying. */
export function summaryText(s: Subnet): string {
  return [
    `Address:          ${s.ip}/${s.prefix}`,
    `Network:          ${s.network}`,
    `Broadcast:        ${s.broadcast}`,
    `Subnet mask:      ${s.mask}`,
    `Wildcard mask:    ${s.wildcard}`,
    `First host:       ${s.firstHost}`,
    `Last host:        ${s.lastHost}`,
    `Total addresses:  ${s.total.toLocaleString('en-US')}`,
    `Usable hosts:     ${s.usable.toLocaleString('en-US')}`,
    `Class (historic): ${s.addressClass}`,
    `Range:            ${s.range.label}`,
    '',
  ].join('\n');
}
