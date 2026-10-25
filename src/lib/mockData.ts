/**
 * Fake test data from a list of fields. Everything is made up: emails use the
 * reserved example.com / example.org / example.net domains, phone numbers use
 * the fictional 555-0100 to 555-0199 range, and IP addresses come from the
 * documentation ranges (RFC 5737). With a seed, the same settings give the
 * same rows.
 */

export const FIELD_TYPES = [
  { type: 'id', label: 'ID (1, 2, 3…)' },
  { type: 'uuid', label: 'UUID' },
  { type: 'firstName', label: 'First name' },
  { type: 'lastName', label: 'Last name' },
  { type: 'fullName', label: 'Full name' },
  { type: 'email', label: 'Email' },
  { type: 'username', label: 'Username' },
  { type: 'phone', label: 'Phone (555)' },
  { type: 'city', label: 'City' },
  { type: 'country', label: 'Country' },
  { type: 'company', label: 'Company' },
  { type: 'jobTitle', label: 'Job title' },
  { type: 'date', label: 'Date (YYYY-MM-DD)' },
  { type: 'datetime', label: 'Date and time (ISO)' },
  { type: 'pastDate', label: 'Past date and time' },
  { type: 'boolean', label: 'Boolean' },
  { type: 'integer', label: 'Integer' },
  { type: 'float', label: 'Decimal' },
  { type: 'price', label: 'Price' },
  { type: 'sentence', label: 'Lorem sentence' },
  { type: 'url', label: 'URL' },
  { type: 'ip', label: 'IP address' },
  { type: 'color', label: 'Color (hex)' },
  { type: 'status', label: 'One of a list' },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]['type'];

export interface MockField {
  key: string;
  type: FieldType;
  /** For integer, float and price. */
  min?: number;
  max?: number;
  /** For "one of a list": comma-separated choices. */
  choices?: string;
}

export type MockFormat = 'json' | 'json-min' | 'jsonl' | 'csv';

export const MAX_ROWS = 10_000;

const TYPES = new Set<string>(FIELD_TYPES.map((t) => t.type));
export const isFieldType = (t: unknown): t is FieldType => typeof t === 'string' && TYPES.has(t);

export const DEFAULT_FIELDS: MockField[] = [
  { key: 'id', type: 'id' },
  { key: 'name', type: 'fullName' },
  { key: 'email', type: 'email' },
  { key: 'city', type: 'city' },
  { key: 'active', type: 'boolean' },
  { key: 'createdAt', type: 'pastDate' },
];

/** Whether a stored value is a usable field list (for useSaved). */
export function isFieldList(v: unknown): v is MockField[] {
  return (
    Array.isArray(v) &&
    v.length <= 100 &&
    v.every((f) => f && typeof f === 'object' && typeof (f as MockField).key === 'string' && isFieldType((f as MockField).type))
  );
}

// ── Word lists (small on purpose) ────────────────────────────

const FIRST = ['Ada', 'Ben', 'Chloe', 'Dev', 'Elena', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kofi', 'Lena', 'Mateo', 'Nora', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sami', 'Tara', 'Uma', 'Victor', 'Wen', 'Yara', 'Zane'];
const LAST = ['Abbott', 'Brooks', 'Castillo', 'Dunn', 'Ellis', 'Fischer', 'Gray', 'Hughes', 'Iyer', 'Jensen', 'Khan', 'Lowe', 'Moreno', 'Novak', 'Okafor', 'Park', 'Quinlan', 'Reyes', 'Sato', 'Tanaka', 'Upton', 'Vance', 'Walsh', 'Young', 'Zhou'];
const CITIES = ['Lisbon', 'Toronto', 'Osaka', 'Nairobi', 'Melbourne', 'Austin', 'Lyon', 'Pune', 'Bergen', 'Quito', 'Seoul', 'Leeds', 'Porto', 'Denver', 'Kraków', 'Cork', 'Accra', 'Hanoi', 'Malmö', 'Valencia'];
const COUNTRIES = ['Portugal', 'Canada', 'Japan', 'Kenya', 'Australia', 'United States', 'France', 'India', 'Norway', 'Ecuador', 'South Korea', 'United Kingdom', 'Poland', 'Ireland', 'Ghana', 'Vietnam', 'Sweden', 'Spain', 'Brazil', 'Germany'];
const CO_A = ['Blue', 'North', 'Bright', 'Silver', 'Quiet', 'Red', 'Open', 'Little', 'Granite', 'Copper', 'Maple', 'Harbor'];
const CO_B = ['Fern', 'Peak', 'River', 'Field', 'Stone', 'Lantern', 'Orbit', 'Meadow', 'Anchor', 'Pine'];
const CO_C = ['Labs', 'Works', 'Studio', 'Systems', 'Co', 'Group', 'Supply', 'Digital'];
const JOB_LEVEL = ['Junior', 'Senior', 'Lead', 'Principal', 'Staff', ''];
const JOB_ROLE = ['Software Engineer', 'Designer', 'Product Manager', 'Data Analyst', 'Support Specialist', 'Accountant', 'Recruiter', 'Marketing Manager', 'QA Engineer', 'Sales Associate'];
const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat'.split(' ');
const DOMAINS = ['example.com', 'example.org', 'example.net'];
const DOC_NETS = ['192.0.2', '198.51.100', '203.0.113'];
const URL_PATHS = ['products', 'blog', 'users', 'docs', 'orders', 'help'];

// ── Random numbers ───────────────────────────────────────────

