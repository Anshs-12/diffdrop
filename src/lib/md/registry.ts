/**
 * The markdown version of every page, rendered from the same data as the HTML
 * page (src/site.ts, the tools' content, the guides) rather than scraped from
 * it. Each page id has one renderer; listMarkdownRoutes() and the site files
 * (llms.txt, llms-full.txt, the catalog) are built from this registry, so a
 * new page needs only a renderer here (a test fails if one is missing).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { PAGES, SITE_URL, pageById, type Page, type PageId } from '@/site';
import { TOOL_CONTENT, type ToolContent, type ToolId } from '@/tools/content';
import { DIFF_CONTENT } from '@/components/diffContent';
import { GUIDES, type GuideId } from '@/guides/content';
import { GUIDE_META } from '@/guides/meta';
import { TOOL_ONLY_GROUPS } from '@/components/ToolShell';
import { POPULAR, PROMISES } from '@/home/HomeApp';
import { BADGES } from '@/home/badges';
import { absoluteUrl, blocks, codeBlock, escapeText, link, plain } from './format';
import { htmlToMarkdown } from './html';
import { markdownPath } from './negotiate';

export interface MarkdownPage {
  title: string;
  /** One sentence under the title (the page's description). */
  summary: string;
  body: string;
  /** Other pages worth reading next. */
  related?: PageId[];
  /** YYYY-MM-DD, when known; otherwise the build date. */
  updated?: string;
}

type Renderer = (page: Page) => MarkdownPage;

const listItem = (id: PageId) => `- ${link(pageById(id).name, pageById(id).path)} - ${pageById(id).blurb}`;

const faq = (items: { q: string; a: string }[]) => items.map(({ q, a }) => `### ${plain(escapeText(q))}\n\n${plain(a)}`).join('\n\n');

const steps = (items: { title: string; body: string }[]) => items.map((s, i) => `${i + 1}. **${plain(s.title)}:** ${plain(s.body)}`).join('\n');

/** A tool page: what it does, a worked example, common mistakes, how to use it, questions. */
function toolPage(id: ToolId, page: Page): MarkdownPage {
  const c: ToolContent = TOOL_CONTENT[id];
  return {
    title: c.h1,
    summary: page.description,
    body: blocks(
      plain(c.lede),
      `This is an interactive tool that runs in the browser: ${link(`open the ${page.name}`, page.path)} to use it. Nothing typed into it is uploaded.`,
      c.example &&
        blocks(
          '## Worked example',
          plain(c.example.intro),
          `**${c.example.inputLabel}**`,
          codeBlock(c.example.input),
          `**${c.example.outputLabel}**`,
          codeBlock(c.example.output),
          c.example.note && plain(c.example.note),
        ),
      c.mistakes && blocks('## Common mistakes', c.mistakes.map((m) => `### ${plain(escapeText(m.title))}\n\n${plain(m.body)}`).join('\n\n')),
      blocks('## How it works', steps(c.steps)),
      c.faq.length > 0 && blocks('## Questions', faq(c.faq)),
    ),
    related: c.related,
  };
}

/** The two diff pages (their content lives with the diff app). */
function diffPage(variant: 'text' | 'json', page: Page): MarkdownPage {
  const c = DIFF_CONTENT[variant];
  return {
    title: c.title,
    summary: page.description,
    body: blocks(
      plain(c.description),
      `This is an interactive tool that runs in the browser: ${link(`open the ${page.name}`, page.path)} to use it. Nothing typed into it is uploaded.`,
      blocks(`## ${c.stepsTitle}`, steps(c.steps)),
      blocks('## Questions', faq(c.faq)),
    ),
    related: variant === 'text' ? ['json-diff', 'guide-compare-json'] : ['diff-checker', 'guide-compare-json', 'json-formatter'],
  };
}

/** Guides, about and contact: their JSX, rendered and converted. */
function guidePage(id: GuideId): MarkdownPage {
  const meta = GUIDE_META[id];
  return {
    title: meta.h1,
    summary: meta.lede,
    body: htmlToMarkdown(renderToStaticMarkup(GUIDES[id].body)),
    updated: meta.published,
  };
}

/** The home page: what the site is, the popular tools, every tool by category. */
function homePage(page: Page): MarkdownPage {
  return {
    title: 'All the developer tools, in one place. Free. Open source.',
    summary: page.description,
    body: blocks(
      'No login, no sign-up, no uploads, no limits.',
      blocks('## Popular tools', POPULAR.map(listItem).join('\n')),
      blocks('## All tools', TOOL_ONLY_GROUPS.map((g) => blocks(`### ${g.label}`, g.ids.map(listItem).join('\n'))).join('\n\n')),
      blocks('## Why toolspace', PROMISES.map((p) => `- **${p.title}.** ${p.body}`).join('\n')),
      BADGES.length > 0 && blocks('## Featured on', BADGES.map((b) => `- ${link(b.name, b.href)}`).join('\n')),
    ),
    related: ['about', 'contact', 'guide-compare-json', 'guide-json-to-csv'],
  };
}

const isTool = (id: PageId): id is ToolId => id in TOOL_CONTENT;

/** One renderer per page id. */
export const RENDERERS: Record<PageId, Renderer> = Object.fromEntries(
  PAGES.map((p): [PageId, Renderer] => {
    if (p.id === 'home') return [p.id, homePage];
    if (p.id === 'diff-checker') return [p.id, (page) => diffPage('text', page)];
    if (p.id === 'json-diff') return [p.id, (page) => diffPage('json', page)];
    if (p.id in GUIDE_META) return [p.id, () => guidePage(p.id as GuideId)];
    if (isTool(p.id)) return [p.id, (page) => toolPage(p.id as ToolId, page)];
    throw new Error(`No markdown renderer for page "${p.id}": add one in src/lib/md/registry.ts`);
  }),
) as Record<PageId, Renderer>;

/** Pages that deliberately have no markdown version, with the reason. None today. */
export const MARKDOWN_SKIP: Partial<Record<PageId, string>> = {};

/** The full markdown document for a page. `today` (YYYY-MM-DD) stands in when the page has no date of its own. */
export function renderMarkdown(id: PageId, today: string): string {
  const page = pageById(id);
  const md = RENDERERS[id](page);
  const related = (md.related ?? []).filter((r) => r !== id);
  return `${blocks(
    `# ${md.title}`,
    `> ${md.summary}`,
    `Canonical: ${SITE_URL}${page.path}\nLast updated: ${md.updated ?? today}`,
    md.body,
    related.length > 0 && blocks('## Related', related.map((r) => `- ${link(pageById(r).name, pageById(r).path)}`).join('\n')),
  )}\n`;
}

export interface MarkdownRoute {
  id: PageId;
  title: string;
  description: string;
  /** The page itself (canonical). */
  html: string;
  /** Its markdown version. */
  markdown: string;
}

/** Every page that has a markdown version. */
export function listMarkdownRoutes(): MarkdownRoute[] {
  return PAGES.filter((p) => !(p.id in MARKDOWN_SKIP)).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    html: absoluteUrl(p.path),
    markdown: absoluteUrl(markdownPath(p.path)),
  }));
}
