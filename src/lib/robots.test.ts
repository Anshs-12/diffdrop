import { describe, expect, it } from 'vitest';
import { PRESETS, buildRobots, parseRobots, patternMatches, selectGroups, testPath, toConfig, toPath } from './robots';

const allowed = (txt: string, agent: string, path: string) => testPath(parseRobots(txt), agent, path).allowed;

describe('buildRobots', () => {
  it('writes groups, rules, crawl-delay and sitemaps', () => {
    expect(
      buildRobots({
        groups: [
          { agents: ['*'], rules: [{ type: 'disallow', path: '/admin/' }, { type: 'allow', path: '/admin/help' }], crawlDelay: '' },
          { agents: ['GPTBot', 'CCBot'], rules: [{ type: 'disallow', path: '/' }], crawlDelay: '10' },
        ],
        sitemaps: ['https://example.com/sitemap.xml'],
      }),
    ).toBe(
      'User-agent: *\nDisallow: /admin/\nAllow: /admin/help\n\nUser-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\nCrawl-delay: 10\n\nSitemap: https://example.com/sitemap.xml\n',
    );
  });
  it('gives an empty group an empty Disallow', () => {
    expect(buildRobots({ groups: [{ agents: ['*'], rules: [], crawlDelay: '' }], sitemaps: [] })).toBe('User-agent: *\nDisallow:\n');
  });
  it('is empty for nothing, and drops blank agents and rules', () => {
    expect(buildRobots({ groups: [], sitemaps: [] })).toBe('');
    expect(buildRobots({ groups: [{ agents: [' '], rules: [], crawlDelay: '' }], sitemaps: [' '] })).toBe('');
    expect(buildRobots({ groups: [{ agents: ['*'], rules: [{ type: 'allow', path: '  ' }], crawlDelay: '' }], sitemaps: [] })).toBe('User-agent: *\nDisallow:\n');
  });
  it('strips newlines and # so a value can’t inject lines', () => {
    expect(buildRobots({ groups: [{ agents: ['*\nDisallow: /'], rules: [{ type: 'disallow', path: '/a#b' }], crawlDelay: '' }], sitemaps: [] })).toBe(
      'User-agent: *Disallow: /\nDisallow: /ab\n',
    );
  });
  it('presets build and round-trip through the parser', () => {
    for (const p of PRESETS) {
      const txt = buildRobots(p.config());
      expect(buildRobots(toConfig(parseRobots(txt)))).toBe(txt);
    }
    expect(buildRobots(PRESETS.find((p) => p.id === 'block')!.config())).toBe('User-agent: *\nDisallow: /\n');
  });
});

describe('parseRobots', () => {
  it('groups consecutive user-agents, keeps lines and sitemaps', () => {
    const p = parseRobots('﻿# comment\nUser-agent: a\nuser-agent: b\nDisallow: /x # trailing\n\nUSER-AGENT: c\nAllow: /\nSitemap: https://e.com/s.xml\r\nCrawl-delay: 5\n');
    expect(p.groups.map((g) => g.agents)).toEqual([['a', 'b'], ['c']]);
    expect(p.groups[0]!.rules).toEqual([{ type: 'disallow', path: '/x', line: 4 }]);
    expect(p.groups[1]!.crawlDelay).toBe('5');
    expect(p.sitemaps).toEqual(['https://e.com/s.xml']);
    expect(p.warnings).toEqual([]);
  });
  it('a user-agent after rules starts a new group', () => {
    const p = parseRobots('User-agent: a\nDisallow: /\nUser-agent: b\nDisallow: /b');
    expect(p.groups.length).toBe(2);
  });
  it('warns about junk, orphan rules and misspellings', () => {
    const p = parseRobots('Disallow: /\nnonsense\nUser-agent: *\nDissallow: /x\nFoo: bar\nHost: e.com');
    expect(p.warnings.map((w) => w.line)).toEqual([1, 2, 4, 5]);
    expect(p.groups[0]!.rules[0]!.type).toBe('disallow');
  });
  it('handles empty and huge input', () => {
    expect(parseRobots('')).toEqual({ groups: [], sitemaps: [], warnings: [] });
    const big = 'User-agent: *\n' + Array.from({ length: 50000 }, (_, i) => `Disallow: /p${i}/`).join('\n');
    const p = parseRobots(big);
    expect(p.groups[0]!.rules.length).toBe(50000);
    expect(testPath(p, 'x', '/p49999/a').allowed).toBe(false);
    expect(testPath(p, 'x', '/q').allowed).toBe(true);
  });
});

