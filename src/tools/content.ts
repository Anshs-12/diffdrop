import type { PageId } from '@/site';

/** Example document shared by the JSON tools. */
export const EXAMPLE_JSON = `[
  {
    "id": 1,
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "active": true,
    "address": { "city": "London", "country": "UK" },
    "roles": ["admin", "editor"],
    "lastLogin": "2026-10-14T09:12:00Z"
  },
  {
    "id": 2,
    "name": "Grace Hopper",
    "email": "grace@example.com",
    "active": false,
    "address": { "city": "Arlington", "country": "US" },
    "roles": ["editor"],
    "lastLogin": null
  },
  {
    "id": 3,
    "name": "Alan Turing",
    "email": "alan@example.com",
    "active": true,
    "address": { "city": "Manchester", "country": "UK" },
    "roles": [],
    "note": "Prefers \\"tea\\", not coffee"
  }
]
`;

export interface ToolContent {
  h1: string;
  lede: string;
  /** "How it works" steps. */
  steps: { title: string; body: string }[];
  /** Short questions and answers (what people search for). */
  faq: { q: string; a: string }[];
}

type ToolId = Exclude<PageId, 'home' | 'json-diff'>;

export const TOOL_CONTENT: Record<ToolId, ToolContent> = {
  'json-formatter': {
    h1: 'JSON formatter',
    lede: 'Beautify messy JSON or minify it to one line. Pick the indentation, sort keys if you like, and copy or download the result. It all runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'Paste it on the left, or open a .json file. Files are read on your machine and never uploaded.' },
      { title: 'Choose the style', body: '2 or 4 spaces, tabs, or minified to a single line. Turn on Sort keys to order every object A–Z.' },
      { title: 'Copy or download', body: 'The formatted JSON updates as you type. Syntax errors are shown with their exact line and column.' },
    ],
    faq: [
      { q: 'Does formatting change my data?', a: 'No. Only whitespace changes (and key order, if you choose to sort). Values, types and array order stay exactly the same.' },
      { q: 'Is there a size limit?', a: 'No fixed limit. Files of tens of megabytes work; the only limit is your browser’s memory.' },
      { q: 'Is my JSON sent anywhere?', a: 'No. Formatting happens in this tab, and the page is blocked from sending your data to any server.' },
    ],
  },
  'json-validator': {
    h1: 'JSON validator',
    lede: 'Check whether your JSON is valid, and if it isn’t, see exactly where and why: the line, the column and a plain explanation. Runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'It is checked as you type, so you can fix it in place.' },
      { title: 'Read the result', body: 'Valid JSON shows a summary of its structure. Invalid JSON shows the first error, with the line highlighted.' },
      { title: 'Jump to the error', body: 'Go to error puts the cursor right where the problem is. Common causes: trailing commas, single quotes, unquoted keys.' },
    ],
    faq: [
      { q: 'Why is my JSON invalid?', a: 'The usual suspects are a comma after the last item, keys or strings in single quotes, unquoted keys, comments, or a missing closing bracket. JSON is stricter than JavaScript.' },
      { q: 'Which JSON standard is used?', a: 'Strict JSON (RFC 8259), the same rules as JSON.parse in every browser.' },
      { q: 'Is my JSON sent anywhere?', a: 'No. Validation happens in this tab; nothing is uploaded.' },
    ],
  },
  'json-to-csv': {
    h1: 'JSON to CSV converter',
    lede: 'Turn a JSON array into a CSV file you can open in Excel, Google Sheets or Numbers. Nested objects become columns like address.city. Runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'An array of objects works best: each object becomes a row. A single object becomes one row.' },
      { title: 'Pick a delimiter', body: 'Comma for most tools, semicolon for spreadsheets in regions that use a decimal comma, or tab.' },
      { title: 'Download the CSV', body: 'Columns are every key found, in the order first seen. Lists inside a row are kept as JSON in one cell.' },
    ],
    faq: [
      { q: 'How are nested objects handled?', a: 'They are flattened into dotted column names: {"address": {"city": "London"}} becomes a column address.city.' },
      { q: 'What about arrays inside objects?', a: 'They are written into a single cell as JSON text (for example ["admin","editor"]), so no data is lost.' },
      { q: 'Is my data uploaded?', a: 'No. The conversion runs in this tab; your data never leaves your browser.' },
    ],
  },
  'json-to-yaml': {
    h1: 'JSON to YAML converter',
    lede: 'Convert JSON into clean, valid YAML for configs, Kubernetes manifests or CI files. Strings are quoted only when YAML would misread them. Runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'Any valid JSON works: objects, arrays or a single value.' },
      { title: 'Get readable YAML', body: 'Block style with 2-space indentation. Values like "yes", "on", "1.0" or "null" stay strings by being quoted.' },
      { title: 'Copy or download', body: 'Save it as a .yaml file or paste it straight into your config.' },
    ],
    faq: [
      { q: 'Why are some strings quoted?', a: 'YAML reads bare words like yes, no, on, off, null and numbers as booleans, null or numbers. Quoting keeps them as the strings they were in your JSON.' },
      { q: 'Is the output valid YAML?', a: 'Yes. It reads back to exactly the same data in both YAML 1.1 and 1.2 parsers; this is checked on thousands of tricky inputs in our tests.' },
      { q: 'Is my data uploaded?', a: 'No. The conversion runs in this tab.' },
    ],
  },
  'json-viewer': {
    h1: 'JSON viewer',
    lede: 'Explore JSON as a collapsible tree. Expand what you need, search keys and values, and click any value to copy its path. Runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'API responses, logs, configs: anything valid. Large files stay fast because only open branches are drawn.' },
      { title: 'Expand and search', body: 'Open branches one by one, or expand everything. Search highlights matching keys and values and opens the way to them.' },
      { title: 'Copy paths and values', body: 'Click a row to copy its path, like $.users[0].email, ready for code or jq-style tools.' },
    ],
    faq: [
      { q: 'How big a file can it open?', a: 'Large ones. Only expanded branches are rendered, so a file with hundreds of thousands of values still opens instantly.' },
      { q: 'What does the path look like?', a: 'JavaScript style: $.users[0].address.city, with ["odd key"] for keys that contain spaces or symbols.' },
      { q: 'Is my JSON sent anywhere?', a: 'No. Everything happens in this tab.' },
    ],
  },
};
