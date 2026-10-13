/**
 * Seeded pseudo-random numbers for property tests, so any failure can be
 * reproduced exactly from the seed printed in the test name.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random array of tokens drawn from a small alphabet (small alphabets force many matches). */
export function randomTokens(rand: () => number, maxLen: number, alphabet: string[]): string[] {
  const len = Math.floor(rand() * (maxLen + 1));
  return Array.from({ length: len }, () => alphabet[Math.floor(rand() * alphabet.length)]!);
}

/** Random multi-line text, sometimes with a final newline, sometimes CRLF. */
export function randomText(rand: () => number, maxLines: number, opts: { crlf?: boolean } = {}): string {
  const lines = randomTokens(rand, maxLines, ['alpha', 'beta', 'gamma', 'delta', '', '  indented', 'x = 1;']);
  if (lines.length === 0) return '';
  const eol = opts.crlf && rand() < 0.5 ? '\r\n' : '\n';
  return lines.join(eol) + (rand() < 0.5 ? eol : '');
}

/** Length of the longest common subsequence (reference implementation, O(nm)). */
export function lcsLength(a: string[], b: string[]): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    }
    prev = cur;
  }
  return prev[b.length]!;
}
