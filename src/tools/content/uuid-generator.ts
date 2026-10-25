import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'UUID generator',
  lede: 'Generate up to 1,000 UUIDs at once: random version 4 or time-ordered version 7. Choose upper case, no dashes or {braces}, then copy them all or download a text file.',
  steps: [
    { title: 'Pick a version and how many', body: 'v4 is fully random. v7 starts with the current time in milliseconds, so new IDs sort after older ones.' },
    { title: 'Choose the format', body: 'Lower or upper case, with or without dashes, and with braces for the Windows GUID style. Changing the format doesn’t change the IDs.' },
    { title: 'Copy or download', body: 'Copy all of them, download a .txt with one per line, or press Regenerate for a fresh batch. Paste any UUID in the checker to see its version.' },
  ],
  faq: [
    { q: 'What is the difference between UUID v4 and v7?', a: 'Version 4 is 122 random bits. Version 7 (RFC 9562) puts a 48-bit Unix timestamp in milliseconds first, then random bits, so IDs created later sort later. That keeps database indexes compact when UUIDs are primary keys.' },
    { q: 'Is a UUID the same as a GUID?', a: 'Yes. GUID is Microsoft’s name for the same 128-bit format. Windows tools often show it in upper case inside braces, like {3F2504E0-4F89-41D3-9A0C-0305E82C3301}; the Braces and Uppercase switches give you that form.' },
    { q: 'Can two generated UUIDs collide?', a: 'In practice, no. With 122 random bits you would need to generate around 2.7 quintillion v4 UUIDs for a 50% chance of a single duplicate. Within one v7 batch, a counter keeps every ID in the same millisecond distinct and in order.' },
    { q: 'Are these UUIDs random enough for secrets?', a: 'They come from crypto.getRandomValues, the browser’s secure random source. Still, a UUID is an identifier, not a password: v7 also reveals when it was made.' },
    { q: 'Are the UUIDs saved or sent anywhere?', a: 'No. They are generated in this tab and aren’t stored; only your options are remembered in this browser.' },
  ],
  mistakes: [
    { title: 'Using v4 as a database primary key at scale', body: 'Random keys land all over a B-tree index, which slows inserts on big tables. v7 keys arrive in time order and avoid that.' },
    { title: 'Treating a v7 UUID as private', body: 'Its first 12 hex digits are the creation time in milliseconds. Anyone can read when the ID was made; the checker below shows it.' },
    { title: 'Comparing UUIDs as case-sensitive strings', body: 'UUIDs are case-insensitive: 550E8400… and 550e8400… are the same ID. Normalise to lower case before comparing or storing.' },
    { title: 'Storing UUIDs as 36-character text', body: 'Most databases have a native UUID type that stores the 16 bytes. Text takes more than twice the space and compares more slowly.' },
  ],
  related: ['password-generator', 'hash-generator', 'unix-timestamp', 'mock-json'],
};

export default content;
