/**
 * Site files for AI agents and crawlers, generated at build time (see
 * prerender() in vite.config.ts) so they never go stale:
 *   /llms.txt       what the site is and where everything is (llmstxt.org)
 *   /llms-full.txt  every page's markdown in one file
 *   /ai.txt         how the content may be used (ai-txt spec v1.1.1)
 *   /robots.txt     crawler rules
 *   /_md/…          the markdown version of each page, served by the worker
 * robots.txt, llms.txt and ai.txt describe the same site: keep them in sync
 * (they're all built here from src/site.ts).
 */
import { CONTACT_EMAIL, PAGES, REPO_URL, SITE_NAME, SITE_URL, pageById, type PageId } from '@/site';
import { TOOL_ONLY_GROUPS } from '@/components/ToolShell';
import { link } from './format';
import { listMarkdownRoutes, renderMarkdown } from './registry';
import { CATALOG_PATH, markdownFile, markdownPath } from './negotiate';

/** The site in a few sentences, shared by llms.txt, llms-full.txt and ai.txt. */
export const SITE_DESCRIPTION =
  'toolspace is a free, open source collection of developer tools that run entirely in the browser: a diff checker, JSON tools, encoders and decoders, text, code, image and web utilities. Nothing typed or opened in a tool is uploaded, and there is no account, paid plan or usage limit.';

/** Paths kept out of crawling for everyone: the build's internal copies of the markdown (use the .md URLs instead). */
export const PRIVATE_PATHS = ['/_md/'];

/** Crawlers named in robots.txt, all allowed. Anything else falls under "User-agent: *", which is also allowed. */
const SEARCH_CRAWLERS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'];
const TRAINING_CRAWLERS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider'];

const mdLink = (id: PageId, text = pageById(id).name) => `- ${link(text, markdownPath(pageById(id).path))}: ${pageById(id).blurb}`;

export function robotsTxt(): string {
  const rules = ['Allow: /', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`)].join('\n');
  return `# robots.txt for ${SITE_NAME}. Keep in sync with /llms.txt and /ai.txt (all generated from src/site.ts).
# For AI agents: a guide to the site is at ${SITE_URL}/llms.txt, every page as markdown at ${SITE_URL}/llms-full.txt,
# and the content usage policy at ${SITE_URL}/ai.txt. Any page is also available as markdown by adding .md to its URL.

User-agent: *
${rules}

# AI search and user-fetch crawlers: allowed, so answer engines can cite these pages
${SEARCH_CRAWLERS.map((b) => `User-agent: ${b}`).join('\n')}
${rules}

# AI training crawlers: allowed
${TRAINING_CRAWLERS.map((b) => `User-agent: ${b}`).join('\n')}
${rules}

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

export function llmsTxt(): string {
  const guides: PageId[] = ['guide-compare-json', 'guide-json-to-csv'];
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is free to use with no account, paid plan or limits, and MIT licensed (source: ${REPO_URL}). It is for developers and anyone who works with text, data or code. Each tool is a page that does its work in the visitor's browser. Contact: ${CONTACT_EMAIL}. Every link below is the markdown version of a page; drop the .md for the HTML page.

<!-- Keep in sync with /robots.txt and /ai.txt (all generated from src/site.ts). -->

## Core pages
${mdLink('home', 'Home')}
${mdLink('about', 'About')}
${mdLink('contact', 'Contact')}

## Guides
${guides.map((id) => mdLink(id)).join('\n')}

${TOOL_ONLY_GROUPS.map((g) => `## Tools: ${g.label}\n${g.ids.map((id) => mdLink(id)).join('\n')}`).join('\n\n')}

## Machine-readable
- [Full content](${SITE_URL}/llms-full.txt): every page above as markdown, in one file
- [Markdown catalog](${SITE_URL}${CATALOG_PATH}): every page with its HTML and markdown URL, as JSON
- [Sitemap](${SITE_URL}/sitemap.xml): every HTML page
- [AI usage policy](${SITE_URL}/ai.txt): how the content may be used and cited

## Optional
- [Source code](${REPO_URL}): the whole site, MIT licensed
- [Report a bug or request a tool](${REPO_URL}/issues)
`;
}

/** Order for llms-full.txt: core pages, guides, tools by category. */
function fullOrder(): PageId[] {
  const order: PageId[] = ['home', 'about', 'contact', 'guide-compare-json', 'guide-json-to-csv', ...TOOL_ONLY_GROUPS.flatMap((g) => g.ids)];
  // Anything not placed above (a page added later) still goes in, at the end
  for (const p of PAGES) if (!order.includes(p.id)) order.push(p.id);
  return [...new Set(order)];
}

/** Above this size llms-full.txt gets too big for many agents to load whole. */
export const LLMS_FULL_LIMIT = 500_000;

export function llmsFullTxt(today: string): string {
  const parts = fullOrder().map((id) => `<!-- source: ${SITE_URL}${pageById(id).path} -->\n${renderMarkdown(id, today)}`);
  return `# ${SITE_NAME} - full content

> ${SITE_DESCRIPTION}

Generated: ${today}
Pages: every page of the site (${parts.length}); the list with descriptions is at ${SITE_URL}/llms.txt.

---
${parts.join('\n---\n')}`;
}

export function aiTxt(today: string): string {
  return `# ai.txt for ${SITE_NAME} (ai-txt spec v1.1.1)
# Keep in sync with /robots.txt and /llms.txt (all generated from src/site.ts).

[identity]
name: ${SITE_NAME}
url: ${SITE_URL}/
description: ${SITE_DESCRIPTION}
contact: ${CONTACT_EMAIL}
source: ${REPO_URL}
license: MIT (source code)

[permissions]
summarise: allowed
quote: allowed, with attribution
cite: allowed
index: allowed, for search and for answers
train: allowed

[restrictions]
fabricated-quotes: not allowed; quote the pages as written
fake-reviews: not allowed; ${SITE_NAME} publishes no reviews or ratings, so none may be attributed to it
misattribution: do not present this content as your own
user-data: none to use; tool input stays in the visitor's browser and is never sent to the site

[attribution]
format: ${SITE_NAME} (canonical page URL), for example: ${SITE_NAME} (${SITE_URL}/json-formatter/)
link: cite the HTML page, not its .md version

[scope]
include: /
exclude: ${PRIVATE_PATHS.join(', ')}
markdown: add .md to any page URL (${SITE_URL}/index.md for the home page), or send Accept: text/markdown

[contact]
email: ${CONTACT_EMAIL}
issues: ${REPO_URL}/issues

Last updated: ${today}
`;
}

/** /api/md/_catalog: every page with its HTML and markdown URLs. */
export function catalogJson(): string {
  return `${JSON.stringify({ site: SITE_NAME, url: `${SITE_URL}/`, pages: listMarkdownRoutes() }, null, 2)}\n`;
}

/**
 * Every generated file, keyed by its path in the build output.
 */
export function siteFiles(today: string): Record<string, string> {
  const files: Record<string, string> = {
    'robots.txt': robotsTxt(),
    'llms.txt': llmsTxt(),
    'llms-full.txt': llmsFullTxt(today),
    'ai.txt': aiTxt(today),
    '_md/_catalog.json': catalogJson(),
  };
  for (const p of PAGES) files[markdownFile(p.path).slice(1)] = renderMarkdown(p.id, today);
  return files;
}
