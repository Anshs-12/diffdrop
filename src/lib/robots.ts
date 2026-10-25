/**
 * robots.txt: build one from groups, parse one, and test a path against it
 * using the matching rules of RFC 9309. Pure functions.
 */

export type RuleType = 'allow' | 'disallow';
export interface Rule {
  type: RuleType;
  path: string;
}
export interface Group {
  agents: string[];
  rules: Rule[];
  /** Seconds, as text; empty for none. Not part of RFC 9309. */
  crawlDelay: string;
}
export interface RobotsConfig {
  groups: Group[];
  sitemaps: string[];
}

/** Crawler tokens offered in the builder, with who runs them. */
export const AGENTS: { token: string; who: string }[] = [
  { token: '*', who: 'every crawler' },
  { token: 'Googlebot', who: 'Google Search' },
  { token: 'Googlebot-Image', who: 'Google Images' },
  { token: 'Bingbot', who: 'Microsoft Bing' },
  { token: 'DuckDuckBot', who: 'DuckDuckGo' },
  { token: 'Applebot', who: 'Apple' },
  { token: 'YandexBot', who: 'Yandex' },
  { token: 'Baiduspider', who: 'Baidu' },
  { token: 'GPTBot', who: 'OpenAI' },
  { token: 'ChatGPT-User', who: 'OpenAI' },
  { token: 'OAI-SearchBot', who: 'OpenAI' },
  { token: 'Google-Extended', who: 'Google (a control token, not a separate crawler)' },
  { token: 'Applebot-Extended', who: 'Apple (a control token, not a separate crawler)' },
  { token: 'CCBot', who: 'Common Crawl' },
  { token: 'PerplexityBot', who: 'Perplexity' },
  { token: 'Bytespider', who: 'ByteDance' },
  { token: 'meta-externalagent', who: 'Meta' },
  { token: 'Amazonbot', who: 'Amazon' },
];

/** Tokens used by AI companies for training or AI answers, as published by their operators. */
export const AI_AGENTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'PerplexityBot', 'Bytespider', 'meta-externalagent'];

export const PRESETS: { id: string; label: string; config: () => RobotsConfig }[] = [
  { id: 'allow', label: 'Allow all', config: () => ({ groups: [{ agents: ['*'], rules: [], crawlDelay: '' }], sitemaps: [] }) },
  { id: 'block', label: 'Block all', config: () => ({ groups: [{ agents: ['*'], rules: [{ type: 'disallow', path: '/' }], crawlDelay: '' }], sitemaps: [] }) },
  {
    id: 'ai',
    label: 'Block AI crawlers',
    config: () => ({
      groups: [
        { agents: [...AI_AGENTS], rules: [{ type: 'disallow', path: '/' }], crawlDelay: '' },
        { agents: ['*'], rules: [], crawlDelay: '' },
      ],
      sitemaps: [],
    }),
  },
  { id: 'folder', label: 'Block a folder', config: () => ({ groups: [{ agents: ['*'], rules: [{ type: 'disallow', path: '/private/' }], crawlDelay: '' }], sitemaps: [] }) },
];

