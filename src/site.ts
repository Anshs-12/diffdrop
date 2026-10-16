/**
 * Where the site lives and which pages it has. Each page's <head> (title,
 * description, canonical and social tags), the build inputs, sitemap.xml and the
 * cross-links between tools are all generated from PAGES. Change SITE_URL if the
 * site moves to another domain.
 */
export const SITE_URL = 'https://diffdrop.anshx12.workers.dev';

export const REPO_URL = 'https://github.com/Anshs-12/diffdrop';

export type PageId =
  | 'home'
  | 'json-diff'
  | 'json-formatter'
  | 'json-validator'
  | 'json-to-csv'
  | 'json-to-yaml'
  | 'json-viewer';

export interface Page {
  id: PageId;
  /** URL path, ending in "/" (served from <dir>/index.html). */
  path: string;
  /** <title>, also used for social cards. */
  title: string;
  /** Meta and social description. */
  description: string;
  /** Short name for links between tools. */
  name: string;
  /** One-line summary for the tool links. */
  blurb: string;
  /** sitemap.xml priority. */
  priority: number;
}

export const PAGES: Page[] = [
  {
    id: 'home',
    path: '/',
    title: 'diffdrop - free diff checker, runs in your browser',
    description:
      'Compare text, code and JSON side by side, free and open source. Unlimited, no account, and your text never leaves your browser. It even works offline.',
    name: 'Diff checker',
    blurb: 'Compare two texts or files, line by line and word by word.',
    priority: 1.0,
  },
  {
    id: 'json-diff',
    path: '/json-diff/',
    title: 'JSON diff - compare two JSON files online, free | diffdrop',
    description:
      'Compare two JSON files online and see every changed key and value. Format and sort keys in one click. Free, no account; your data stays in your browser.',
    name: 'JSON diff',
    blurb: 'Compare two JSON files, ignoring key order and formatting.',
    priority: 0.8,
  },
  {
    id: 'json-formatter',
    path: '/json-formatter/',
    title: 'JSON formatter - beautify and minify JSON, free | diffdrop',
    description:
      'Format, beautify or minify JSON online. Pick the indentation, sort keys, and see errors by line and column. Free, and your JSON never leaves your browser.',
    name: 'JSON formatter',
    blurb: 'Beautify or minify JSON, with sorted keys if you like.',
    priority: 0.8,
  },
  {
    id: 'json-validator',
    path: '/json-validator/',
    title: 'JSON validator - check JSON syntax online, free | diffdrop',
    description:
      'Validate JSON online and find errors fast: the exact line and column, a plain explanation, duplicate-key warnings. Free, and nothing leaves your browser.',
    name: 'JSON validator',
    blurb: 'Check JSON syntax and see exactly where it breaks.',
    priority: 0.8,
  },
  {
    id: 'json-to-csv',
    path: '/json-to-csv/',
    title: 'JSON to CSV converter - free, online | diffdrop',
    description:
      'Convert JSON to CSV online. Nested objects become columns, arrays are kept, and the file opens cleanly in Excel. Free, and it all runs in your browser.',
    name: 'JSON to CSV',
    blurb: 'Turn a JSON array into a spreadsheet-ready CSV file.',
    priority: 0.8,
  },
  {
    id: 'json-to-yaml',
    path: '/json-to-yaml/',
    title: 'JSON to YAML converter - free, online | diffdrop',
    description:
      'Convert JSON to clean, valid YAML online, with strings quoted only when YAML needs it. Copy or download the result. Free, no account, runs in your browser.',
    name: 'JSON to YAML',
    blurb: 'Convert JSON into clean, valid YAML.',
    priority: 0.8,
  },
  {
    id: 'json-viewer',
    path: '/json-viewer/',
    title: 'JSON viewer - explore JSON as a tree online, free | diffdrop',
    description:
      'View JSON as a collapsible tree. Expand nodes, search keys and values, and copy the path to any value. Free, no account; your JSON stays in your browser.',
    name: 'JSON viewer',
    blurb: 'Explore JSON as a collapsible tree and copy paths.',
    priority: 0.8,
  },
];

export const TOOL_PAGES = PAGES.filter((p) => p.id !== 'home');

export function pageById(id: PageId): Page {
  return PAGES.find((p) => p.id === id)!;
}

/** Google Search Console ownership tag (homepage only). */
export const GOOGLE_SITE_VERIFICATION = 'K_izTuuq4Dnpo4aI4si3l061iVT7OJFH0enBQXFDvCg';
