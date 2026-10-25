import { describe, expect, it } from 'vitest';
import { EMPTY_META, buildMetaTags, charCount, displayUrl, escapeHtml, truncate, twitterHandle, warnings, type MetaInput } from './metaTags';
import content from '../tools/content/meta-tag-generator';

const m = (patch: Partial<MetaInput>): MetaInput => ({ ...EMPTY_META, ...patch });

describe('escapeHtml', () => {
  it('escapes & " < >', () => {
    expect(escapeHtml(`Tom & Jerry's "best" <b>`)).toBe(`Tom &amp; Jerry's &quot;best&quot; &lt;b&gt;`);
  });
  it('escapes & first so entities aren’t doubled wrongly', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
  it('leaves unicode alone', () => {
    expect(escapeHtml('Café ☕ 日本語 👩‍💻')).toBe('Café ☕ 日本語 👩‍💻');
  });
});

describe('buildMetaTags', () => {
  it('is only charset and viewport for an empty form', () => {
    expect(buildMetaTags(EMPTY_META)).toBe('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n');
    expect(buildMetaTags(m({ charset: false, viewport: false }))).toBe('');
  });
  it('escapes every value in attributes and the title', () => {
    const out = buildMetaTags(m({ title: 'A "quote" & <tag>', description: 'x"><script>alert(1)</script>', url: 'https://e.com/?a=1&b=2', charset: false, viewport: false }));
    expect(out).toContain('<title>A &quot;quote&quot; &amp; &lt;tag&gt;</title>');
    expect(out).toContain('<meta name="description" content="x&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">');
    expect(out).toContain('<link rel="canonical" href="https://e.com/?a=1&amp;b=2">');
    expect(out).not.toContain('<script>');
  });
  it('collapses newlines inside values', () => {
    expect(buildMetaTags(m({ description: 'one\ntwo\t three', charset: false, viewport: false }))).toContain('content="one two three"');
  });
  it('adds robots only when not index, follow', () => {
    expect(buildMetaTags(m({ title: 't' }))).not.toContain('robots');
    expect(buildMetaTags(m({ index: false }))).toContain('<meta name="robots" content="noindex, follow">');
    expect(buildMetaTags(m({ follow: false }))).toContain('<meta name="robots" content="index, nofollow">');
  });
  it('normalises the twitter handle', () => {
    expect(twitterHandle('toolspace')).toBe('@toolspace');
    expect(twitterHandle('@@toolspace')).toBe('@toolspace');
    expect(twitterHandle('https://x.com/toolspace')).toBe('@toolspace');
    expect(twitterHandle('https://twitter.com/toolspace/status/1')).toBe('@toolspace');
    expect(twitterHandle(' ')).toBe('');
  });
  it('the worked example matches the real output', () => {
    const ex = content.example!;
    const input = Object.fromEntries(ex.input.split('\n').map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()])) as Partial<MetaInput>;
    expect(buildMetaTags(m(input))).toBe(ex.output);
  });
  it('handles very long values', () => {
    const long = 'word '.repeat(20000);
    const out = buildMetaTags(m({ description: long }));
    expect(out.length).toBeGreaterThan(100000);
  });
});

describe('warnings', () => {
  it('flags relative URLs, missing alt and bad handles', () => {
    expect(warnings(m({ url: '/blog', image: 'img.png', twitterSite: 'this-is-not-valid!' }))).toHaveLength(4);
    expect(warnings(m({ url: 'https://e.com', image: 'https://e.com/i.png', imageAlt: 'x', twitterSite: '@ok', themeColor: '#fff' }))).toEqual([]);
    expect(warnings(m({ themeColor: 'blue' }))).toHaveLength(1);
  });
});

describe('counts and previews', () => {
  it('counts graphemes', () => {
    expect(charCount('')).toBe(0);
    expect(charCount('héllo')).toBe(5);
    expect(charCount('👩‍💻 ok')).toBe(4);
  });
  it('truncates at a word', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('The quick brown fox jumps over the lazy dog', 20)).toBe('The quick brown fox…');
    expect(truncate('a'.repeat(30), 10)).toBe('aaaaaaaaaa…');
  });
  it('shows a breadcrumb url', () => {
    expect(displayUrl('https://www.example.com/blog/my-post')).toBe('example.com › blog › my-post');
    expect(displayUrl('example.com')).toBe('example.com');
    expect(displayUrl('')).toBe('example.com');
    expect(displayUrl('https://例え.jp/パス')).toBe('xn--r8jz45g.jp › パス');
  });
});