describe('patternMatches', () => {
  it.each([
    ['/', '/anything', true],
    ['/fish', '/fish', true],
    ['/fish', '/fish.html', true],
    ['/fish', '/fishheads/yummy.html', true],
    ['/fish', '/Fish.asp', false],
    ['/fish', '/catfish', false],
    ['/fish*', '/fish.php?id=1', true],
    ['/fish/', '/fish', false],
    ['/*.php', '/index.php', true],
    ['/*.php', '/folder/filename.php?parameters', true],
    ['/*.php', '/windows.PHP', false],
    ['/*.php$', '/filename.php', true],
    ['/*.php$', '/filename.php?parameters', false],
    ['/*.php$', '/filename.php/', false],
    ['/fish*.php', '/fish.php', true],
    ['/fish*.php', '/fishheads/catfish.php?parameters', true],
    ['/fish*.php', '/Fish.PHP', false],
    ['/*', '/', true],
    ['*', '/x', true],
    ['/a*b*c$', '/a1b2c', true],
    ['/a*b*c$', '/a1b2c3', false],
    ['/a*b*c$', '/abcbc', true],
    ['/$', '/', true],
    ['/$', '/a', false],
    ['/café', '/caf%C3%A9/menu', true],
    ['/caf%c3%a9', '/café', true],
    ['/' + '*a'.repeat(200), '/' + 'a'.repeat(5000), true],
  ])('%j vs %j → %s', (pat, path, want) => expect(patternMatches(pat, path)).toBe(want));
});

