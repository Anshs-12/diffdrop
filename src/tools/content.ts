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

export type ToolId = Exclude<PageId, 'home' | 'diff-checker' | 'json-diff' | 'guide-compare-json' | 'guide-json-to-csv'>;

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
      {
        q: 'Does formatting change my data?',
        a: 'Values, types and array order stay the same, and numbers are kept exactly as written: 1.0 stays 1.0 and long IDs are never rounded. Two exceptions, both flagged with a warning: if a key appears twice in one object, only the last value is kept, and number-like keys such as "1" move to the front of their object, a rule every browser applies.',
      },
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
      { q: 'Does it catch duplicate keys?', a: 'Yes. Duplicate keys are technically allowed, so the JSON still counts as valid, but you get a warning with the line and column, because most parsers silently keep only the last value.' },
      { q: 'Is my JSON sent anywhere?', a: 'No. Validation happens in this tab; nothing is uploaded.' },
    ],
  },
  'json-to-csv': {
    h1: 'JSON to CSV converter',
    lede: 'Turn a JSON array into a CSV file you can open in Excel, Google Sheets or Numbers. Nested objects become columns like address.city. Runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'An array of objects works best: each object becomes a row. An API response like {"data": [...]} uses its array automatically.' },
      { title: 'Pick a delimiter', body: 'Comma for most tools, semicolon for spreadsheets in regions that use a decimal comma, or tab.' },
      { title: 'Download the CSV', body: 'Columns are every key found, in the order first seen. Lists inside a row are kept as JSON in one cell.' },
    ],
    faq: [
      { q: 'How are nested objects handled?', a: 'They are flattened into dotted column names: {"address": {"city": "London"}} becomes a column address.city.' },
      { q: 'What about arrays inside objects?', a: 'They are written into a single cell as JSON text (for example ["admin","editor"]), so no data is lost.' },
      { q: 'Will Excel open it correctly?', a: 'Yes. Downloads start with a UTF-8 byte order mark, so accented letters and emoji show correctly in Excel. Escape formulas is on by default, so cells starting with = + - or @ can’t run as formulas; turn it off if you need those cells exactly as they are.' },
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
  base64: {
    h1: 'Base64 encode and decode',
    lede: 'Turn text or a file into Base64, or Base64 back into text, an image or a file. Handles UTF-8, the URL-safe alphabet and missing padding. Runs in your browser.',
    steps: [
      { title: 'Pick encode or decode', body: 'Encode turns text into Base64. Decode turns Base64 back into text, or into a file if it holds binary data like an image or PDF.' },
      { title: 'Paste text or open a file', body: 'Any size works. Files are read on your machine and never uploaded. Decoding accepts data: URLs, line breaks and both alphabets.' },
      { title: 'Copy or download', body: 'Images show a preview, other binary data a hex view with a download button. Errors point at the exact character.' },
    ],
    faq: [
      { q: 'What is Base64?', a: 'A way to write any bytes using only 64 safe characters (A–Z, a–z, 0–9, + and /), so binary data can travel through text: JSON, email, URLs, data: URLs and HTTP headers. It is an encoding, not encryption: anyone can decode it.' },
      { q: 'What is URL-safe Base64?', a: 'The same encoding with - and _ instead of + and /, usually without = padding (RFC 4648 §5). JWTs and many URLs use it. Decoding here accepts both automatically.' },
      { q: 'Why is my decoded text garbled?', a: 'Either the data isn’t text (an image or a zip, for example), or the text was encoded from something other than UTF-8. Binary data is shown as a hex view with a download instead.' },
      { q: 'Is my data uploaded?', a: 'No. Encoding and decoding happen in this tab; the page is blocked from sending anything to a server.' },
    ],
  },
  'unix-timestamp': {
    h1: 'Unix timestamp converter',
    lede: 'Convert epoch time to a readable date and back. Seconds, milliseconds, microseconds and nanoseconds are detected automatically, in any time zone. Runs in your browser.',
    steps: [
      { title: 'Paste a timestamp or a date', body: '1760700000, 1760700000000, 2026-10-17T12:00:00Z or Sat, 17 Oct 2026 12:00:00 GMT all work. The unit is detected from the number’s size.' },
      { title: 'Read every format at once', body: 'UTC and local time, ISO 8601, RFC 2822, relative time, the weekday, ISO week and day of the year, plus the timestamp in every unit.' },
      { title: 'Pick a time zone or copy', body: 'Show the date in any time zone. Each value has a copy button; the live clock at the top gives the current timestamp.' },
    ],
    faq: [
      { q: 'What is a Unix timestamp?', a: 'The number of seconds since 1 January 1970 00:00:00 UTC (the Unix epoch), ignoring leap seconds. It is the same everywhere in the world, which is why systems store time this way.' },
      { q: 'Seconds or milliseconds?', a: 'Unix tools and most APIs use seconds (10 digits today); JavaScript’s Date.now() and Java use milliseconds (13 digits). Microseconds (16) and nanoseconds (19) appear in databases and tracing. The converter detects which one you pasted.' },
      { q: 'What is the year 2038 problem?', a: 'Systems that store seconds in a signed 32-bit integer overflow on 19 January 2038 at 03:14:07 UTC (timestamp 2147483647). 64-bit timestamps, used here, run for billions of years.' },
      { q: 'Is anything sent to a server?', a: 'No. All conversion uses your browser’s own clock and time zone data.' },
    ],
  },
  'jwt-decoder': {
    h1: 'JWT decoder',
    lede: 'Paste a JSON Web Token to read its header and payload, see when it expires, and verify its signature with a secret or a public key. Your token never leaves your browser.',
    steps: [
      { title: 'Paste the token', body: 'The whole eyJ… string, with or without "Bearer ". Header and payload are decoded as you paste, each claim labelled.' },
      { title: 'Check the dates', body: 'Issued at, not before and expiry are shown as dates, with whether the token is valid right now.' },
      { title: 'Verify the signature', body: 'Enter the secret for HS256/384/512, or a PEM or JWK public key for RS, PS, ES and EdDSA. Verification uses your browser’s built-in crypto.' },
    ],
    faq: [
      { q: 'Is it safe to paste a real token?', a: 'Here, yes: decoding and verification run entirely in this tab, and the page is blocked from making network requests. Still, treat live tokens like passwords and prefer expired or test ones when you can.' },
      { q: 'Does decoding prove a token is genuine?', a: 'No. Anyone can decode a JWT; the payload is only Base64url, not encrypted. Only verifying the signature with the right key shows it hasn’t been tampered with.' },
      { q: 'Which algorithms can it verify?', a: 'HS256, HS384 and HS512 with a shared secret; RS256/384/512, PS256/384/512 and ES256/384/512 with a public key in PEM or JWK form; and EdDSA (Ed25519) in browsers that support it.' },
      { q: 'Can it decode encrypted tokens (JWE)?', a: 'No. Encrypted tokens have five parts and need the private key to read; this tool decodes signed tokens (JWS), the common kind.' },
    ],
  },
  'regex-tester': {
    h1: 'Regex tester',
    lede: 'Write a regular expression and see every match highlighted as you type, with capture groups, named groups and a replace preview. Uses JavaScript’s regex engine, in your browser.',
    steps: [
      { title: 'Write the pattern', body: 'Type it without slashes and switch flags on or off: global, ignore case, multiline, dot-all, unicode and sticky. Syntax errors are explained as you type.' },
      { title: 'Paste test text', body: 'Matches are highlighted in place and listed below with their position and every capture group, numbered and named.' },
      { title: 'Try a replacement', body: 'Use $1, $<name> and $& to preview what String.replace would produce, then copy the result.' },
    ],
    faq: [
      { q: 'Which regex flavor is this?', a: 'JavaScript (ECMAScript), as in Chrome, Node.js and every browser. It is close to PCRE for everyday patterns; lookbehind, named groups and \\p{…} Unicode classes all work.' },
      { q: 'Why does my pattern freeze other testers?', a: 'Patterns like (a+)+$ can take exponential time on some inputs (catastrophic backtracking). Here the regex runs in a background worker and is stopped after 1.5 seconds, so the page stays responsive and you’re told why.' },
      { q: 'How many matches are shown?', a: 'Up to 10,000, which is enough for any text you’d check by eye. The count tells you if there are more.' },
      { q: 'Is my text uploaded?', a: 'No. Matching happens in this tab.' },
    ],
  },
  'url-encoder': {
    h1: 'URL encoder and decoder',
    lede: 'Percent-encode text for a URL or decode %20-style escapes back to text. Component, full-URL and form styles, with any URL broken into its parts. Runs in your browser.',
    steps: [
      { title: 'Pick encode or decode', body: 'Encode makes text safe to put in a URL; decode turns %-escapes back into readable text.' },
      { title: 'Choose the style', body: 'Component for a single query value or path segment, Full URL to keep : / ? # & intact, or Form for HTML form data where spaces become +.' },
      { title: 'Inspect the URL', body: 'Paste a full URL to see its protocol, host, port, path, hash and every query parameter decoded in a table.' },
    ],
    faq: [
      { q: 'encodeURIComponent or encodeURI?', a: 'Use component (encodeURIComponent) for a piece of a URL, like a query value: it escapes & = ? / and #. Use full URL (encodeURI) for a complete address, which must keep those characters.' },
      { q: 'Why do spaces become + sometimes and %20 other times?', a: 'HTML forms send data as application/x-www-form-urlencoded, where a space is +. Everywhere else in a URL a space is %20. Pick Form or Component to match what you’re working with.' },
      { q: 'Why does decoding fail?', a: 'A % must be followed by two hex digits, and the bytes must form valid UTF-8. The error says exactly which escape is wrong.' },
      { q: 'Is anything sent anywhere?', a: 'No. Encoding, decoding and parsing all happen in this tab.' },
    ],
  },
};
