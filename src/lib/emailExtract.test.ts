import { describe, expect, it } from 'vitest';
import { DEFAULT_EMAIL, extractEmails, findEmails, parseDomains, type EmailOptions } from './emailExtract';

const o = (p: Partial<EmailOptions> = {}): EmailOptions => ({ ...DEFAULT_EMAIL, ...p });

describe('findEmails', () => {
  it('finds addresses in prose and markup', () => {
    const text = `Write to ada@example.com, or (grace.hopper+navy@mail.us.example.org).
<a href="mailto:alan@example.co.uk?subject=Hi">Alan</a> — 'quoted@example.net'; <linus@example.fi>.`;
    expect(findEmails(text)).toEqual(['ada@example.com', 'grace.hopper+navy@mail.us.example.org', 'alan@example.co.uk', 'quoted@example.net', 'linus@example.fi']);
  });

  it('strips trailing punctuation and leading dots', () => {
    expect(findEmails('Email bob@example.com.')).toEqual(['bob@example.com']);
    expect(findEmails('...bob@example.com...')).toEqual(['bob@example.com']);
    expect(findEmails('bob@example.com-')).toEqual(['bob@example.com']);
    expect(findEmails('"bob@example.com"')).toEqual(['bob@example.com']);
  });

  it('skips things that only look like addresses', () => {
    expect(findEmails('logo@2x.png icon@3x.webp')).toEqual([]);
    expect(findEmails('user@localhost')).toEqual([]);
    expect(findEmails('@handle and a@b and x@1.2.3.4')).toEqual([]);
    expect(findEmails('bad..dots@example.com')).toEqual([]);
    expect(findEmails('trailing.@example.com')).toEqual([]);
    expect(findEmails('a@-example.com a@example-.com')).toEqual([]);
    expect(findEmails('https://example.com/@user')).toEqual([]);
  });

  it('keeps the query string out (?, =, &)', () => {
    expect(findEmails('https://x.example/?email=jo@example.com&x=1')).toEqual(['jo@example.com']);
  });

  it('handles unicode addresses', () => {
    expect(findEmails('José: josé@exämple.de, 用户@例子.广告, Ру: иван@почта.рф')).toEqual(['josé@exämple.de', '用户@例子.广告', 'иван@почта.рф']);
    expect(findEmails('😀bob@example.com')).toEqual(['bob@example.com']);
    expect(findEmails('a@xn--bcher-kva.example')).toEqual(['a@xn--bcher-kva.example']);
  });

  it('rejects local parts and domains over the length limits', () => {
    expect(findEmails(`${'a'.repeat(65)}@example.com`)).toEqual([]);
    expect(findEmails(`${'a'.repeat(64)}@example.com`)).toHaveLength(1);
    expect(findEmails(`a@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(70)}.com`)).toEqual([]);
  });

  it('is linear on adversarial input', () => {
    const cases = [
      'a'.repeat(200_000) + '@',
      '@'.repeat(200_000),
      'a@'.repeat(100_000),
      'a.'.repeat(100_000) + '@' + 'b.'.repeat(100_000),
      ('x'.repeat(60) + '@' + 'y-'.repeat(120)).repeat(2_000),
    ];
    for (const text of cases) {
      const t = performance.now();
      findEmails(text);
      expect(performance.now() - t, `${text.slice(0, 10)}… (${text.length})`).toBeLessThan(1500);
    }
  });

  it('finds many addresses in a big text', () => {
    const text = Array.from({ length: 50_000 }, (_, i) => `user${i}@example.com`).join(' filler, ');
    const t = performance.now();
    expect(findEmails(text)).toHaveLength(50_000);
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe('extractEmails', () => {
  const text = 'Ada@Example.COM, ada@example.com, Ada@example.com, bob@sub.example.com, zed@other.org, carl@notexample.com';
  it('dedupes with the domain compared case-insensitively', () => {
    const r = extractEmails(text, o());
    expect(r.emails).toEqual(['Ada@example.com', 'ada@example.com', 'bob@sub.example.com', 'zed@other.org', 'carl@notexample.com']);
    expect(r).toMatchObject({ found: 6, duplicates: 1, filtered: 0 });
    expect(extractEmails(text, o({ dedupe: false })).emails).toHaveLength(6);
    expect(extractEmails(text, o({ lowercase: true })).emails).toHaveLength(4);
  });
  it('filters by domain, subdomains included', () => {
    const r = extractEmails(text, o({ domains: '@Example.com, other.org' }));
    expect(r.emails).toEqual(['Ada@example.com', 'ada@example.com', 'bob@sub.example.com', 'zed@other.org']);
    expect(r.filtered).toBe(1);
    expect(parseDomains(' .a.com;b.org  c.net ')).toEqual(['a.com', 'b.org', 'c.net']);
  });
  it('sorts and joins', () => {
    expect(extractEmails('c@x.io b@y.io a@z.io B@y.io', o({ sort: true, separator: 'comma' })).output).toBe('a@z.io, B@y.io, b@y.io, c@x.io');
    expect(extractEmails('a@x.io b@x.io', o({ separator: 'semicolon' })).output).toBe('a@x.io; b@x.io');
    expect(extractEmails('a@x.io b@x.io', o()).output).toBe('a@x.io\nb@x.io');
  });
  it('returns nothing for empty text', () => {
    expect(extractEmails('', o())).toEqual({ emails: [], found: 0, duplicates: 0, filtered: 0, output: '' });
  });
  it('matches the page’s worked example', async () => {
    const { default: content } = await import('../tools/content/email-extractor');
    expect(extractEmails(content.example!.input, o()).output).toBe(content.example!.output);
  });
});