/** A 32-bit seed from any text (FNV-1a). */
export function seedFromText(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast and good enough for test data (not for secrets). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const int = (r: Rand, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;
const pad = (n: number | string, w = 2) => String(n).padStart(w, '0');
const hex = (r: Rand, bytes: number) => Array.from({ length: bytes }, () => pad(int(r, 0, 255).toString(16))).join('');
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

function uuid(r: Rand): string {
  const h = hex(r, 16).split('');
  h[12] = '4';
  h[16] = '89ab'[int(r, 0, 3)]!;
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function sentence(r: Rand): string {
  const words = Array.from({ length: int(r, 6, 12) }, () => pick(r, LOREM));
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

const DAY = 86_400_000;
const DATE_FROM = Date.UTC(2000, 0, 1);
const DATE_TO = Date.UTC(2030, 11, 31);

function range(f: MockField, dMin: number, dMax: number): [number, number] {
  let min = Number.isFinite(f.min) ? f.min! : dMin;
  let max = Number.isFinite(f.max) ? f.max! : dMax;
  if (min > max) [min, max] = [max, min];
  return [min, max];
}

interface Person {
  first: string;
  last: string;
}

/** One value. `person` is shared by the name, email and username fields of a row so they match. */
function value(f: MockField, r: Rand, row: number, person: () => Person, now: number): unknown {
  switch (f.type) {
    case 'id':
      return row + 1;
    case 'uuid':
      return uuid(r);
    case 'firstName':
      return person().first;
    case 'lastName':
      return person().last;
    case 'fullName': {
      const p = person();
      return `${p.first} ${p.last}`;
    }
    case 'email': {
      const p = person();
      return `${slugify(p.first)}.${slugify(p.last)}${int(r, 1, 99)}@${pick(r, DOMAINS)}`;
    }
    case 'username': {
      const p = person();
      return `${slugify(p.first)}_${slugify(p.last)}${int(r, 1, 999)}`;
    }
    case 'phone':
      return `+1-${int(r, 201, 989)}-555-01${pad(int(r, 0, 99))}`;
    case 'city':
      return pick(r, CITIES);
    case 'country':
      return pick(r, COUNTRIES);
    case 'company':
      return `${pick(r, CO_A)} ${pick(r, CO_B)} ${pick(r, CO_C)}`;
    case 'jobTitle':
      return `${pick(r, JOB_LEVEL)} ${pick(r, JOB_ROLE)}`.trim();
    case 'date':
      return new Date(DATE_FROM + Math.floor(r() * ((DATE_TO - DATE_FROM) / DAY + 1)) * DAY).toISOString().slice(0, 10);
    case 'datetime':
      return new Date(DATE_FROM + Math.floor(r() * (DATE_TO - DATE_FROM) / 1000) * 1000).toISOString();
    case 'pastDate':
      // Within the two years before `now`, to the second
      return new Date(now - Math.floor(r() * 730 * 86_400) * 1000 - 1000).toISOString();
    case 'boolean':
      return r() < 0.5;
    case 'integer': {
      const [min, max] = range(f, 1, 100);
      return int(r, Math.ceil(min), Math.floor(max));
    }
    case 'float': {
      const [min, max] = range(f, 0, 1);
      return Math.round((min + r() * (max - min)) * 1000) / 1000;
    }
    case 'price': {
      const [min, max] = range(f, 1, 500);
      return Math.round((min + r() * (max - min)) * 100) / 100;
    }
    case 'sentence':
      return sentence(r);
    case 'url':
      return `https://example.com/${pick(r, URL_PATHS)}/${int(r, 1, 9999)}`;
    case 'ip':
      return `${pick(r, DOC_NETS)}.${int(r, 1, 254)}`;
    case 'color':
      return `#${hex(r, 3)}`;
    case 'status': {
      const choices = (f.choices ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return pick(r, choices.length ? choices : ['active', 'pending', 'inactive']);
    }
  }
}

export interface MockOptions {
  rows: number;
  seed: number;
  /** "Now" for past dates; defaults to the start of today (UTC), so a seed gives the same rows all day. */
  now?: number;
}

export function generateRows(fields: MockField[], o: MockOptions): Record<string, unknown>[] {
  const rows = Math.max(0, Math.min(MAX_ROWS, Math.floor(o.rows) || 0));
  const now = o.now ?? Math.floor(Date.now() / DAY) * DAY;
  const r = mulberry32(o.seed);
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows; i++) {
    let p: Person | null = null;
    const person = () => (p ??= { first: pick(r, FIRST), last: pick(r, LAST) });
    const row: Record<string, unknown> = {};
    // defineProperty, so a key like "__proto__" is a plain key
    for (const f of fields) Object.defineProperty(row, f.key, { value: value(f, r, i, person, now), enumerable: true, writable: true, configurable: true });
    out.push(row);
  }
  return out;
}

function csvCell(v: unknown): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function formatRows(rows: Record<string, unknown>[], fields: MockField[], format: MockFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(rows, null, 2) + '\n';
    case 'json-min':
      return JSON.stringify(rows);
    case 'jsonl':
      return rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');
    case 'csv': {
      const keys = [...new Set(fields.map((f) => f.key))];
      const lines = [keys.map(csvCell).join(','), ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(','))];
      return lines.join('\r\n') + '\r\n';
    }
  }
}

/** Keys used more than once (only the last field with that key shows up in the output). */
export function duplicateKeys(fields: MockField[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const f of fields) (seen.has(f.key) ? dup : seen).add(f.key);
  return [...dup];
}
