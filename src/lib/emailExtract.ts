/**
 * Finds email addresses in free text. Instead of one big regex (which can
 * backtrack badly on long input), it scans for each "@" and grows the local
 * part left and the domain right, capped at the RFC 5321 limits (64 and 253
 * characters), so the work stays linear in the length of the text.
 */

export type EmailSeparator = 'newline' | 'comma' | 'semicolon';

export interface EmailOptions {
  /** Drop repeats; the domain is compared case-insensitively. */
  dedupe: boolean;
  /** Also lowercase the part before the @ (most mail providers ignore its case). */
  lowercase: boolean;
  sort: boolean;
  /** Keep only these domains (and their subdomains), comma or space separated. Empty keeps all. */
  domains: string;
  separator: EmailSeparator;
}

export const DEFAULT_EMAIL: EmailOptions = { dedupe: true, lowercase: false, sort: false, domains: '', separator: 'newline' };

const MAX_LOCAL = 64;
const MAX_DOMAIN = 253;

// Letters, digits and combining marks from any script, plus the punctuation commonly seen before an @
const LOCAL = /[\p{L}\p{N}\p{M}._%+\-'!#$*^~]/u;
const DOMAIN = /[\p{L}\p{N}\p{M}.-]/u;
const LABEL = /^[\p{L}\p{N}\p{M}](?:[\p{L}\p{N}\p{M}-]{0,61}[\p{L}\p{N}\p{M}])?$/u;
const TLD = /^(?:\p{L}[\p{L}\p{M}]+|xn--[a-z0-9-]+)$/iu;
// "logo@2x.png" looks like an address but is a file name
const FILE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'bmp', 'ico', 'tif', 'tiff', 'css', 'js', 'mjs', 'map']);

const isLocal = (ch: string) => LOCAL.test(ch);
const isDomain = (ch: string) => DOMAIN.test(ch);

/** One character (whole code point) before index `i`, and its length. */
function charBefore(text: string, i: number): string {
  const c = text.charCodeAt(i - 1);
  if (c >= 0xdc00 && c <= 0xdfff && i >= 2) {
    const h = text.charCodeAt(i - 2);
    if (h >= 0xd800 && h <= 0xdbff) return text.slice(i - 2, i);
  }
  return text[i - 1]!;
}

function charAt(text: string, i: number): string {
  const cp = text.codePointAt(i)!;
  return String.fromCodePoint(cp);
}

/** Every address in the text, in order, as written (not yet deduplicated). */
export function findEmails(text: string): string[] {
  const out: string[] = [];
  let at = text.indexOf('@');
  let minStart = 0; // the local part can't reach back into the previous match
  while (at !== -1) {
    // Grow the local part to the left
    let j = at;
    while (j > minStart && at - j <= MAX_LOCAL) {
      const ch = charBefore(text, j);
      if (!isLocal(ch)) break;
      j -= ch.length;
    }
    // Grow the domain to the right
    let k = at + 1;
    while (k < text.length && k - at - 1 <= MAX_DOMAIN) {
      const ch = charAt(text, k);
      if (!isDomain(ch)) break;
      k += ch.length;
    }
    const email = accept(text.slice(j, at), text.slice(at + 1, k), at - j > MAX_LOCAL || k - at - 1 > MAX_DOMAIN);
    if (email) {
      out.push(email);
      minStart = k;
    }
    at = text.indexOf('@', at + 1);
  }
  return out;
}

/** Cleans up the two halves (leading quotes, trailing dots) and checks they form an address. */
function accept(rawLocal: string, rawDomain: string, tooLong: boolean): string | null {
  if (tooLong) return null;
  // Punctuation that sits before an address in prose or markup: 'bob@x.com', ..bob@x.com
  const local = rawLocal.replace(/^['.\-+~^*!#$%]+/, '');
  // Sentence punctuation after it: bob@x.com. or bob@x.com-
  const domain = rawDomain.replace(/[.-]+$/, '');
  if (!local || local.endsWith('.') || local.includes('..')) return null;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return null;
  const tld = labels[labels.length - 1]!;
  if (!TLD.test(tld) || FILE_EXT.has(tld.toLowerCase())) return null;
  return `${local}@${domain}`;
}

/** Splits "example.com, @Sub.Example.org" into lowercase domains. */
export function parseDomains(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((d) => d.trim().replace(/^@/, '').replace(/^\.+|\.+$/g, '').toLowerCase())
    .filter(Boolean);
}

const domainOf = (email: string) => email.slice(email.lastIndexOf('@') + 1).toLowerCase();

export interface EmailResult {
  emails: string[];
  /** Addresses found before deduplication and filtering. */
  found: number;
  /** How many repeats were dropped. */
  duplicates: number;
  /** How many the domain filter left out. */
  filtered: number;
  output: string;
}

export function extractEmails(text: string, o: EmailOptions): EmailResult {
  const all = findEmails(text);
  let emails = all.map((e) => {
    const at = e.lastIndexOf('@');
    const local = e.slice(0, at);
    return `${o.lowercase ? local.toLowerCase() : local}@${e.slice(at + 1).toLowerCase()}`;
  });
  const wanted = parseDomains(o.domains);
  let filtered = 0;
  if (wanted.length) {
    const before = emails.length;
    emails = emails.filter((e) => {
      const d = domainOf(e);
      return wanted.some((w) => d === w || d.endsWith(`.${w}`));
    });
    filtered = before - emails.length;
  }
  let duplicates = 0;
  if (o.dedupe) {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const e of emails) {
      if (seen.has(e)) continue;
      seen.add(e);
      kept.push(e);
    }
    duplicates = emails.length - kept.length;
    emails = kept;
  }
  if (o.sort) {
    const collator = new Intl.Collator('en', { sensitivity: 'base' });
    emails = [...emails].sort((a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0));
  }
  const sep = o.separator === 'comma' ? ', ' : o.separator === 'semicolon' ? '; ' : '\n';
  return { emails, found: all.length, duplicates, filtered, output: emails.join(sep) };
}
