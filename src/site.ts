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
  | 'diff-checker'
  | 'json-diff'
  | 'json-formatter'
  | 'json-validator'
  | 'json-to-csv'
  | 'json-to-yaml'
  | 'json-viewer'
  | 'base64'
  | 'unix-timestamp'
  | 'jwt-decoder'
  | 'regex-tester'
  | 'url-encoder'
  | 'guide-compare-json'
  | 'guide-json-to-csv'
  | 'case-converter'
  | 'title-case'
  | 'word-counter'
  | 'password-generator'
  | 'lorem-ipsum'
  | 'qr-code'
  | 'color-converter'
  | 'css-gradient'
  | 'code-beautifier'
  | 'markdown-preview'
  | 'about'
  | 'contact';

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
  /** Other words people search for (command palette). */
  keywords?: string[];
}

export const PAGES: Page[] = [
  {
    id: 'home',
    path: '/',
    title: 'diffdrop - free, open source developer tools',
    description:
      'Free, open source developer tools that run in your browser: diff checker, JSON diff, formatter, validator, JSON to CSV and YAML, and a viewer. No uploads.',
    name: 'All tools',
    blurb: 'Every diffdrop tool on one page.',
    priority: 1.0,
  },
  {
    id: 'diff-checker',
    path: '/diff-checker/',
    title: 'Diff checker - compare text and code online, free | diffdrop',
    description:
      'Compare two texts, code or files side by side, line by line and word by word. Free and open source, no account, and your text never leaves your browser.',
    name: 'Diff checker',
    blurb: 'Compare two texts or files, line by line and word by word.',
    priority: 0.9,
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
  {
    id: 'base64',
    path: '/base64-encode-decode/',
    title: 'Base64 encode and decode online, free | diffdrop',
    description:
      'Encode text or files to Base64 and decode Base64 back to text, images or files. UTF-8 safe, URL-safe option, clear errors. Free, and nothing is uploaded.',
    name: 'Base64 encoder',
    blurb: 'Encode and decode Base64 text and files.',
    priority: 0.8,
  },
  {
    id: 'unix-timestamp',
    path: '/unix-timestamp-converter/',
    title: 'Unix timestamp converter - epoch to date, free | diffdrop',
    description:
      'Convert Unix timestamps to dates and dates to timestamps. Seconds, ms, µs or ns detected automatically, any time zone, ISO 8601 and more. Free, in browser.',
    name: 'Timestamp converter',
    blurb: 'Convert Unix epoch time to dates and back.',
    priority: 0.8,
  },
  {
    id: 'jwt-decoder',
    path: '/jwt-decoder/',
    title: 'JWT decoder - decode and verify JSON Web Tokens | diffdrop',
    description:
      'Decode a JWT to read its header, payload and expiry, then verify the signature with a secret or public key. Free, and your token never leaves your browser.',
    name: 'JWT decoder',
    blurb: 'Decode JWTs, check expiry and verify signatures.',
    priority: 0.8,
  },
  {
    id: 'regex-tester',
    path: '/regex-tester/',
    title: 'Regex tester - test JavaScript regex online, free | diffdrop',
    description:
      'Test regular expressions live: every match highlighted, capture groups and named groups listed, replace preview, all JavaScript flags. Free, in browser.',
    name: 'Regex tester',
    blurb: 'Test regular expressions with live matches and groups.',
    priority: 0.8,
  },
  {
    id: 'url-encoder',
    path: '/url-encoder-decoder/',
    title: 'URL encoder and decoder - percent-encoding, free | diffdrop',
    description:
      'Encode and decode URLs and query strings: component, full URL or form style, with bad escapes pinpointed and any URL split into parts. Free, in browser.',
    name: 'URL encoder',
    blurb: 'Percent-encode and decode URLs and query strings.',
    priority: 0.8,
  },
  {
    id: 'guide-compare-json',
    path: '/guides/compare-json-files/',
    title: 'How to compare two JSON files (and ignore key order)',
    description:
      'A practical guide to comparing two JSON files: why plain diffs mislead, how to ignore key order and formatting, and how to read the changes. Free tool.',
    name: 'Comparing JSON files',
    blurb: 'Why plain diffs mislead, and how to ignore key order.',
    priority: 0.6,
  },
  {
    id: 'guide-json-to-csv',
    path: '/guides/json-to-csv-excel/',
    title: 'JSON to CSV for Excel: nested objects, arrays, encoding',
    description:
      'How to turn JSON into a CSV that opens cleanly in Excel: flattening nested objects, handling arrays, UTF-8 and the BOM, delimiters and formula injection.',
    name: 'JSON to CSV for Excel',
    blurb: 'Nested objects, arrays, encoding and Excel quirks.',
    priority: 0.6,
  },
  {
    id: 'case-converter',
    path: '/case-converter/',
    title: 'Case converter - upper, lower, camelCase and more | diffdrop',
    description:
      'Convert text to UPPER, lower, Sentence or Title Case, or to camelCase, snake_case, kebab-case and CONSTANT_CASE for code. Free, instant, in your browser.',
    name: 'Case converter',
    blurb: 'Change text to upper, lower, title, camel or snake case.',
    priority: 0.8,
  },
  {
    id: 'title-case',
    path: '/title-case-converter/',
    title: 'Title case converter - AP, Chicago, APA, MLA | diffdrop',
    description:
      'Capitalize headlines and titles correctly in AP, Chicago, APA, MLA or New York Times style. Keeps acronyms and brand names intact. Free, in your browser.',
    name: 'Title case',
    blurb: 'Capitalize titles in AP, Chicago, APA or MLA style.',
    priority: 0.8,
  },
  {
    id: 'word-counter',
    path: '/word-counter/',
    title: 'Word counter - count words, characters, sentences | diffdrop',
    description:
      'Count words, characters with and without spaces, sentences and paragraphs as you type, plus reading time and top keywords. Free, private, and no sign-up.',
    name: 'Word counter',
    blurb: 'Count words, characters, sentences and reading time.',
    priority: 0.8,
  },
  {
    id: 'password-generator',
    path: '/password-generator/',
    title: 'Password generator - strong, random passwords | diffdrop',
    description:
      'Generate strong random passwords with your browser’s secure random generator. Pick the length and characters, see the strength. Free, nothing is stored.',
    name: 'Password generator',
    blurb: 'Generate strong random passwords, made in your browser.',
    priority: 0.8,
  },
  {
    id: 'lorem-ipsum',
    path: '/lorem-ipsum-generator/',
    title: 'Lorem ipsum generator - placeholder text | diffdrop',
    description:
      'Generate lorem ipsum placeholder text by paragraphs, sentences or words, as plain text or HTML, starting with the classic "Lorem ipsum dolor sit amet".',
    name: 'Lorem ipsum',
    blurb: 'Generate placeholder text by paragraph, sentence or word.',
    priority: 0.7,
  },
  {
    id: 'qr-code',
    path: '/qr-code-generator/',
    title: 'QR code generator - free, no sign-up, no tracking | diffdrop',
    description:
      'Make QR codes for links, text, Wi-Fi, email or phone numbers. Pick colors and error correction, download PNG or SVG. Free, no expiry, made in your browser.',
    name: 'QR code generator',
    blurb: 'Make QR codes for links, Wi-Fi and text; PNG or SVG.',
    priority: 0.8,
  },
  {
    id: 'color-converter',
    path: '/color-converter/',
    title: 'Color converter - HEX, RGB, HSL, OKLCH, palettes | diffdrop',
    description:
      'Convert colors between HEX, RGB, HSL, HSV, OKLCH and CMYK, check WCAG contrast, and get tints, shades and harmonies. Pick any color. Free, in browser.',
    name: 'Color converter',
    blurb: 'Convert HEX, RGB, HSL; contrast, tints and palettes.',
    priority: 0.8,
  },
  {
    id: 'css-gradient',
    path: '/css-gradient-generator/',
    title: 'CSS gradient generator - linear, radial, conic | diffdrop',
    description:
      'Design CSS gradients visually: linear, radial or conic, any number of color stops, angle and positions. Copy the CSS in one click. Free, in your browser.',
    name: 'CSS gradient',
    blurb: 'Build linear, radial and conic CSS gradients.',
    priority: 0.7,
  },
  {
    id: 'code-beautifier',
    path: '/code-beautifier/',
    title: 'Code beautifier - Python, Java, C++, Go and more | diffdrop',
    description:
      'Format Python, Java, C, C++, C#, Go, PHP, JavaScript, TypeScript, Lua, Shell, SQL, HTML, CSS, JSON and YAML with each language’s own formatter, in browser.',
    name: 'Code beautifier',
    blurb: 'Format Python, Java, C++, C#, Go, JS, PHP and more.',
    priority: 0.8,
  },
  {
    id: 'markdown-preview',
    path: '/markdown-preview/',
    title: 'Markdown preview - live editor with GitHub style | diffdrop',
    description:
      'Write Markdown and see it rendered live: tables, task lists, code blocks and links, GitHub-flavored. Export HTML. Free, private, works in your browser.',
    name: 'Markdown preview',
    blurb: 'Write Markdown and see it rendered live.',
    priority: 0.7,
  },
  {
    id: 'about',
    path: '/about/',
    title: 'About diffdrop - free, open source developer tools',
    description:
      'Learn what diffdrop is: free, open source developer tools that run in your browser, so the text, files and data you work with never leave your device.',
    name: 'About',
    blurb: 'What diffdrop is and how your data stays on your device.',
    priority: 0.4,
  },
  {
    id: 'contact',
    path: '/contact/',
    title: 'Contact diffdrop - email, bugs and tool ideas',
    description:
      'Get in touch with diffdrop: email for questions and feedback, or open an issue on GitHub to report a bug or suggest a new tool. No forms, no tracking.',
    name: 'Contact',
    blurb: 'Email, bug reports and tool ideas.',
    priority: 0.3,
  },
];

export const TOOL_PAGES = PAGES.filter((p) => p.id !== 'home');

/** Search words per page, for the command palette. */
export const KEYWORDS: Partial<Record<PageId, string[]>> = {
  'home': [
    'all tools',
    'home'
  ],
  'diff-checker': [
    'compare text',
    'diff',
    'difference',
    'code compare',
    'text compare',
    'merge'
  ],
  'json-diff': [
    'compare json',
    'json compare',
    'json difference'
  ],
  'json-formatter': [
    'beautify json',
    'pretty print',
    'minify json',
    'format json'
  ],
  'json-validator': [
    'validate json',
    'json lint',
    'json check',
    'syntax error'
  ],
  'json-to-csv': [
    'convert json to csv',
    'excel',
    'spreadsheet',
    'export'
  ],
  'json-to-yaml': [
    'convert json to yaml',
    'yml',
    'kubernetes',
    'config'
  ],
  'json-viewer': [
    'json tree',
    'explore json',
    'json path'
  ],
  'base64': [
    'base64 decode',
    'base64 encode',
    'b64',
    'data url'
  ],
  'unix-timestamp': [
    'epoch',
    'unix time',
    'date converter',
    'timestamp to date'
  ],
  'jwt-decoder': [
    'jwt',
    'json web token',
    'decode token',
    'bearer'
  ],
  'regex-tester': [
    'regular expression',
    'regexp',
    'pattern',
    'match'
  ],
  'url-encoder': [
    'url decode',
    'percent encoding',
    'urlencode',
    'query string'
  ],
  'case-converter': [
    'uppercase',
    'lowercase',
    'camelcase',
    'snake case',
    'kebab case',
    'sentence case'
  ],
  'title-case': [
    'capitalize',
    'headline',
    'title capitalization',
    'ap style',
    'chicago'
  ],
  'word-counter': [
    'character count',
    'count words',
    'letter count',
    'reading time'
  ],
  'password-generator': [
    'random password',
    'strong password',
    'secure password'
  ],
  'lorem-ipsum': [
    'placeholder text',
    'dummy text',
    'filler text'
  ],
  'qr-code': [
    'qr',
    'qr code maker',
    'wifi qr',
    'barcode'
  ],
  'color-converter': [
    'hex to rgb',
    'rgb to hex',
    'hsl',
    'color picker',
    'contrast',
    'palette',
    'oklch'
  ],
  'css-gradient': [
    'gradient',
    'linear-gradient',
    'background'
  ],
  'code-beautifier': ['code formatter', 'prettier', 'python formatter', 'java formatter', 'c++', 'cpp', 'c#', 'csharp', 'golang', 'go fmt', 'php', 'typescript', 'sql formatter', 'clang-format', 'black', 'ruff'],
  'markdown-preview': [
    'markdown editor',
    'md',
    'readme',
    'markdown to html'
  ],
  'guide-compare-json': [
    'guide',
    'how to compare json'
  ],
  'guide-json-to-csv': [
    'guide',
    'excel csv'
  ],
  'about': ['why free', 'privacy', 'open source', 'who makes it'],
  'contact': [
    'email',
    'support',
    'feedback',
    'bug report'
  ]
};

export function pageById(id: PageId): Page {
  return PAGES.find((p) => p.id === id)!;
}

/** Google Search Console ownership tag (homepage only). */
export const GOOGLE_SITE_VERIFICATION = 'K_izTuuq4Dnpo4aI4si3l061iVT7OJFH0enBQXFDvCg';