const clean = (s: string) => s.replace(/[\r\n#]/g, '').trim();

/** Writes the robots.txt text. A group with no rules gets an empty Disallow, which allows everything. */
export function buildRobots(config: RobotsConfig): string {
  const blocks: string[] = [];
  for (const g of config.groups) {
    const agents = g.agents.map(clean).filter(Boolean);
    if (!agents.length) continue;
    const lines = agents.map((a) => `User-agent: ${a}`);
    const rules = g.rules.filter((r) => clean(r.path));
    if (!rules.length) lines.push('Disallow:');
    for (const r of rules) lines.push(`${r.type === 'allow' ? 'Allow' : 'Disallow'}: ${clean(r.path)}`);
    const delay = clean(g.crawlDelay);
    if (delay) lines.push(`Crawl-delay: ${delay}`);
    blocks.push(lines.join('\n'));
  }
  const sitemaps = config.sitemaps.map(clean).filter(Boolean);
  if (sitemaps.length) blocks.push(sitemaps.map((s) => `Sitemap: ${s}`).join('\n'));
  return blocks.length ? blocks.join('\n\n') + '\n' : '';
}

export interface ParsedRule extends Rule {
  /** 1-based line number in the file. */
  line: number;
}
export interface ParsedGroup {
  agents: string[];
  rules: ParsedRule[];
  crawlDelay: string;
  line: number;
}
export interface ParsedRobots {
  groups: ParsedGroup[];
  sitemaps: string[];
  /** Lines that weren't understood, with why. */
  warnings: { line: number; message: string }[];
}

const KNOWN_OTHER = new Set(['host', 'clean-param', 'request-rate', 'visit-time', 'noindex', 'nofollow', 'noarchive']);

/** Parses robots.txt text the way RFC 9309 describes, keeping line numbers for the tester. */
export function parseRobots(text: string): ParsedRobots {
  const out: ParsedRobots = { groups: [], sitemaps: [], warnings: [] };
  let current: ParsedGroup | null = null;
  // A user-agent line directly after another one joins the same group
  let lastWasAgent = false;
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  lines.forEach((raw, i) => {
    const line = i + 1;
    const content = raw.replace(/#.*$/, '').trim();
    if (!content) return;
    const colon = content.indexOf(':');
    if (colon < 0) {
      out.warnings.push({ line, message: 'No colon: expected a line like “Disallow: /path”.' });
      return;
    }
    const key = content.slice(0, colon).trim().toLowerCase();
    const value = content.slice(colon + 1).trim();
    if (key === 'user-agent' || key === 'useragent' || key === 'user agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], crawlDelay: '', line };
        out.groups.push(current);
      }
      current.agents.push(value);
      lastWasAgent = true;
      return;
    }
    lastWasAgent = false;
    if (key === 'sitemap' || key === 'site-map') {
      out.sitemaps.push(value);
      return;
    }
    if (key === 'allow' || key === 'disallow' || key === 'dissallow' || key === 'disalow') {
      if (!current) {
        out.warnings.push({ line, message: 'A rule before any User-agent line belongs to no group and is ignored.' });
        return;
      }
      if (key !== 'allow' && key !== 'disallow') out.warnings.push({ line, message: `“${content.slice(0, colon)}” is a misspelling of Disallow; read as Disallow.` });
      current.rules.push({ type: key === 'allow' ? 'allow' : 'disallow', path: value, line });
      return;
    }
    if (key === 'crawl-delay') {
      if (current) current.crawlDelay = value;
      return;
    }
    if (!KNOWN_OTHER.has(key)) out.warnings.push({ line, message: `Unknown field “${content.slice(0, colon).trim()}”; crawlers ignore it.` });
  });
  return out;
}

/** The parsed file as builder groups (line numbers dropped). */
export function toConfig(p: ParsedRobots): RobotsConfig {
  return {
    groups: p.groups.map((g) => ({ agents: [...g.agents], rules: g.rules.map((r) => ({ type: r.type, path: r.path })), crawlDelay: g.crawlDelay })),
    sitemaps: [...p.sitemaps],
  };
}

/** Product token: the leading letters, digits, "_" and "-" (so "Googlebot/2.1" is "googlebot"). */
function token(s: string): string {
  const t = s.trim();
  if (t === '*') return '*';
  return (t.match(/^[A-Za-z0-9_-]*/)?.[0] ?? '').toLowerCase();
}

/**
 * Picks the groups that apply to a crawler: those whose user-agent equals its
 * product token (case-insensitive). If none does, the longest user-agent the
 * token starts with ("googlebot" for "googlebot-news", as Google documents);
 * then the "*" groups. Several groups for the same agent are combined.
 */
export function selectGroups(p: ParsedRobots, agent: string): { groups: ParsedGroup[]; matched: string | null } {
  const want = token(agent) || '*';
  const byAgent = new Map<string, ParsedGroup[]>();
  for (const g of p.groups) {
    for (const a of new Set(g.agents.map(token))) {
      if (!a) continue;
      const list = byAgent.get(a) ?? [];
      list.push(g);
      byAgent.set(a, list);
    }
  }
  if (want !== '*' && byAgent.has(want)) return { groups: byAgent.get(want)!, matched: want };
  let best: string | null = null;
  if (want !== '*') {
    for (const a of byAgent.keys()) {
      if (a !== '*' && want.startsWith(a) && (!best || a.length > best.length)) best = a;
    }
  }
  if (best) return { groups: byAgent.get(best)!, matched: best };
  if (byAgent.has('*')) return { groups: byAgent.get('*')!, matched: '*' };
  return { groups: [], matched: null };
}

/** Percent-encodes characters outside printable ASCII and uppercases existing escapes, so both sides compare alike. */
function normalize(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code > 0x20 && code < 0x7f) out += ch;
    else out += Array.from(new TextEncoder().encode(ch), (b) => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
  }
  return out.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase());
}

