import { describe, expect, it } from 'vitest';
import { DEFAULT_SLUG, slugify, slugifyLines, transliterate } from './slug';

const opts = (o: Partial<typeof DEFAULT_SLUG>) => ({ ...DEFAULT_SLUG, ...o });

describe('slugify', () => {
  it('makes plain slugs', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  10 Tips -- for   Better   Sleep  ')).toBe('10-tips-for-better-sleep');
    expect(slugify('What’s new in v2.0?')).toBe('whats-new-in-v2-0');
    expect(slugify('Tom & Jerry')).toBe('tom-and-jerry');
  });

  it('transliterates accents and special letters', () => {
    expect(slugify('Crème Brûlée à la carte')).toBe('creme-brulee-a-la-carte');
    expect(slugify('Straße Ærø Łódź Đorđe')).toBe('strasse-aero-lodz-dorde');
    expect(transliterate('ﬁancé')).toBe('fiance');
  });

  it('drops emoji and symbols and collapses separators', () => {
    expect(slugify('🚀 Launch day!!! 🎉 — 100% done ✓')).toBe('launch-day-100-done');
    expect(slugify('a___b---c', opts({ separator: '_' }))).toBe('a_b_c');
  });

  it('keeps letters from other scripts', () => {
    expect(slugify('Привет мир')).toBe('привет-мир');
  });

  it('respects the options', () => {
    expect(slugify('Hello World', opts({ lowercase: false, separator: '_' }))).toBe('Hello_World');
    expect(slugify('The Art of the Deal', opts({ removeStopWords: true }))).toBe('art-deal');
    expect(slugify('The And Of', opts({ removeStopWords: true }))).toBe('the-and-of');
  });

  it('trims to a word boundary', () => {
    expect(slugify('How to write a good URL slug', opts({ maxLength: 15 }))).toBe('how-to-write-a');
    expect(slugify('How to write', opts({ maxLength: 12 }))).toBe('how-to-write');
    expect(slugify('How to write', opts({ maxLength: 6 }))).toBe('how-to');
    expect(slugify('Supercalifragilistic', opts({ maxLength: 5 }))).toBe('super');
  });

  it('handles empty and symbol-only input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('!!! 😀 ???')).toBe('');
  });

  it('works line by line and on large input', () => {
    expect(slugifyLines('First Post\n\nSecond Post', DEFAULT_SLUG)).toBe('first-post\n\nsecond-post');
    const big = Array.from({ length: 20_000 }, (_, i) => `Title number ${i}`).join('\n');
    const out = slugifyLines(big, DEFAULT_SLUG).split('\n');
    expect(out).toHaveLength(20_000);
    expect(out[19_999]).toBe('title-number-19999');
  });
});
