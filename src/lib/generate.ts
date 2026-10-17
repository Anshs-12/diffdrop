/** Passwords (cryptographically random) and lorem ipsum. */

// ─────────────────────────────────────────────────────────────
// Passwords
// ─────────────────────────────────────────────────────────────

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  /** Leave out characters that are easy to confuse: Il1O0o and similar. */
  excludeAmbiguous: boolean;
}

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~',
};
const AMBIGUOUS = /[Il1O0o|`'";:,.]/g;

/** Uniform random integer in [0, max), from crypto, without modulo bias. */
export function randomInt(max: number): number {
  if (max <= 0) throw new Error('max must be positive');
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

export function passwordAlphabets(o: PasswordOptions): string[] {
  const sets: string[] = [];
  for (const key of ['lower', 'upper', 'digits', 'symbols'] as const) {
    if (!o[key]) continue;
    const chars = o.excludeAmbiguous ? SETS[key].replace(AMBIGUOUS, '') : SETS[key];
    if (chars) sets.push(chars);
  }
  return sets;
}

/**
 * A random password using the chosen sets, with at least one character from
 * each (when the length allows), in random order.
 */
export function generatePassword(o: PasswordOptions): string {
  const sets = passwordAlphabets(o);
  if (!sets.length || o.length < 1) return '';
  const all = sets.join('');
  const chars: string[] = [];
  for (const set of sets.slice(0, o.length)) chars.push(set[randomInt(set.length)]!);
  while (chars.length < o.length) chars.push(all[randomInt(all.length)]!);
  // Fisher–Yates, so the guaranteed characters aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

/** Bits of entropy for a random password of this length over this alphabet size. */
export function entropyBits(length: number, alphabet: number): number {
  return alphabet > 1 ? length * Math.log2(alphabet) : 0;
}

export function strengthLabel(bits: number): { label: string; level: 0 | 1 | 2 | 3 | 4 } {
  if (bits < 40) return { label: 'Very weak', level: 0 };
  if (bits < 60) return { label: 'Weak', level: 1 };
  if (bits < 80) return { label: 'Good', level: 2 };
  if (bits < 120) return { label: 'Strong', level: 3 };
  return { label: 'Very strong', level: 4 };
}

/** Rough time to try every password at 10 billion guesses a second (an offline attack on a fast hash). */
export function crackTime(bits: number): string {
  const seconds = 2 ** bits / 2 / 1e10;
  const units: [number, string][] = [
    [31557600 * 1e9, 'billion years'],
    [31557600 * 1e6, 'million years'],
    [31557600, 'years'],
    [86400, 'days'],
    [3600, 'hours'],
    [60, 'minutes'],
    [1, 'seconds'],
  ];
  if (seconds < 1) return 'instantly';
  if (seconds > 31557600 * 1e12) return 'longer than the universe has existed, many times over';
  for (const [size, name] of units) {
    if (seconds >= size) return `about ${Math.round(seconds / size).toLocaleString()} ${name}`;
  }
  return 'instantly';
}

// ─────────────────────────────────────────────────────────────
// Lorem ipsum
// ─────────────────────────────────────────────────────────────

const LOREM_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';
const WORDS =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc pulvinar sapien ligula suscipit morbi tristique senectus netus malesuada fames turpis egestas mauris vitae ultricies leo integer posuere urna nec quam viverra orci sagittis eu volutpat odio facilisis'.split(
    ' ',
  );

export type LoremUnit = 'paragraphs' | 'sentences' | 'words';

/** A small seeded generator, so "same seed, same text" works when wanted. */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function words(rand: () => number, n: number): string[] {
  return Array.from({ length: n }, () => WORDS[Math.floor(rand() * WORDS.length)]!);
}

function sentence(rand: () => number): string {
  const w = words(rand, 6 + Math.floor(rand() * 10));
  // A comma in longer sentences reads more naturally
  if (w.length > 9 && rand() < 0.6) w[3 + Math.floor(rand() * 4)] += ',';
  const s = w.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

function paragraph(rand: () => number): string {
  return Array.from({ length: 4 + Math.floor(rand() * 4) }, () => sentence(rand)).join(' ');
}

/**
 * Lorem ipsum text. With `classic`, it starts "Lorem ipsum dolor sit amet,
 * consectetur adipiscing elit…" like most placeholder text.
 */
export function lorem(unit: LoremUnit, count: number, options: { classic?: boolean; seed?: number } = {}): string[] {
  const rand = seeded(options.seed ?? Math.floor(Math.random() * 2 ** 31));
  const n = Math.max(1, Math.min(count, unit === 'words' ? 10_000 : 1_000));
  let out: string[];
  if (unit === 'words') {
    const w = words(rand, n);
    if (options.classic) LOREM_START.replace(',', '').toLowerCase().split(' ').slice(0, n).forEach((x, i) => (w[i] = x));
    const text = w.join(' ');
    out = [text.charAt(0).toUpperCase() + text.slice(1)];
  } else if (unit === 'sentences') {
    out = Array.from({ length: n }, () => sentence(rand));
    if (options.classic) out[0] = `${LOREM_START}.`;
  } else {
    out = Array.from({ length: n }, () => paragraph(rand));
    if (options.classic) out[0] = `${LOREM_START}, ${out[0]!.charAt(0).toLowerCase()}${out[0]!.slice(1)}`;
  }
  return out;
}
