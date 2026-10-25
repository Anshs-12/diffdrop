/**
 * Where the site lives and which pages it has. Each page's <head> (title,
 * description, canonical and social tags), the build inputs, sitemap.xml and the
 * cross-links between tools are all generated from PAGES. Change SITE_URL if the
 * site moves to another domain.
 */
export const SITE_URL = 'https://toolspace.tech';

/** The site's previous address; the worker (src/worker.ts) redirects it here. */
export const OLD_HOST = 'diffdrop.anshx12.workers.dev';

export const REPO_URL = 'https://github.com/Anshs-12/diffdrop';

/** The site's name as it writes it (lowercase), used in titles, JSON-LD, llms.txt and ai.txt. */
export const SITE_NAME = 'toolspace';

/** Contact address, shown on the contact page and in llms.txt and ai.txt. */
export const CONTACT_EMAIL = 'anshxcookies@gmail.com';

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
  | 'uuid-generator'
  | 'hash-generator'
  | 'cron-generator'
  | 'slug-generator'
  | 'number-base-converter'
  | 'html-entities'
  | 'color-palette'
  | 'contrast-checker'
  | 'aspect-ratio'
  | 'image-compressor'
  | 'image-resizer'
  | 'favicon-generator'
  | 'svg-optimizer'
  | 'json-to-typescript'
  | 'yaml-validator'
  | 'line-cleaner'
  | 'list-to-sql'
  | 'mock-json'
  | 'meta-tag-generator'
  | 'robots-txt'
  | 'http-status'
  | 'subnet-calculator'
  | 'chmod-calculator'
  | 'java-beautifier'
  | 'javascript-beautifier'
  | 'css-beautifier'
  | 'html-beautifier'
  | 'python-formatter'
  | 'sql-formatter'
  | 'xml-formatter'
  | 'px-to-rem'
  | 'email-extractor'
  | 'user-agent-parser'
  | 'jsonpath-tester'
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
  /** For <meta name="ai-summary">: what the page is, for a model that has fetched it. Defaults to the description. */
  aiSummary?: string;
}

