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

export type ToolId = Exclude<PageId, 'home' | 'diff-checker' | 'json-diff' | 'guide-compare-json' | 'guide-json-to-csv' | 'about' | 'contact'>;

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
  },
  'title-case': {
    h1: 'Title case converter',
    lede: 'Capitalize titles and headlines correctly in AP, Chicago, APA, MLA or New York Times style. Acronyms, brand names and URLs stay as you wrote them.',
    steps: [
      { title: 'Paste your titles', body: 'One title or many, one per line.' },
      { title: 'Choose a style guide', body: 'Each style lowercases different minor words. The rule is shown under the buttons.' },
      { title: 'Copy the result', body: 'First and last words, and the word after a colon, are always capitalized.' },
    ],
    faq: [
      { q: 'Which words stay lowercase in a title?', a: 'Usually articles (a, an, the), coordinating conjunctions (and, but, or, nor) and prepositions. Chicago and MLA lowercase prepositions of any length; AP and APA capitalize words of four letters or more, so "Between" and "With" are capitalized.' },
      { q: 'What about words like iPhone or NASA?', a: 'Words that already have capitals inside them, all-caps acronyms and URLs are left exactly as written.' },
      { q: 'Which style should I use?', a: 'AP for news and most blogs, Chicago for books and many publishers, APA for psychology and social sciences, MLA for humanities papers.' },
    ],
  },
  'word-counter': {
    h1: 'Word counter',
    lede: 'Count words, characters, sentences and paragraphs as you type, with reading and speaking time and your most-used words. Private: your text stays in your browser.',
    steps: [
      { title: 'Type or paste', body: 'Counts update on every keystroke, even for very long documents.' },
      { title: 'Check the limits', body: 'Characters with and without spaces, for essays, tweets, meta descriptions and form limits.' },
      { title: 'Spot repetition', body: 'The top-words list (common words like "the" left out) shows what you lean on.' },
    ],
    faq: [
      { q: 'How are words counted?', a: 'A word is a run of letters or digits, which may include apostrophes and hyphens: "don’t" and "well-known" are one word each. Numbers count as words, like in Word and Google Docs.' },
      { q: 'How is reading time worked out?', a: 'At 238 words a minute, the average adult silent reading speed found by a large 2019 review; speaking time uses 150 words a minute.' },
      { q: 'Do emoji count as one character?', a: 'Yes. Characters are counted as you see them, so an emoji or an accented letter counts once.' },
      { q: 'Is my text saved or uploaded?', a: 'Neither. It stays in this tab and is gone when you close it.' },
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
  },
  'color-converter': {
    h1: 'Color converter',
    lede: 'Convert a color between HEX, RGB, HSL, HSV, OKLCH and CMYK, check its contrast against white and black, and get tints, shades and harmonious palettes.',
    steps: [
      { title: 'Enter or pick a color', body: 'Type any CSS color (#ff7f50, rgb(), hsl(), oklch() or a name like coral), or use the picker.' },
      { title: 'Copy any format', body: 'Every notation updates together, ready to paste into CSS or a design tool.' },
      { title: 'Build a palette', body: 'Tints and shades, plus complementary, analogous and triadic colors. Click any swatch to use it.' },
    ],
    faq: [
      { q: 'How do I convert HEX to RGB?', a: 'Split the six digits into pairs and read each as a hexadecimal number: #ff7f50 is ff = 255, 7f = 127, 50 = 80, so rgb(255 127 80). Paste it above to get every format at once.' },
      { q: 'What contrast ratio do I need?', a: 'WCAG asks for at least 4.5:1 for normal text (AA) and 3:1 for large text; 7:1 meets AAA. The ratios against white and black are shown for every color.' },
      { q: 'What is OKLCH?', a: 'A modern CSS color space where equal steps in lightness look equal to the eye, which makes it better than HSL for building consistent palettes.' },
    ],
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
  },
  'code-beautifier': {
    h1: 'Code beautifier',
    lede: 'Format messy or minified code in Python, Java, C, C++, C#, Go, PHP, JavaScript, TypeScript, Lua and Shell, plus SQL, HTML, CSS, JSON and YAML. Each language uses its own standard formatter.',
    steps: [
      { title: 'Paste your code', body: 'The language is detected automatically; pick it from the list if the guess is wrong.' },
      { title: 'Set the style', body: '“Default” follows each language’s convention (4 spaces for Python and Java, tabs for Go); or choose 2 spaces, 4 spaces or tabs, and the line width.' },
      { title: 'Copy or download', body: 'The formatted code updates as you type. Syntax errors are reported instead of breaking your code.' },
    ],
    faq: [
      { q: 'Which formatters are used?', a: 'The standard one for each language: Ruff (Black-compatible) for Python, clang-format for C, C++, Java and C#, gofmt for Go, Mago for PHP, StyLua for Lua, shfmt for shell scripts and Prettier for JavaScript, TypeScript, HTML, CSS, JSON, YAML and Markdown.' },
      { q: 'Is it the same as running the formatter locally?', a: 'Yes. These are the real formatters compiled to WebAssembly, so the output matches what you get on your machine with the same settings.' },
      { q: 'What about Rust, Kotlin, Swift or Ruby?', a: 'Their formatters can’t run in a browser yet. They’ll be added as browser builds become available.' },
      { q: 'Is my code uploaded?', a: 'No. Formatting happens in this tab, so it’s safe for private and proprietary code.' },
    ],
  },
  'markdown-preview': {
    h1: 'Markdown preview',
    lede: 'Write Markdown and see it rendered live, GitHub-flavored: headings, tables, task lists, code blocks and links. Copy or download the HTML. Private, in your browser.',
    steps: [
      { title: 'Write or paste Markdown', body: 'A README, notes or docs. The preview updates as you type.' },
      { title: 'Check the result', body: 'GitHub-flavored Markdown: tables, task lists, strikethrough and fenced code all render.' },
      { title: 'Export', body: 'Copy the HTML, or download a standalone HTML page.' },
    ],
    faq: [
      { q: 'Which Markdown flavor is supported?', a: 'GitHub-flavored Markdown (GFM): CommonMark plus tables, task lists, strikethrough and autolinks.' },
      { q: 'Is the preview safe with untrusted Markdown?', a: 'Yes. The HTML is sanitized before display, so scripts and event handlers in the Markdown can’t run.' },
      { q: 'Why don’t images from other sites show?', a: 'The page blocks every outside request to keep your text private, and that includes images. They appear normally in the exported HTML.' },
    ],
  },
};