describe('testPath (RFC 9309)', () => {
  it('longest match wins', () => {
    const txt = 'User-agent: *\nDisallow: /shop/\nAllow: /shop/public/\nDisallow: /shop/public/drafts/';
    expect(allowed(txt, 'x', '/shop/cart')).toBe(false);
    expect(allowed(txt, 'x', '/shop/public/item')).toBe(true);
    expect(allowed(txt, 'x', '/shop/public/drafts/1')).toBe(false);
    expect(allowed(txt, 'x', '/blog')).toBe(true);
  });
  it('allow wins a tie', () => {
    expect(allowed('User-agent: *\nDisallow: /page\nAllow: /page', 'x', '/page')).toBe(true);
    expect(allowed('User-agent: *\nAllow: /page\nDisallow: /page', 'x', '/page')).toBe(true);
    // Same length with wildcards: /*.html (7) vs /page/ (6), so disallow wins
    expect(allowed('User-agent: *\nAllow: /page/\nDisallow: /*.html', 'x', '/page/a.html')).toBe(false);
  });
  it('longer wildcard rule beats shorter literal', () => {
    expect(allowed('User-agent: *\nAllow: /\nDisallow: /*?sessionid=', 'x', '/a?sessionid=1')).toBe(false);
    expect(allowed('User-agent: *\nDisallow: /*.pdf$\n', 'x', '/files/a.pdf')).toBe(false);
    expect(allowed('User-agent: *\nDisallow: /*.pdf$\n', 'x', '/files/a.pdf?x')).toBe(true);
  });
  it('empty Disallow allows everything', () => {
    expect(allowed('User-agent: *\nDisallow:', 'x', '/anything')).toBe(true);
  });
  it('no file, no group or no match means allowed', () => {
    expect(allowed('', 'Googlebot', '/a')).toBe(true);
    expect(allowed('User-agent: Bingbot\nDisallow: /', 'Googlebot', '/a')).toBe(true);
  });
  it('/robots.txt is always allowed', () => {
    expect(allowed('User-agent: *\nDisallow: /', 'x', '/robots.txt')).toBe(true);
  });
  it('picks the most specific group and falls back to *', () => {
    const txt = 'User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\nDisallow: /private\n\nUser-agent: Googlebot-News\nDisallow: /archive';
    expect(allowed(txt, 'Googlebot', '/a')).toBe(true);
    expect(allowed(txt, 'googlebot', '/private/x')).toBe(false);
    expect(allowed(txt, 'Googlebot-News', '/private/x')).toBe(true); // its own group has no /private rule
    expect(allowed(txt, 'Googlebot-News', '/archive/1')).toBe(false);
    expect(allowed(txt, 'Googlebot-Image', '/private')).toBe(false); // falls back to googlebot
    expect(allowed(txt, 'Googlebot-Image', '/a')).toBe(true);
    expect(allowed(txt, 'Bingbot', '/a')).toBe(false); // the * group
    expect(selectGroups(parseRobots(txt), 'Googlebot-Image').matched).toBe('googlebot');
  });
  it('rules of the * group don’t leak into a specific group', () => {
    const txt = 'User-agent: *\nDisallow: /secret\n\nUser-agent: GPTBot\nDisallow: /';
    expect(allowed(txt, 'GPTBot', '/a')).toBe(false);
    expect(allowed('User-agent: *\nDisallow: /secret\n\nUser-agent: Bingbot\nDisallow: /x', 'Bingbot', '/secret')).toBe(true);
  });
  it('combines groups for the same agent', () => {
    const txt = 'User-agent: a\nDisallow: /one\n\nUser-agent: b\nDisallow: /b\n\nUser-agent: A\nDisallow: /two';
    expect(allowed(txt, 'a', '/one')).toBe(false);
    expect(allowed(txt, 'a', '/two')).toBe(false);
    expect(allowed(txt, 'a', '/b')).toBe(true);
  });
  it('matches user-agent case-insensitively and by product token', () => {
    expect(allowed('User-agent: googlebot/2.1\nDisallow: /', 'GOOGLEBOT', '/a')).toBe(false);
  });
  it('is case-sensitive on paths', () => {
    expect(allowed('User-agent: *\nDisallow: /Admin', 'x', '/admin')).toBe(true);
  });
  it('accepts full URLs and reports the deciding rule', () => {
    const r = testPath(parseRobots('User-agent: *\nDisallow: /a\nAllow: /a/b'), 'x', 'https://example.com/a/c?x=1#frag');
    expect(r).toMatchObject({ allowed: false, path: '/a/c?x=1', agent: '*', rule: { type: 'disallow', path: '/a', line: 2 } });
    expect(r.reason).toMatch(/line 2/);
  });
});

it('toPath', () => {
  expect(toPath('')).toBe('/');
  expect(toPath('a/b')).toBe('/a/b');
  expect(toPath('http://e.com')).toBe('/');
  expect(toPath('https://e.com:8080/x?y#z')).toBe('/x?y');
});

it('the worked example matches the real output', async () => {
  const { default: content } = await import('../tools/content/robots-txt');
  const out = buildRobots({
    groups: [{ agents: ['*'], rules: [{ type: 'disallow', path: '/cart/' }, { type: 'disallow', path: '/account/' }, { type: 'allow', path: '/account/help/' }], crawlDelay: '' }],
    sitemaps: ['https://example.com/sitemap.xml'],
  });
  expect(out).toBe(content.example!.output);
  expect(testPath(parseRobots(out), 'Googlebot', '/account/help/returns').allowed).toBe(true);
});
