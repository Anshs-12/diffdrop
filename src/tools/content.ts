import type { PageId } from '@/site';
// The newer tools' text; those files import only types from here, so there is no cycle at runtime
import { NEW_TOOL_CONTENT } from './content/index';

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
  /** A worked example: real input and the tool's real output (checked by a test). */
  example?: WorkedExample;
  /** Mistakes people commonly make with this kind of task. */
  mistakes?: { title: string; body: string }[];
  /** Other pages worth linking from this one ("Related tools"). */
  related?: PageId[];
}

export interface WorkedExample {
  intro: string;
  inputLabel: string;
  input: string;
  outputLabel: string;
  output: string;
  note?: string;
}

export type ToolId = Exclude<PageId, 'home' | 'diff-checker' | 'json-diff' | 'guide-compare-json' | 'guide-json-to-csv' | 'about' | 'contact'>;

export const TOOL_CONTENT: Record<ToolId, ToolContent> = {
  ...NEW_TOOL_CONTENT,
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
    related: ['json-validator', 'json-viewer', 'json-diff', 'json-to-typescript'],
  },
  'json-validator': {
    h1: 'JSON validator',
    lede: 'Check whether your JSON is valid, and if it isn’t, see exactly where and why: the line, the column and a plain explanation. Runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'It is checked as you type, so you can fix it in place.' },
      { title: 'Read the result', body: 'Valid JSON shows a summary of its structure. Invalid JSON shows the first error, with the line highlighted.' },
      { title: 'Jump to the error', body: 'Go to error puts the cursor right where the problem is. Common causes: trailing commas, single quotes, unquoted keys. Once it’s valid, the buttons above the editor copy it formatted or minified.' },
    ],
    faq: [
      { q: 'Why is my JSON invalid?', a: 'The usual suspects are a comma after the last item, keys or strings in single quotes, unquoted keys, comments, or a missing closing bracket. JSON is stricter than JavaScript.' },
      { q: 'Which JSON standard is used?', a: 'Strict JSON (RFC 8259), the same rules as JSON.parse in every browser.' },
      { q: 'Does it catch duplicate keys?', a: 'Yes. Duplicate keys are technically allowed, so the JSON still counts as valid, but you get a warning with the line and column, because most parsers silently keep only the last value.' },
      { q: 'Is my JSON sent anywhere?', a: 'No. Validation happens in this tab; nothing is uploaded.' },
    ],
    related: ['json-formatter', 'yaml-validator', 'json-viewer', 'json-diff'],
  },
  'json-to-csv': {
    h1: 'JSON to CSV converter',
    lede: 'Turn a JSON array into a CSV file you can open in Excel, Google Sheets or Numbers, or turn a CSV file back into JSON. Nested objects become columns like address.city. Runs in your browser.',
    steps: [
      { title: 'Pick the direction and paste', body: 'JSON → CSV takes an array of objects: each object becomes a row, and an API response like {"data": [...]} uses its array automatically. CSV → JSON takes any CSV or TSV file, with or without a header row.' },
      { title: 'Choose the options', body: 'For CSV: comma, semicolon or tab, and whether to escape formulas. For JSON: the delimiter (detected unless you pick one), whether the first row holds the keys, number and true/false detection, and rebuilding nested objects from dotted headers.' },
      { title: 'Copy or download', body: 'Columns are every key found, in the order first seen, and lists inside a row are kept as JSON in one cell. The JSON side is formatted with 2-space indentation.' },
    ],
    faq: [
      { q: 'How are nested objects handled?', a: 'They are flattened into dotted column names: {"address": {"city": "London"}} becomes a column address.city. Going the other way, Nest dotted keys turns address.city back into a nested object.' },
      { q: 'What about arrays inside objects?', a: 'They are written into a single cell as JSON text (for example ["admin","editor"]), so no data is lost. CSV → JSON reads them back as arrays when number and true/false detection is on.' },
      { q: 'Will Excel open it correctly?', a: 'Yes. Downloads start with a UTF-8 byte order mark, so accented letters and emoji show correctly in Excel. Escape formulas is on by default, so cells starting with = + - or @ can’t run as formulas; turn it off if you need those cells exactly as they are.' },
      { q: 'Why are my numbers strings in the JSON?', a: 'CSV has no types, so every value stays a string unless you turn on number and true/false detection. Even then, values that would change are kept as text: IDs with leading zeros like 007, 1.10, and numbers too long to store exactly.' },
      { q: 'Which CSV files can it read?', a: 'Standard CSV (RFC 4180): quoted fields with commas, line breaks or doubled quotes ("") inside, Windows or Unix line endings, and a byte order mark at the start. An unclosed quote is reported with its line and column.' },
      { q: 'Is my data uploaded?', a: 'No. The conversion runs in this tab; your data never leaves your browser.' },
    ],
    related: ['guide-json-to-csv', 'json-viewer', 'json-formatter', 'mock-json'],
  },
  'json-to-yaml': {
    h1: 'JSON to YAML converter',
    lede: 'Convert JSON into clean, valid YAML for configs, Kubernetes manifests or CI files, or YAML back into JSON. Strings are quoted only when YAML would misread them. Runs in your browser.',
    steps: [
      { title: 'Pick the direction and paste', body: 'JSON → YAML takes any valid JSON: objects, arrays or a single value. YAML → JSON takes any YAML file, including comments, anchors and several documents.' },
      { title: 'Get the result as you type', body: 'YAML comes out in block style with 2-space indentation, and values like "yes", "on", "1.0" or "null" stay strings by being quoted. JSON comes out with 2-space indentation; YAML errors show their line and column.' },
      { title: 'Copy or download', body: 'Save it as a .yaml or .json file, or paste it straight into your config or code.' },
    ],
    faq: [
      { q: 'Why are some strings quoted?', a: 'YAML reads bare words like yes, no, on, off, null and numbers as booleans, null or numbers. Quoting keeps them as the strings they were in your JSON.' },
      { q: 'Is the output valid YAML?', a: 'Yes. It reads back to exactly the same data in both YAML 1.1 and 1.2 parsers; this is checked on thousands of tricky inputs in our tests.' },
      { q: 'How is YAML read when converting to JSON?', a: 'As YAML 1.2, the current version, so a bare yes or off stays a string rather than becoming true or false. Anchors, aliases and << merge keys are expanded, comments are dropped, and long integers keep every digit.' },
      { q: 'What happens to YAML that JSON can’t hold?', a: 'Several documents separated by --- become one JSON array. Infinity and NaN become null, and keys that aren’t strings, like 1 or true, become strings. The status line tells you when this happens.' },
      { q: 'Is my data uploaded?', a: 'No. The conversion runs in this tab.' },
    ],
    example: {
      intro: 'A small service config. "yes" and "1.10" are strings in the JSON, so they are quoted in the YAML; otherwise YAML would read them as true and 1.1.',
      inputLabel: 'json',
      input: '{"name":"web","replicas":3,"enabled":"yes","version":"1.10","ports":[80,443],"env":{"MODE":"prod","DEBUG":false}}',
      outputLabel: 'yaml',
      output: 'name: web\nreplicas: 3\nenabled: "yes"\nversion: "1.10"\nports:\n- 80\n- 443\nenv:\n  MODE: prod\n  DEBUG: false\n',
    },
    mistakes: [
      { title: 'The Norway problem', body: 'In YAML 1.1, unquoted yes, no, on, off (and NO, the country code for Norway) become booleans. Quote them when they are meant as text.' },
      { title: 'Versions turning into numbers', body: '1.10 unquoted is the number 1.1, and 1.0 becomes 1. Quote version strings.' },
      { title: 'Tabs for indentation', body: 'YAML forbids tabs for indentation; a single tab makes the file invalid. Use spaces.' },
      { title: 'A colon inside a value', body: 'An unquoted "key: value: more" starts a new mapping. Quote values that contain ": " or start with characters like @, `, * or &.' },
      { title: 'Leading zeros', body: 'File modes like 0755 are read as octal numbers in YAML 1.1. Quote them to keep the exact text.' },
    ],
    related: ['yaml-validator', 'json-formatter', 'json-to-typescript'],
  },
  'json-viewer': {
    h1: 'JSON viewer',
    lede: 'Explore JSON as a collapsible tree, a table or formatted text. Expand what you need, search keys and values, and click any value to copy its path. Runs in your browser.',
    steps: [
      { title: 'Paste or open your JSON', body: 'API responses, logs, configs: anything valid. Large files stay fast because only open branches are drawn. The input side can switch to a tree or table too.' },
      { title: 'Pick a view', body: 'Tree to expand branches and search keys and values. Table to see an array of objects as rows, with one column per key. Text for the whole document, formatted.' },
      { title: 'Copy paths and values', body: 'Click a row or a table cell to copy its path, like $.users[0].email, ready for code or jq-style tools. Copy full JSON copies the whole document, formatted.' },
    ],
    faq: [
      { q: 'How big a file can it open?', a: 'Large ones. Only expanded branches are rendered, so a file with hundreds of thousands of values still opens instantly. The table shows the first 1,000 rows and says how many there are in all.' },
      { q: 'What does the path look like?', a: 'JavaScript style: $.users[0].address.city, with ["odd key"] for keys that contain spaces or symbols.' },
      { q: 'What does the table show for data that isn’t a list?', a: 'An array of objects gets one row per item and one column per key, in the order keys first appear. An object gets a row per key, an array of plain values a row per item, and nested values are shown as short one-line JSON.' },
      { q: 'Is my JSON sent anywhere?', a: 'No. Everything happens in this tab.' },
    ],
    example: {
      intro: 'Two users; clicking the email of the first and the first-name of the second copies these paths. Keys with a dash need bracket notation.',
      inputLabel: 'json',
      input: '{"users":[{"email":"ada@example.com"},{"first-name":"Grace"}]}',
      outputLabel: 'copied paths',
      output: '$.users[0].email\n$.users[1]["first-name"]',
    },
    mistakes: [
      { title: 'Dot notation for odd keys', body: 'Keys with spaces, dashes or starting with a digit need brackets: $.user["first-name"], not $.user.first-name.' },
      { title: 'Counting from one', body: 'Arrays are zero-indexed: the first item is [0], the third is [2].' },
      { title: 'Mixing path styles', body: 'Paths here are JavaScript style ($.a[0].b). jq writes the same path as .a[0].b: drop the $.' },
      { title: 'Searching with one letter', body: 'Search starts at two characters, so a single letter doesn’t filter the tree.' },
    ],
    related: ['json-formatter', 'json-to-csv', 'json-diff', 'json-to-typescript'],
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
    related: ['hash-generator', 'url-encoder', 'jwt-decoder', 'html-entities'],
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
    related: ['cron-generator', 'jwt-decoder', 'uuid-generator'],
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
    related: ['base64', 'unix-timestamp', 'hash-generator', 'json-formatter'],
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
    related: ['line-cleaner', 'list-to-sql', 'slug-generator'],
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
    related: ['base64', 'html-entities', 'slug-generator', 'qr-code'],
  },
  'case-converter': {
    h1: 'Case converter',
    lede: 'Change text to UPPER CASE, lower case, Sentence case or Title Case, or to camelCase, snake_case and kebab-case for code. Every format at once, as you type.',
    steps: [
      { title: 'Paste your text', body: 'Any length. Each line is converted separately for code cases, so a list of names converts one per line.' },
      { title: 'Pick a case', body: 'Click a case to show it in the output, or scan the preview of every case at once.' },
      { title: 'Copy the result', body: 'Copy or download. Accented letters and other alphabets convert correctly.' },
    ],
    faq: [
      { q: 'What is the difference between Title Case and Capitalized Case?', a: 'Capitalized Case capitalizes every word. Title Case follows style-guide rules and keeps short words like "of", "and" and "the" lowercase unless they start or end the title. For AP, APA or MLA rules, use the title case converter.' },
      { q: 'How does it split words for camelCase and snake_case?', a: 'At spaces, punctuation and existing case changes, so "parseHTTPRequest", "parse http request" and "parse-http-request" all become parse_http_request.' },
      { q: 'Is my text uploaded?', a: 'No. Conversion happens in this tab.' },
    ],
    related: ['title-case', 'slug-generator', 'line-cleaner', 'word-counter'],
  },
  'title-case': {
    h1: 'Title case converter',
    lede: 'Capitalize titles and headlines correctly in AP, Chicago, APA, MLA or New York Times style. Paste one headline or a whole list; acronyms, brand names and URLs stay as you wrote them.',
    steps: [
      { title: 'Paste your titles', body: 'One title or many, one per line: article headlines, chapter names, email subjects.' },
      { title: 'Choose a style guide', body: 'Each style lowercases different minor words. The rule is shown under the buttons.' },
      { title: 'Copy the result', body: 'First and last words, and the word after a colon, are always capitalized.' },
    ],
    faq: [
      { q: 'How do I capitalize a title?', a: 'Capitalize the first and last word and every major word (nouns, pronouns, verbs, adjectives and adverbs), and keep articles, short conjunctions and, depending on the style guide, prepositions lowercase. Paste the headline above and pick your style guide to have it done for you.' },
      { q: 'Which words stay lowercase in a title?', a: 'Usually articles (a, an, the), coordinating conjunctions (and, but, or, nor) and prepositions. Chicago and MLA lowercase prepositions of any length; AP and APA capitalize words of four letters or more, so "Between" and "With" are capitalized.' },
      { q: 'What about words like iPhone or NASA?', a: 'Words that already have capitals inside them, all-caps acronyms and URLs are left exactly as written.' },
      { q: 'Which style should I use?', a: 'AP for news and most blogs, Chicago for books and many publishers, APA for psychology and social sciences, MLA for humanities papers.' },
    ],
    example: {
      intro: 'One headline, two style guides. Chicago and MLA lowercase every preposition; AP and APA capitalize prepositions of four letters or more, so "From" and "With" change.',
      inputLabel: 'input',
      input: 'a guide to working from home with kids',
      outputLabel: 'Chicago · AP',
      output: 'A Guide to Working from Home with Kids\nA Guide to Working From Home With Kids',
    },
    mistakes: [
      { title: 'Capitalizing every word', body: 'That is Capitalized Case. Title case keeps short words like "of", "and" and "the" lowercase in the middle of a title.' },
      { title: 'Lowercasing the first or last word', body: 'Every style capitalizes the first and last word, even "a" or "up": "Where Are You From", not "from".' },
      { title: 'Lowercasing long prepositions in AP', body: 'AP and APA capitalize any word of four letters or more, so "Between", "Through" and "With" are capitalized there.' },
      { title: 'Forgetting the word after a colon', body: 'The first word after a colon starts a subtitle and is capitalized: "The End: A Story", not "The End: a Story".' },
      { title: 'Changing brand names and acronyms', body: 'iPhone, eBay and NASA keep their own capitals. The converter leaves words with inner capitals and all-caps words alone.' },
    ],
  },
  'word-counter': {
    h1: 'Word counter',
    lede: 'Count words and characters as you type: characters with and without spaces, sentences, paragraphs, and reading and speaking time. Set a character limit, such as 280 for a post or 160 for a text message, to see how many characters you have left.',
    steps: [
      { title: 'Type or paste', body: 'Counts update on every keystroke, even for very long documents. You can also open or drop a text file.' },
      { title: 'Set a character limit', body: 'Pick 160, 280, 500 or 1,000, or type your own. A bar shows how much is used and how many characters are left or over.' },
      { title: 'Copy the stats', body: 'Copy every count as plain text for a report or a brief. The top-words list (common words like "the" left out) shows what you repeat.' },
    ],
    faq: [
      { q: 'How are words counted?', a: 'A word is a run of letters or digits, which may include apostrophes and hyphens: "don’t" and "well-known" are one word each. Numbers count as words, like in Word and Google Docs.' },
      { q: 'Are spaces counted as characters?', a: 'In “Characters”, yes: every space, line break and punctuation mark counts. “Without spaces” leaves out spaces, tabs and line breaks. Forms and essay limits usually mean characters with spaces.' },
      { q: 'Do emoji count as one character?', a: 'Yes. Characters are counted as you see them, so an emoji or an accented letter counts once.' },
      { q: 'Does it count the same way as X (Twitter)?', a: 'Not exactly. X counts every link as 23 characters, and counts emoji and Chinese, Japanese and Korean characters as two each. This counter counts each character once, so treat the 280 limit as a close guide.' },
      { q: 'Why does a text message split before 160 characters?', a: 'One SMS holds 160 characters only when every character is in the basic GSM alphabet. A single emoji or certain accented letters switch the whole message to a format that holds 70.' },
      { q: 'How is reading time worked out?', a: 'At 238 words a minute, the average adult silent reading speed found by a large 2019 review; speaking time uses 150 words a minute.' },
      { q: 'Is my text saved or uploaded?', a: 'It’s never uploaded. It is kept in this browser so it’s still here when you come back; “Forget input” clears it.' },
    ],
  },
  'password-generator': {
    h1: 'Password generator',
    lede: 'Create strong, random passwords using your browser’s cryptographic random number generator. Choose the length and characters and see how strong the result is.',
    steps: [
      { title: 'Set length and characters', body: 'Longer is stronger: 16 or more characters with all four sets is a good default.' },
      { title: 'Check the strength', body: 'Entropy in bits and a rough time to crack it by brute force.' },
      { title: 'Copy it', body: 'Generate as many as you like. Nothing is stored or sent anywhere.' },
    ],
    faq: [
      { q: 'Is it safe to generate passwords online?', a: 'This page creates them with crypto.getRandomValues in your browser and is blocked from making network requests, so the password never leaves your device. Store it in a password manager.' },
      { q: 'How long should a password be?', a: 'At least 12 characters; 16 or more for important accounts. Each extra character multiplies the work for an attacker far more than adding symbols does.' },
      { q: 'What does "exclude ambiguous characters" do?', a: 'Leaves out characters that look alike, such as I, l, 1, O and 0, which helps when a password has to be read or typed by hand.' },
    ],
    related: ['hash-generator', 'uuid-generator', 'qr-code'],
  },
  'lorem-ipsum': {
    h1: 'Lorem ipsum generator',
    lede: 'Generate lorem ipsum placeholder text by paragraphs, sentences or words, as plain text or HTML. Starts with the classic "Lorem ipsum dolor sit amet" if you like.',
    steps: [
      { title: 'Choose how much', body: 'A number of paragraphs, sentences or words.' },
      { title: 'Pick the format', body: 'Plain text, or HTML with each paragraph in <p> tags.' },
      { title: 'Copy it', body: 'Regenerate for different text; the length stays the same.' },
    ],
    faq: [
      { q: 'What is lorem ipsum?', a: 'Scrambled Latin, derived from Cicero’s "De finibus bonorum et malorum" (45 BC), used since the 1500s as placeholder text so a layout can be judged without readable content distracting from it.' },
      { q: 'Why not use real text?', a: 'Readable text draws attention to what it says. Lorem ipsum has a natural-looking spread of word lengths without meaning, so people focus on the design.' },
      { q: 'Is it free to use?', a: 'Yes. Lorem ipsum is public domain and so is everything this generator writes.' },
    ],
    example: {
      intro: 'Eight words, starting with the classic opening, as plain text.',
      inputLabel: 'settings',
      input: 'Words: 8\nStart with "Lorem ipsum": on\nHTML: off',
      outputLabel: 'output',
      output: 'Lorem ipsum dolor sit amet consectetur adipiscing elit',
    },
    mistakes: [
      { title: 'Shipping placeholder text', body: 'Lorem ipsum left in a live page looks broken. Search the build for "lorem" before every release.' },
      { title: 'Testing only with lorem ipsum', body: 'Real text has long words, numbers, links and other languages that break layouts in ways Latin filler never will. Test with real content too.' },
      { title: 'Using it where screen readers go', body: 'Screen readers read the Latin aloud. Keep placeholder text out of alt text, labels and anything assistive tech announces.' },
      { title: 'Pasting HTML into a text field', body: 'The HTML option wraps paragraphs in <p> tags; pasted into a plain text field, the tags show up as text. Use plain text there.' },
    ],
    related: ['word-counter', 'mock-json', 'line-cleaner', 'case-converter'],
  },
  'qr-code': {
    h1: 'QR code generator',
    lede: 'Make QR codes for links, text, Wi-Fi, email or phone numbers. Choose colors, size and error correction, then download a PNG or SVG. Free, with no sign-up and no expiry.',
    steps: [
      { title: 'Pick what to encode', body: 'A link or text, Wi-Fi details (so phones join with a scan), an email or a phone number.' },
      { title: 'Style it', body: 'Colors, size, quiet-zone margin and error correction. Keep strong contrast so every phone can scan it.' },
      { title: 'Download', body: 'SVG for print at any size, PNG for screens and documents.' },
    ],
    faq: [
      { q: 'Do these QR codes expire?', a: 'Never. The QR code contains your data directly, not a redirect through someone’s server, so it works for as long as the link or text inside it does.' },
      { q: 'Are scans tracked?', a: 'No. There is no short link or tracking server in between; a scan goes straight to what you encoded.' },
      { q: 'What is error correction?', a: 'Extra data that lets a scanner read a damaged or partly covered code: L recovers about 7%, M 15%, Q 25% and H 30%. Higher levels make the code denser.' },
      { q: 'How much can a QR code hold?', a: 'Up to about 2,900 bytes at level L: plenty for links and Wi-Fi details. Shorter content gives a simpler, easier-to-scan code.' },
    ],
    related: ['url-encoder', 'favicon-generator', 'image-resizer'],
  },
  'color-converter': {
    h1: 'Color converter',
    lede: 'Convert a color between HEX, RGB, HSL, HSV, OKLCH and CMYK, check its contrast against white and black, and get tints, shades and harmonious palettes.',
    steps: [
      { title: 'Enter or pick a color', body: 'Type any CSS color (#ff7f50, rgb(), hsl(), oklch() or a name like coral), or click “Pick a color” to choose one visually.' },
      { title: 'Copy any format', body: 'Every notation updates together, ready to paste into CSS or a design tool.' },
      { title: 'Build a palette', body: 'Tints and shades, plus complementary, analogous and triadic colors. Click any swatch to use it.' },
    ],
    faq: [
      { q: 'How do I convert HEX to RGB?', a: 'Split the six digits into pairs and read each as a hexadecimal number: #ff7f50 is ff = 255, 7f = 127, 50 = 80, so rgb(255 127 80). Paste it above to get every format at once.' },
      { q: 'Can I pick a color instead of typing one?', a: 'Yes. “Pick a color” opens your browser’s color picker; in Chrome and Edge on desktop it includes an eyedropper for sampling any color on your screen. The chosen color fills in every format.' },
      { q: 'What contrast ratio do I need?', a: 'WCAG asks for at least 4.5:1 for normal text (AA) and 3:1 for large text; 7:1 meets AAA. The ratios against white and black are shown for every color; the contrast checker tests any text and background pair.' },
      { q: 'What is OKLCH?', a: 'A modern CSS color space where equal steps in lightness look equal to the eye, which makes it better than HSL for building consistent palettes.' },
    ],
    related: ['color-palette', 'contrast-checker', 'css-gradient'],
  },
  'css-gradient': {
    h1: 'CSS gradient generator',
    lede: 'Design linear, radial and conic CSS gradients visually. Add color stops, drag positions, set the angle and copy the CSS. Works in every modern browser.',
    steps: [
      { title: 'Choose the type', body: 'Linear runs along an angle, radial spreads from the center, conic sweeps around it.' },
      { title: 'Edit the stops', body: 'Pick each color and its position; add or remove stops as you need.' },
      { title: 'Copy the CSS', body: 'A ready background property, previewed full size above.' },
    ],
    faq: [
      { q: 'Do CSS gradients need vendor prefixes?', a: 'No. linear-gradient, radial-gradient and conic-gradient work unprefixed in every current browser.' },
      { q: 'How do I make a hard color stop?', a: 'Give two stops the same position, such as red 50% and blue 50%, and the colors meet with a sharp edge instead of blending.' },
      { q: 'Is the gradient an image?', a: 'No, it is pure CSS, so it is sharp at any size and costs nothing to download.' },
    ],
    example: {
      intro: 'A left-to-right sunset fade: two stops, 90 degrees.',
      inputLabel: 'settings',
      input: 'Type: linear\nAngle: 90°\nStops: #ff7e5f at 0%, #feb47b at 100%',
      outputLabel: 'css',
      output: 'background: linear-gradient(90deg, #ff7e5f 0%, #feb47b 100%);',
    },
    mistakes: [
      { title: 'Using background-color', body: 'A gradient is an image, so background-color ignores it. Use background or background-image.' },
      { title: 'Getting the angle backwards', body: '0deg runs bottom to top and 90deg left to right; angles turn clockwise. "to right" is the same as 90deg.' },
      { title: 'Expecting a hard edge', body: 'Colors blend between stops. For a sharp line, give two stops the same position: red 50%, blue 50%.' },
      { title: 'Oval radial gradients', body: 'radial-gradient is an ellipse that follows the box shape unless you say circle.' },
    ],
    related: ['color-palette', 'contrast-checker', 'color-converter'],
  },
  'code-beautifier': {
    h1: 'Code beautifier',
    lede: 'Format messy or minified code in Python, Java, C, C++, C#, Go, PHP, JavaScript, TypeScript, Lua and Shell, plus SQL, HTML, CSS, JSON, XML and YAML. Each language uses its own standard formatter, and CSS, HTML, JSON and XML can be minified too.',
    steps: [
      { title: 'Paste your code', body: 'The language is detected automatically; pick it from the list if the guess is wrong.' },
      { title: 'Set the style', body: '“Default” follows each language’s convention (4 spaces for Python and Java, tabs for Go); or choose 2 spaces, 4 spaces or tabs, and the line width. For CSS, HTML, JSON and XML, switch to Minify for a compact copy.' },
      { title: 'Copy or download', body: 'The formatted code updates as you type. Syntax errors are reported instead of breaking your code.' },
    ],
    faq: [
      { q: 'Which formatters are used?', a: 'The standard one for each language: Ruff (Black-compatible) for Python, clang-format for C, C++, Java and C#, gofmt for Go, Mago for PHP, StyLua for Lua, shfmt for shell scripts, Prettier for JavaScript, TypeScript, HTML, CSS, YAML and Markdown, and sql-formatter for SQL. JSON goes through the site’s JSON formatter, which keeps numbers exactly as written. XML is checked for well-formedness and re-indented by a small built-in formatter that only changes whitespace between tags.' },
      { q: 'Is it the same as running the formatter locally?', a: 'For the formatters above, yes: Prettier runs as JavaScript and the others are compiled to WebAssembly, so the output matches what you get on your machine with the same settings.' },
      { q: 'Which languages can be minified?', a: 'CSS, HTML, JSON and XML. Minifying removes comments and whitespace that don’t matter and leaves everything else as written. JavaScript isn’t minified here: doing that safely takes a dedicated minifier such as Terser.' },
      { q: 'What about Rust, Kotlin, Swift or Ruby?', a: 'Their formatters can’t run in a browser yet. They’ll be added as browser builds become available.' },
      { q: 'Is my code uploaded?', a: 'No. Formatting happens in this tab, so it’s safe for private and proprietary code.' },
    ],
    related: ['python-formatter', 'java-beautifier', 'sql-formatter', 'json-formatter'],
  },
  'markdown-preview': {
    h1: 'Markdown preview',
    lede: 'A Markdown editor with live preview: write Markdown and see it rendered as you type, GitHub-flavored, with tables, task lists, code blocks and links. Save your work as a .md file or a standalone HTML page. Everything stays in your browser.',
    steps: [
      { title: 'Write or open Markdown', body: 'Start typing, paste a README, or open or drop a .md file. The preview updates as you type.' },
      { title: 'Check the result', body: 'GitHub-flavored Markdown: tables, task lists, strikethrough and fenced code all render as they would on GitHub.' },
      { title: 'Save or export', body: 'Copy or download the Markdown itself, copy the rendered HTML, or download a standalone HTML page titled after your first heading.' },
    ],
    faq: [
      { q: 'Can I use it as an online Markdown editor?', a: 'Yes. Your text is kept in this browser, so a draft is still here when you come back, and “Share” puts it in a link. Download it as a .md file to keep a copy; “Forget input” clears it.' },
      { q: 'Which Markdown flavor is supported?', a: 'GitHub-flavored Markdown (GFM): CommonMark plus tables, task lists, strikethrough and autolinks.' },
      { q: 'What is in the downloaded HTML page?', a: 'A complete document with your rendered Markdown, a title taken from the first heading and a little built-in styling for readable text, code and tables. It needs no other files, so you can open it anywhere or attach it to an email.' },
      { q: 'Is the preview safe with untrusted Markdown?', a: 'Yes. The HTML is sanitized before display and before export, so scripts and event handlers in the Markdown can’t run.' },
      { q: 'Why don’t images from other sites show?', a: 'The page blocks every outside request to keep your text private, and that includes images. They appear normally in the exported HTML.' },
    ],
    example: {
      intro: 'Release notes with a task list and inline code, and the HTML it turns into.',
      inputLabel: 'markdown',
      input: '## Release notes\n\n- [x] Faster startup\n- [ ] Dark mode\n\nRun `npm run build` to **ship** it.\n',
      outputLabel: 'html',
      output:
        '<h2>Release notes</h2>\n<ul>\n<li><input checked="" disabled="" type="checkbox"> Faster startup</li>\n<li><input disabled="" type="checkbox"> Dark mode</li>\n</ul>\n<p>Run <code>npm run build</code> to <strong>ship</strong> it.</p>\n',
    },
    mistakes: [
      { title: 'Expecting a newline to break the line', body: 'A single newline joins lines into one paragraph. End a line with two spaces or a backslash, or leave a blank line.' },
      { title: 'No blank line after a list', body: 'Text right under a list item, without a blank line, becomes part of that item.' },
      { title: 'Tables without the separator row', body: 'A table needs the | --- | line under the header; without it the pipes show as plain text.' },
      { title: 'Under-indented nested lists', body: 'Nested items must line up with the parent item’s text: 2 spaces under "- ", 3 under "1. ".' },
    ],
  },
};