export const PAGES: Page[] = [
  {
    id: 'home',
    path: '/',
    title: 'toolspace - free, open source developer tools',
    description:
      'Free, open source developer tools that run in your browser: diff checker, JSON diff, formatter, validator, JSON to CSV and YAML, and a viewer. No uploads.',
    name: 'All tools',
    blurb: 'Every toolspace tool on one page.',
    priority: 1.0,
    aiSummary:
      'The home page of toolspace, a free and open source collection of developer tools (diff, JSON, encoding, text, code, image and web utilities) that run entirely in the browser, with no sign-up and no uploads.',
  },
  {
    id: 'diff-checker',
    path: '/diff-checker/',
    title: 'Diff checker - compare text and code, free | toolspace',
    description:
      'Compare two texts, code or files side by side, line by line and word by word. Free and open source, no account, and your text never leaves your browser.',
    name: 'Diff checker',
    blurb: 'Compare two texts or files, line by line and word by word.',
    priority: 0.9,
  },
  {
    id: 'json-diff',
    path: '/json-diff/',
    title: 'JSON diff - compare two JSON files online, free | toolspace',
    description:
      'Compare two JSON files online and see every changed key and value. Format and sort keys in one click. Free, no account; your data stays in your browser.',
    name: 'JSON diff',
    blurb: 'Compare two JSON files, ignoring key order and formatting.',
    priority: 0.8,
  },
  {
    id: 'json-formatter',
    path: '/json-formatter/',
    title: 'JSON formatter - beautify and minify, no sign-up | toolspace',
    description:
      'Format, beautify or minify JSON online. Pick the indentation, sort keys, and see errors by line and column. Free, and your JSON never leaves your browser.',
    name: 'JSON formatter',
    blurb: 'Beautify or minify JSON, with sorted keys if you like.',
    priority: 0.8,
  },
  {
    id: 'json-validator',
    path: '/json-validator/',
    title: 'JSON validator - check JSON syntax online, free | toolspace',
    description:
      'Validate JSON online and find errors fast: the exact line and column, a plain explanation, duplicate-key warnings. Free, and nothing leaves your browser.',
    name: 'JSON validator',
    blurb: 'Check JSON syntax and see exactly where it breaks.',
    priority: 0.8,
  },
  {
    id: 'json-to-csv',
    path: '/json-to-csv/',
    title: 'JSON to CSV converter - free, online | toolspace',
    description:
      'Convert JSON to CSV or CSV to JSON online. Nested objects become columns, quoted fields are read correctly, and Excel opens it cleanly. In your browser.',
    name: 'JSON to CSV',
    blurb: 'Turn a JSON array into a spreadsheet-ready CSV file.',
    priority: 0.8,
  },
  {
    id: 'json-to-yaml',
    path: '/json-to-yaml/',
    title: 'JSON to YAML converter - free, online | toolspace',
    description:
      'Convert JSON to clean, valid YAML, or YAML back to JSON. Strings are quoted only when YAML needs it, and errors show line and column. Runs in your browser.',
    name: 'JSON to YAML',
    blurb: 'Convert JSON into clean, valid YAML.',
    priority: 0.8,
  },
  {
    id: 'json-viewer',
    path: '/json-viewer/',
    title: 'JSON viewer - explore JSON as a tree, free | toolspace',
    description:
      'View JSON as a collapsible tree, a table or formatted text. Search keys and values, and copy the path to any value. Free; your JSON stays in your browser.',
    name: 'JSON viewer',
    blurb: 'Explore JSON as a collapsible tree and copy paths.',
    priority: 0.8,
  },
  {
    id: 'base64',
    path: '/base64-encode-decode/',
    title: 'Base64 encode and decode online, no sign-up | toolspace',
    description:
      'Encode text or files to Base64 and decode Base64 back to text, images or files. UTF-8 safe, URL-safe option, clear errors. Free, and nothing is uploaded.',
    name: 'Base64 encoder',
    blurb: 'Encode and decode Base64 text and files.',
    priority: 0.8,
  },
  {
    id: 'unix-timestamp',
    path: '/unix-timestamp-converter/',
    title: 'Unix timestamp converter - epoch to date, free | toolspace',
    description:
      'Convert Unix timestamps to dates and back. Seconds, milliseconds, microseconds or nanoseconds detected for you, any time zone, ISO 8601. Free.',
    name: 'Timestamp converter',
    blurb: 'Convert Unix epoch time to dates and back.',
    priority: 0.8,
  },
  {
    id: 'jwt-decoder',
    path: '/jwt-decoder/',
    title: 'JWT decoder - decode and verify, no sign-up | toolspace',
    description:
      'Decode a JWT to read its header, payload and expiry, then verify the signature with a secret or public key. Free, and your token never leaves your browser.',
    name: 'JWT decoder',
    blurb: 'Decode JWTs, check expiry and verify signatures.',
    priority: 0.8,
  },
  {
    id: 'regex-tester',
    path: '/regex-tester/',
    title: 'Regex tester - test JavaScript regex, free | toolspace',
    description:
      'Test regular expressions live: every match highlighted, capture groups and named groups listed, replace preview, all JavaScript flags. Free, in browser.',
    name: 'Regex tester',
    blurb: 'Test regular expressions with live matches and groups.',
    priority: 0.8,
  },
  {
    id: 'url-encoder',
    path: '/url-encoder-decoder/',
    title: 'URL encoder and decoder - percent-encoding, free | toolspace',
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
    title: 'Case converter - upper, lower, camelCase, more | toolspace',
    description:
      'Convert text to UPPER, lower, Sentence or Title Case, or to camelCase, snake_case, kebab-case and CONSTANT_CASE for code. Free, instant, in your browser.',
    name: 'Case converter',
    blurb: 'Change text to upper, lower, title, camel or snake case.',
    priority: 0.8,
  },
  {
    id: 'title-case',
    path: '/title-case-converter/',
    title: 'Title case converter - AP, Chicago, APA, MLA | toolspace',
    description:
      'Capitalize headlines and titles correctly in AP, Chicago, APA, MLA or New York Times style. Keeps acronyms and brand names intact. Free, in your browser.',
    name: 'Title case',
    blurb: 'Capitalize titles in AP, Chicago, APA or MLA style.',
    priority: 0.8,
  },
  {
    id: 'word-counter',
    path: '/word-counter/',
    title: 'Word counter - words and characters, no sign-up | toolspace',
    description:
      'Count words, characters with and without spaces, sentences and paragraphs as you type, plus reading time and top keywords. Free, private, and no sign-up.',
    name: 'Word counter',
    blurb: 'Count words, characters, sentences and reading time.',
    priority: 0.8,
  },
  {
    id: 'password-generator',
    path: '/password-generator/',
    title: 'Password generator - strong, random, no sign-up | toolspace',
    description:
      'Generate strong random passwords with your browser\'s secure random generator. Pick the length and characters, see the strength. Nothing is stored.',
    name: 'Password generator',
    blurb: 'Generate strong random passwords, made in your browser.',
    priority: 0.8,
  },
  {
    id: 'lorem-ipsum',
    path: '/lorem-ipsum-generator/',
    title: 'Lorem ipsum generator - placeholder text | toolspace',
    description:
      'Generate lorem ipsum placeholder text by paragraphs, sentences or words, as plain text or HTML, starting with the classic Lorem ipsum dolor sit amet.',
    name: 'Lorem ipsum',
    blurb: 'Generate placeholder text by paragraph, sentence or word.',
    priority: 0.7,
  },
  {
    id: 'qr-code',
    path: '/qr-code-generator/',
    title: 'QR code generator - free, no sign-up or tracking | toolspace',
    description:
      'Make QR codes for links, text, Wi-Fi, email or phone numbers. Pick colors and error correction, download PNG or SVG. Free, no expiry, made in your browser.',
    name: 'QR code generator',
    blurb: 'Make QR codes for links, Wi-Fi and text; PNG or SVG.',
    priority: 0.8,
  },
  {
    id: 'color-converter',
    path: '/color-converter/',
    title: 'Color converter - HEX, RGB, HSL, OKLCH, palettes | toolspace',
    description:
      'Convert colors between HEX, RGB, HSL, HSV, OKLCH and CMYK, check WCAG contrast, and get tints, shades and harmonies. Pick any color. Free, in browser.',
    name: 'Color converter',
    blurb: 'Convert HEX, RGB, HSL; contrast, tints and palettes.',
    priority: 0.8,
  },
  {
    id: 'css-gradient',
    path: '/css-gradient-generator/',
    title: 'CSS gradient generator - linear, radial, conic | toolspace',
    description:
      'Design CSS gradients visually: linear, radial or conic, any number of color stops, angle and positions. Copy the CSS in one click. Free, in your browser.',
    name: 'CSS gradient',
    blurb: 'Build linear, radial and conic CSS gradients.',
    priority: 0.7,
  },
  {
    id: 'code-beautifier',
    path: '/code-beautifier/',
    title: 'Code beautifier - Python, Java, C++, Go and more | toolspace',
    description:
      'Format Python, Java, C, C++, C#, Go, PHP, JavaScript, TypeScript, SQL, HTML, CSS, JSON and YAML with each language\'s own formatter. Free, in browser.',
    name: 'Code beautifier',
    blurb: 'Format Python, Java, C++, C#, Go, JS, PHP and more.',
    priority: 0.8,
  },
  {
    id: 'markdown-preview',
    path: '/markdown-preview/',
    title: 'Markdown preview - live editor with GitHub style | toolspace',
    description:
      'Write Markdown and see it rendered live: tables, task lists, code blocks and links, GitHub-flavored. Export HTML. Free, private, works in your browser.',
    name: 'Markdown preview',
    blurb: 'Write Markdown and see it rendered live.',
    priority: 0.7,
  },
  {
    id: 'uuid-generator',
    path: '/uuid-generator/',
    title: 'UUID generator - bulk v4 and v7 GUIDs, free | toolspace',
    description:
      'Generate random UUIDs (GUIDs) in bulk: version 4 or time-ordered version 7, upper or lower case, with or without dashes. Copy them all at once.',
    name: 'UUID generator',
    blurb: 'Generate UUIDs and GUIDs in bulk, v4 or v7.',
    priority: 0.7,
  },
  {
    id: 'hash-generator',
    path: '/hash-generator/',
    title: 'Hash generator - MD5, SHA-1, SHA-256, SHA-512 | toolspace',
    description:
      'Hash text or a file with MD5, SHA-1, SHA-256, SHA-384 or SHA-512, in hex or Base64. Computed in your browser; nothing is uploaded.',
    name: 'Hash generator',
    blurb: 'MD5 and SHA hashes of text or files.',
    priority: 0.7,
  },
  {
    id: 'cron-generator',
    path: '/cron-generator/',
    title: 'Cron expression generator and explainer, free | toolspace',
    description:
      'Build a cron expression, or paste one to read it in plain English with its next run times. Ranges, steps and lists supported. Free, runs in your browser.',
    name: 'Cron generator',
    blurb: 'Build or explain cron schedules, see next runs.',
    priority: 0.7,
  },
  {
    id: 'slug-generator',
    path: '/slug-generator/',
    title: 'Slug generator - turn titles into URL slugs | toolspace',
    description:
      'Turn a title or any text into a clean URL slug: lowercase, accents removed, words joined by dashes. One per line for many at once. Free, in your browser.',
    name: 'Slug generator',
    blurb: 'Turn titles into clean URL slugs.',
    priority: 0.7,
  },
  {
    id: 'number-base-converter',
    path: '/number-base-converter/',
    title: 'Number base converter - binary, hex, decimal | toolspace',
    description:
      'Convert numbers between binary, octal, decimal and hexadecimal, or any base from 2 to 36. Very large integers stay exact. Free, in your browser.',
    name: 'Number base converter',
    blurb: 'Binary, octal, decimal and hex, both ways.',
    priority: 0.7,
  },
  {
    id: 'html-entities',
    path: '/html-entity-encoder/',
    title: 'HTML entity encoder and decoder, free | toolspace',
    description:
      'Escape text for HTML (angle brackets, ampersands and quotes) or decode named and numeric entities back to text. Free, no sign-up, runs in your browser.',
    name: 'HTML entity encoder',
    blurb: 'Escape and unescape HTML entities.',
    priority: 0.7,
  },
  {
    id: 'color-palette',
    path: '/color-palette-generator/',
    title: 'Color palette generator - harmonious schemes | toolspace',
    description:
      'Generate color palettes from one base color: complementary, analogous, triadic, shades and tints. Copy as hex, CSS variables or Tailwind. In your browser.',
    name: 'Color palette generator',
    blurb: 'Build palettes from one color, copy as CSS.',
    priority: 0.7,
  },
  {
    id: 'contrast-checker',
    path: '/color-contrast-checker/',
    title: 'Color contrast checker - WCAG AA and AAA, free | toolspace',
    description:
      'Check the contrast ratio of a text and background color against WCAG AA and AAA, for normal and large text, with a live preview. Free, in your browser.',
    name: 'Contrast checker',
    blurb: 'Text and background contrast against WCAG.',
    priority: 0.7,
  },
  {
    id: 'aspect-ratio',
    path: '/aspect-ratio-calculator/',
    title: 'Aspect ratio calculator - 16:9, 4:3 and more | toolspace',
    description:
      'Find the aspect ratio of any width and height, or the missing side for a ratio like 16:9 or 4:3. Common sizes included. Free, runs in your browser.',
    name: 'Aspect ratio calculator',
    blurb: 'Ratios and missing sides, like 16:9.',
    priority: 0.6,
  },
  {
    id: 'image-compressor',
    path: '/image-compressor/',
    title: 'Image compressor - shrink JPG, PNG and WebP | toolspace',
    description:
      'Compress JPG, PNG and WebP images in your browser. Pick the quality and format, and compare sizes before you download. No uploads, no sign-up.',
    name: 'Image compressor',
    blurb: 'Shrink images without uploading them.',
    priority: 0.7,
  },
  {
    id: 'image-resizer',
    path: '/image-resizer/',
    title: 'Image resizer - change image size online, free | toolspace',
    description:
      'Resize an image to exact pixels or a percentage, with the aspect ratio locked or free. Save as JPG, PNG or WebP. Runs in your browser; no uploads.',
    name: 'Image resizer',
    blurb: 'Resize images to exact dimensions.',
    priority: 0.7,
  },
  {
    id: 'favicon-generator',
    path: '/favicon-generator/',
    title: 'Favicon generator - ICO and PNG from an image | toolspace',
    description:
      'Make a favicon.ico and PNG icons in the common sizes from one image, plus the HTML tags to add them. Runs in your browser; nothing is uploaded.',
    name: 'Favicon generator',
    blurb: 'Favicon.ico and app icons from one image.',
    priority: 0.7,
  },
  {
    id: 'svg-optimizer',
    path: '/svg-optimizer/',
    title: 'SVG optimizer - minify SVG files online, free | toolspace',
    description:
      'Make SVG files smaller: remove editor metadata, comments and unused attributes, and round numbers. Preview before and after. Free, in your browser.',
    name: 'SVG optimizer',
    blurb: 'Clean up and minify SVG files.',
    priority: 0.6,
  },
  {
    id: 'json-to-typescript',
    path: '/json-to-typescript/',
    title: 'JSON to TypeScript and Zod - generate types | toolspace',
    description:
      'Turn a JSON sample into TypeScript interfaces or a Zod schema, with a root name you choose. A starter to review, not a final schema. Free, in your browser.',
    name: 'JSON to TypeScript',
    blurb: 'TypeScript interfaces or Zod from JSON.',
    priority: 0.7,
  },
  {
    id: 'yaml-validator',
    path: '/yaml-validator/',
    title: 'YAML validator - check YAML syntax online, free | toolspace',
    description:
      'Validate YAML and find errors by line and column, with duplicate-key warnings. See the parsed result as JSON. Free, and nothing leaves your browser.',
    name: 'YAML validator',
    blurb: 'Check YAML syntax and see where it breaks.',
    priority: 0.7,
  },
  {
    id: 'line-cleaner',
    path: '/line-cleaner/',
    title: 'Remove duplicate lines and sort lines, free | toolspace',
    description:
      'Remove duplicate lines, sort A-Z, Z-A, by length or by number, trim spaces and drop empty lines, with before and after counts. Free, in your browser.',
    name: 'Line cleaner',
    blurb: 'Dedupe, sort and trim lists of lines.',
    priority: 0.7,
  },
  {
    id: 'list-to-sql',
    path: '/list-to-sql-in/',
    title: 'List to SQL IN clause and comma list converter | toolspace',
    description:
      'Turn a column of values into a SQL IN list or a comma-separated line, and back again. Pick quotes, escape apostrophes, remove duplicates. In your browser.',
    name: 'List to SQL IN',
    blurb: 'Lines to SQL IN lists and comma lists.',
    priority: 0.6,
  },
  {
    id: 'mock-json',
    path: '/mock-data-generator/',
    title: 'Mock JSON data generator - fake test data, free | toolspace',
    description:
      'Generate fake JSON test data: names, emails, dates, IDs, numbers and more. Pick the fields and row count, then copy or download. Free, in your browser.',
    name: 'Mock data generator',
    blurb: 'Fake JSON test data with chosen fields.',
    priority: 0.6,
  },
  {
    id: 'meta-tag-generator',
    path: '/meta-tag-generator/',
    title: 'Meta tag generator - SEO and social tags, free | toolspace',
    description:
      'Generate HTML meta tags for a page: title, description, canonical, Open Graph and Twitter cards, with a preview. Copy the tags. Free, in your browser.',
    name: 'Meta tag generator',
    blurb: 'Title, description and social meta tags.',
    priority: 0.6,
  },
  {
    id: 'robots-txt',
    path: '/robots-txt-generator/',
    title: 'Robots.txt generator - build a robots.txt file | toolspace',
    description:
      'Build a robots.txt file: allow or block paths per crawler, add your sitemap, and test which URLs a rule blocks. Copy or download. Free, in your browser.',
    name: 'Robots.txt generator',
    blurb: 'Build and test a robots.txt file.',
    priority: 0.6,
  },
  {
    id: 'http-status',
    path: '/http-status-codes/',
    title: 'HTTP status codes - list and meanings | toolspace',
    description:
      'Every HTTP status code with a plain explanation: 200, 301, 404, 500 and the rest, with when to use each. Searchable and free.',
    name: 'HTTP status codes',
    blurb: 'What each HTTP status code means.',
    priority: 0.6,
  },
  {
    id: 'subnet-calculator',
    path: '/subnet-calculator/',
    title: 'Subnet calculator - IPv4 CIDR, mask and hosts | toolspace',
    description:
      'Calculate an IPv4 subnet from CIDR notation: network and broadcast address, mask, wildcard, host range and host count. Free, runs in your browser.',
    name: 'Subnet calculator',
    blurb: 'IPv4 CIDR ranges, masks and hosts.',
    priority: 0.6,
  },
  {
    id: 'chmod-calculator',
    path: '/chmod-calculator/',
    title: 'Chmod calculator - octal and rwx permissions | toolspace',
    description:
      'Work out Unix file permissions: tick read, write and execute for owner, group and others to get the octal (755) and symbolic (rwxr-xr-x) forms. Free.',
    name: 'Chmod calculator',
    blurb: 'Unix permissions as octal and rwx.',
    priority: 0.6,
  },
  {
    id: 'java-beautifier',
    path: '/java-beautifier/',
    title: 'Java beautifier - format Java code online, free | toolspace',
    description:
      'Format and indent Java code online with a real formatter: consistent braces, spacing and line breaks. Choose the indentation. Free, in your browser.',
    name: 'Java beautifier',
    blurb: 'Format and indent Java code.',
    priority: 0.6,
  },
  {
    id: 'javascript-beautifier',
    path: '/javascript-beautifier/',
    title: 'JavaScript beautifier - format JS online, free | toolspace',
    description:
      'Beautify JavaScript with Prettier: consistent indentation, quotes, semicolons and line breaks, JSX included. Free, and your code stays in your browser.',
    name: 'JavaScript beautifier',
    blurb: 'Format JavaScript with Prettier.',
    priority: 0.6,
  },
  {
    id: 'css-beautifier',
    path: '/css-beautifier/',
    title: 'CSS beautifier and minifier - format CSS, free | toolspace',
    description:
      'Beautify CSS with Prettier for consistent indentation and spacing, or minify it to one line. Free, no sign-up, and it runs in your browser.',
    name: 'CSS beautifier',
    blurb: 'Format or minify CSS.',
    priority: 0.6,
  },
  {
    id: 'html-beautifier',
    path: '/html-beautifier/',
    title: 'HTML beautifier - format HTML online, free | toolspace',
    description:
      'Format HTML with Prettier: nested tags indented, long attributes wrapped, inline scripts and styles tidied. Free, and your markup stays in your browser.',
    name: 'HTML beautifier',
    blurb: 'Format and indent HTML.',
    priority: 0.6,
  },
  {
    id: 'python-formatter',
    path: '/python-formatter/',
    title: 'Python formatter - format Python code online | toolspace',
    description:
      'Format Python code in the Black style with Ruff, running in your browser via WebAssembly. Choose line length and quotes. Free, nothing is uploaded.',
    name: 'Python formatter',
    blurb: 'Format Python in the Black style.',
    priority: 0.6,
  },
  {
    id: 'sql-formatter',
    path: '/sql-formatter/',
    title: 'SQL formatter - beautify SQL queries, free | toolspace',
    description:
      'Format SQL queries with consistent keyword case, indentation and line breaks. Works with common SQL dialects. Free, and your queries stay in your browser.',
    name: 'SQL formatter',
    blurb: 'Format and indent SQL queries.',
    priority: 0.6,
  },
  {
    id: 'xml-formatter',
    path: '/xml-formatter/',
    title: 'XML formatter - beautify and validate XML, free | toolspace',
    description:
      'Format XML with clean indentation and check that it is well-formed, with the error line if not. Free, no sign-up, and nothing leaves your browser.',
    name: 'XML formatter',
    blurb: 'Format XML and check it is well-formed.',
    priority: 0.6,
  },
  {
    id: 'px-to-rem',
    path: '/px-to-rem/',
    title: 'PX to REM converter - CSS units, free | toolspace',
    description:
      'Convert pixels to rem and rem to pixels with any root font size, one value or a whole list. Copy the CSS values. Free, runs in your browser.',
    name: 'PX to REM converter',
    blurb: 'Pixels to rem and back, any base size.',
    priority: 0.6,
  },
  {
    id: 'email-extractor',
    path: '/email-extractor/',
    title: 'Email extractor - pull addresses from text, free | toolspace',
    description:
      'Extract every email address from pasted text or a file, with duplicates removed and an optional sort. Copy or download the list. Runs in your browser.',
    name: 'Email extractor',
    blurb: 'Pull email addresses out of any text.',
    priority: 0.6,
  },
  {
    id: 'user-agent-parser',
    path: '/user-agent-parser/',
    title: 'User agent parser - browser, OS and device | toolspace',
    description:
      'Parse a user agent string into browser, engine, operating system and device type. Shows your own by default. Free, and it runs in your browser.',
    name: 'User agent parser',
    blurb: 'Read browser, OS and device from a UA string.',
    priority: 0.6,
  },
  {
    id: 'jsonpath-tester',
    path: '/jsonpath-tester/',
    title: 'JSONPath tester - query JSON online, free | toolspace',
    description:
      'Test JSONPath expressions against your JSON and see every match with its path. Filters, wildcards, slices and recursive descent. Free, in your browser.',
    name: 'JSONPath tester',
    blurb: 'Query JSON with JSONPath and see matches.',
    priority: 0.6,
  },
  {
    id: 'about',
    path: '/about/',
    title: 'About toolspace - free, open source developer tools',
    description:
      'Learn what toolspace is: free, open source developer tools that run in your browser, so the text, files and data you work with never leave your device.',
    name: 'About',
    blurb: 'What toolspace is and how your data stays on your device.',
    priority: 0.4,
  },
  {
    id: 'contact',
    path: '/contact/',
    title: 'Contact toolspace - email, bugs and tool ideas',
    description:
      'Get in touch with toolspace: email for questions and feedback, or open an issue on GitHub to report a bug or suggest a new tool. No forms, no tracking.',
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
  'uuid-generator': ['guid', 'uuid v4', 'uuid v7', 'unique id', 'random id'],
  'hash-generator': ['md5', 'sha256', 'sha1', 'sha512', 'checksum'],
  'cron-generator': ['crontab', 'cron expression', 'cron schedule', 'every 5 minutes'],
  'slug-generator': ['slugify', 'url slug', 'permalink'],
  'number-base-converter': ['binary to decimal', 'hex to decimal', 'decimal to binary', 'octal', 'radix'],
  'html-entities': ['html escape', 'html unescape', 'entities', 'nbsp'],
  'color-palette': ['palette', 'color scheme', 'complementary colors', 'shades', 'tints'],
  'contrast-checker': ['wcag', 'accessibility', 'a11y', 'contrast ratio'],
  'aspect-ratio': ['16:9', '4:3', 'resolution', 'ratio'],
  'image-compressor': ['compress jpg', 'compress png', 'reduce image size', 'webp', 'optimize image'],
  'image-resizer': ['resize image', 'scale image', 'image dimensions', 'thumbnail'],
  'favicon-generator': ['favicon', 'ico', 'apple touch icon', 'site icon'],
  'svg-optimizer': ['svg minify', 'svgo', 'compress svg', 'clean svg'],
  'json-to-typescript': ['json to ts', 'typescript interface', 'zod schema', 'json to zod', 'types'],
  'yaml-validator': ['yaml lint', 'yml', 'validate yaml', 'kubernetes yaml'],
  'line-cleaner': ['remove duplicates', 'dedupe', 'sort lines', 'unique lines', 'remove empty lines'],
  'list-to-sql': ['sql in', 'comma separated', 'lines to comma', 'quote list'],
  'mock-json': ['fake data', 'test data', 'dummy json', 'mock api', 'faker'],
  'meta-tag-generator': ['open graph', 'og tags', 'twitter card', 'meta description'],
  'robots-txt': ['robots', 'crawler', 'disallow', 'user-agent'],
  'http-status': ['404', '500', '301 redirect', 'status code', 'http error'],
  'subnet-calculator': ['cidr', 'ip calculator', 'netmask', 'ipv4', 'subnet mask'],
  'chmod-calculator': ['755', '644', 'file permissions', 'rwx', 'unix permissions'],
  'java-beautifier': ['java formatter', 'format java', 'java pretty print'],
  'javascript-beautifier': ['js beautifier', 'javascript formatter', 'prettier', 'format js'],
  'css-beautifier': ['css formatter', 'css minifier', 'format css', 'minify css'],
  'html-beautifier': ['html formatter', 'format html', 'html pretty print'],
  'python-formatter': ['python beautifier', 'black', 'ruff', 'format python', 'pep 8'],
  'sql-formatter': ['sql beautifier', 'format sql', 'sql pretty print'],
  'xml-formatter': ['xml beautifier', 'format xml', 'xml pretty print', 'xml validator'],
  'px-to-rem': ['px to rem', 'rem to px', 'css units', 'font size'],
  'email-extractor': ['extract emails', 'email list', 'find email addresses'],
  'user-agent-parser': ['user agent', 'ua string', 'browser detection', 'what is my browser'],
  'jsonpath-tester': ['jsonpath', 'json query', 'json path expression'],
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
