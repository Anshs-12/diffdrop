import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, PAGES, SITE_URL } from '@/site';
import { markdownFile, markdownPath, pageForApiPath, pageForMarkdownPath, prefersMarkdown } from './negotiate';
import { approxTokens, markdownNotFound, markdownResponse } from './http';
import { htmlToMarkdown } from './html';
import { codeBlock, link } from './format';
import { listMarkdownRoutes, MARKDOWN_SKIP, RENDERERS, renderMarkdown } from './registry';
import { aiTxt, LLMS_FULL_LIMIT, llmsFullTxt, llmsTxt, robotsTxt, siteFiles } from './siteFiles';

const TODAY = '2026-10-26';

describe('content negotiation', () => {
  it('serves markdown only when text/markdown is named and ranked above HTML', () => {
    expect(prefersMarkdown('text/markdown')).toBe(true);
    expect(prefersMarkdown('text/markdown, text/html;q=0.9')).toBe(true);
    expect(prefersMarkdown('text/html;q=0.5, text/markdown;q=0.8')).toBe(true);
    expect(prefersMarkdown('text/markdown, text/html')).toBe(false); // a tie goes to HTML
    expect(prefersMarkdown('text/html, text/markdown;q=0.9')).toBe(false);
    expect(prefersMarkdown('text/markdown;q=0, text/html;q=0.1')).toBe(false);
  });

  it('always gives HTML to browsers, curl and link previews', () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown('')).toBe(false);
    expect(prefersMarkdown('*/*')).toBe(false);
    expect(prefersMarkdown('text/*')).toBe(false);
    expect(prefersMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8')).toBe(false);
    expect(prefersMarkdown('garbage;;;,')).toBe(false);
  });

  it('maps .md and /api/md URLs to pages', () => {
    expect(pageForMarkdownPath('/index.md')).toBe('/');
    expect(pageForMarkdownPath('/json-formatter.md')).toBe('/json-formatter/');
    expect(pageForMarkdownPath('/json-formatter/index.md')).toBe('/json-formatter/');
    expect(pageForMarkdownPath('/guides/compare-json-files.md')).toBe('/guides/compare-json-files/');
    expect(pageForMarkdownPath('/json-formatter/')).toBeNull();
    expect(pageForApiPath('/api/md')).toBe('/');
    expect(pageForApiPath('/api/md/')).toBe('/');
    expect(pageForApiPath('/api/md/json-formatter')).toBe('/json-formatter/');
    expect(pageForApiPath('/api/md/guides/compare-json-files/')).toBe('/guides/compare-json-files/');
    expect(pageForApiPath('/api/md/json-formatter.md')).toBe('/json-formatter/');
    expect(pageForApiPath('/apimd')).toBeNull();
    expect(markdownFile('/')).toBe('/_md/index.md');
    expect(markdownFile('/guides/compare-json-files/')).toBe('/_md/guides/compare-json-files.md');
    expect(markdownPath('/')).toBe('/index.md');
    expect(markdownPath('/json-formatter/')).toBe('/json-formatter.md');
  });
});