/** Whether a rule pattern matches the start of a path: "*" is any run of characters, a final "$" anchors the end. */
export function patternMatches(pattern: string, path: string): boolean {
  const pat = normalize(pattern);
  const p = normalize(path);
  const anchored = pat.endsWith('$');
  const body = anchored ? pat.slice(0, -1) : pat;
  const parts = body.split('*');
  // Glob matching without regex (no backtracking blow-up): greedy segment search
  if (parts.length === 1) return anchored ? p === body : p.startsWith(body);
  let pos = 0;
  const first = parts[0]!;
  if (!p.startsWith(first)) return false;
  pos = first.length;
  for (let i = 1; i < parts.length - 1; i++) {
    const seg = parts[i]!;
    const at = p.indexOf(seg, pos);
    if (at < 0) return false;
    pos = at + seg.length;
  }
  const last = parts[parts.length - 1]!;
  if (anchored) return p.length - last.length >= pos && p.endsWith(last);
  return p.indexOf(last, pos) >= 0;
}

/** The path part of a URL or path: "/a/b?q=1". Fragments are dropped. */
export function toPath(input: string): string {
  let s = input.trim();
  if (!s) return '/';
  const m = s.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(.*)$/i);
  if (m) s = m[1]!;
  s = s.replace(/#.*$/, '');
  if (!s.startsWith('/')) s = '/' + s;
  return s;
}

export interface TestResult {
  allowed: boolean;
  /** The rule that decided it, or null when no rule matched. */
  rule: ParsedRule | null;
  /** The user-agent of the group used ("*"), or null when no group applies. */
  agent: string | null;
  path: string;
  reason: string;
}

/**
 * Is this path allowed for this crawler? RFC 9309: the longest matching rule
 * wins (by pattern length); if an allow and a disallow are equally long, allow
 * wins; no matching rule means allowed. /robots.txt itself is always allowed.
 */
export function testPath(p: ParsedRobots, agent: string, url: string): TestResult {
  const path = toPath(url);
  const { groups, matched } = selectGroups(p, agent);
  if (path === '/robots.txt') return { allowed: true, rule: null, agent: matched, path, reason: '/robots.txt is always allowed.' };
  if (!matched) return { allowed: true, rule: null, agent: null, path, reason: 'No group applies to this crawler (and there’s no * group), so everything is allowed.' };
  let best: ParsedRule | null = null;
  let bestLen = -1;
  for (const g of groups) {
    for (const r of g.rules) {
      // An empty Disallow matches nothing
      if (!r.path) continue;
      if (!patternMatches(r.path, path)) continue;
      const len = normalize(r.path).length;
      if (len > bestLen || (len === bestLen && r.type === 'allow' && best?.type !== 'allow')) {
        best = r;
        bestLen = len;
      }
    }
  }
  const groupName = matched === '*' ? 'the * group' : `the ${matched} group`;
  if (!best) return { allowed: true, rule: null, agent: matched, path, reason: `No rule in ${groupName} matches, so it’s allowed.` };
  const allowed = best.type === 'allow';
  const label = `${allowed ? 'Allow' : 'Disallow'}: ${best.path}`;
  return { allowed, rule: best, agent: matched, path, reason: `${label} (line ${best.line}, ${groupName}) is the longest matching rule.` };
}