describe('markdown responses', () => {
  it('carry the type, token count, noindex, canonical, caching, CORS and date', async () => {
    const body = `# T\n\nLast updated: ${TODAY}\n`;
    const res = markdownResponse(body, { canonical: `${SITE_URL}/x/`, negotiated: true });
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('X-Markdown-Tokens')).toBe(String(approxTokens(body)));
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, follow');
    expect(res.headers.get('Content-Location')).toBe(`${SITE_URL}/x/`);
    expect(res.headers.get('Link')).toBe(`<${SITE_URL}/x/>; rel="canonical"`);
    expect(res.headers.get('Vary')).toBe('Accept');
    expect(res.headers.get('Cache-Control')).toMatch(/s-maxage=\d+, stale-while-revalidate=\d+/);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Last-Modified')).toBe('Mon, 26 Oct 2026 00:00:00 GMT');
    expect(await res.text()).toBe(body);
  });

  it('HEAD has the headers and no body; the 404 is markdown', async () => {
    const head = markdownResponse('# T\n', { method: 'HEAD' });
    expect(head.headers.get('X-Markdown-Tokens')).toBe('1');
    expect(await head.text()).toBe('');
    const missing = markdownNotFound('/nope/', SITE_URL);
    expect(missing.status).toBe(404);
    expect(missing.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(await missing.text()).toMatch(/^# Not found/);
  });
});

describe('markdown helpers', () => {
  it('writes absolute links and fences that fit the code', () => {
    expect(link('JSON [tools]', '/json-formatter/')).toBe(`[JSON \\[tools\\]](${SITE_URL}/json-formatter/)`);
    expect(link('x', 'https://example.com/a b')).toBe('[x](https://example.com/a%20b)');
    expect(codeBlock('a ``` b')).toBe('````\na ``` b\n````');
  });

  it('converts the site markup it renders', () => {
    const html =
      '<h2>Title &amp; more</h2><p>Use <code>a`b</code>, <strong>bold</strong> and <a href="/json-diff/">JSON diff</a>.</p>' +
      '<ul><li>one</li><li>two <em>x</em></li></ul><ol><li>first</li></ol><pre><code>{\n  "a": 1\n}</code></pre>' +
      '<details open=""><summary>Why?</summary><p>Because.</p></details><button>Copy</button><svg><path d="M0"/></svg>';
    expect(htmlToMarkdown(html)).toBe(
      [
        '## Title & more',
        `Use \`\`a\`b\`\`, **bold** and [JSON diff](${SITE_URL}/json-diff/).`,
        '- one\n- two *x*',
        '1. first',
        '```\n{\n  "a": 1\n}\n```',
        '### Why?',
        'Because.',
      ].join('\n\n'),
    );
  });
});

describe('every page has a markdown version', () => {
  it('has a renderer for every page in src/site.ts (or a reason to skip it)', () => {
    for (const p of PAGES) expect(p.id in RENDERERS || p.id in MARKDOWN_SKIP, `${p.id} needs a renderer in src/lib/md/registry.ts`).toBe(true);
    expect(listMarkdownRoutes()).toHaveLength(PAGES.length - Object.keys(MARKDOWN_SKIP).length);
  });

  it('renders each page with its title, summary, canonical URL and absolute links only', () => {
    for (const p of PAGES) {
      const md = renderMarkdown(p.id, TODAY);
      expect(md, p.id).toMatch(/^# .+\n\n> .+\n\nCanonical: https:\/\/toolspace\.tech\/.*\nLast updated: \d{4}-\d{2}-\d{2}\n\n/);
      expect(md, p.id).toContain(`Canonical: ${SITE_URL}${p.path}\n`);
      expect(md, p.id).not.toMatch(/\]\((?!https?:|mailto:)/); // no relative links
      expect(md, p.id).not.toMatch(/\]\([^)]*\.md\)/); // internal links go to the HTML pages
      // No markup left over outside code (examples and prose may show HTML as code)
      expect(md.replace(/(`{3,})[\s\S]*?\1/g, '').replace(/(`+)[^`\n]*?\1/g, ''), p.id).not.toMatch(/<\/?(div|span|button|svg)\b/);
      expect(md, p.id).not.toMatch(/(^|\(|\*\*|> )undefined\b/m); // a missing value, not the word in prose
    }
  });

  it('uses the same facts as the pages', () => {
    const tool = renderMarkdown('json-formatter', TODAY);
    expect(tool).toContain('# JSON formatter');
    expect(tool).toContain('## Questions\n\n### Does formatting change my data?');
    expect(tool).toContain(`[JSON validator](${SITE_URL}/json-validator/)`);
    const guide = renderMarkdown('guide-compare-json', TODAY);
    expect(guide).toContain('# How to compare two JSON files');
    expect(guide).toContain('Last updated: 2026-10-17');
    expect(guide).toMatch(/\n## .+/);
    expect(renderMarkdown('contact', TODAY)).toContain(CONTACT_EMAIL);
    const home = renderMarkdown('home', TODAY);
    expect(home).toContain(`- [Diff checker](${SITE_URL}/diff-checker/) - `);
    expect(home).not.toMatch(/\b\d+ tools\b/i);
  });
});

describe('site files for agents', () => {
  it('llms.txt follows llmstxt.org and links every page as markdown', () => {
    const txt = llmsTxt();
    expect(txt).toMatch(/^# toolspace\n\n> .+\n/);
    expect(txt).toContain('## Core pages');
    expect(txt).toContain(`[Full content](${SITE_URL}/llms-full.txt)`);
    for (const p of PAGES) expect(txt, p.id).toContain(`(${SITE_URL}${markdownPath(p.path)})`);
    expect(txt).toContain(CONTACT_EMAIL);
  });

  it('llms-full.txt holds every page, under the size limit', () => {
    const full = llmsFullTxt(TODAY);
    expect(full).toMatch(/^# toolspace - full content\n\n> .+\n\nGenerated: 2026-10-26\n/);
    for (const p of PAGES) expect(full, p.id).toContain(`<!-- source: ${SITE_URL}${p.path} -->\n# `);
    expect(full.length).toBeLessThan(LLMS_FULL_LIMIT);
  });

  it('ai.txt and robots.txt agree with llms.txt', () => {
    const ai = aiTxt(TODAY);
    for (const section of ['[identity]', '[permissions]', '[restrictions]', '[attribution]', '[scope]', '[contact]']) expect(ai).toContain(section);
    expect(ai).toContain(`url: ${SITE_URL}/`);
    expect(ai).toContain(`contact: ${CONTACT_EMAIL}`);
    expect(ai).toContain('Last updated: 2026-10-26');
    const robots = robotsTxt();
    for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider']) {
      expect(robots).toContain(`User-agent: ${bot}\n`);
    }
    expect(robots).not.toMatch(/Disallow: \/\s*$/m); // nothing is blocked wholesale
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(robots).toContain('/llms.txt');
    expect(robots).toContain('/ai.txt');
  });

  it('writes one markdown file per page and the catalog', () => {
    const files = siteFiles(TODAY);
    for (const p of PAGES) expect(files[markdownFile(p.path).slice(1)], p.id).toBeTruthy();
    const catalog = JSON.parse(files['_md/_catalog.json']!);
    expect(catalog.pages).toHaveLength(PAGES.length);
    expect(catalog.pages[0]).toMatchObject({ id: 'home', html: `${SITE_URL}/`, markdown: `${SITE_URL}/index.md` });
  });
});
