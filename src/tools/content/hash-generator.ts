import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Hash generator',
  lede: 'Get the MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hash of text or a file, in hex or Base64. Paste an expected checksum to see if a download matches.',
  steps: [
    { title: 'Type text or drop a file', body: 'Text is hashed as UTF-8 as you type. Files of any type up to 200 MB are read on your device and never uploaded.' },
    { title: 'Read the hashes', body: 'All five appear at once, in lower-case hex, upper-case hex or Base64, each with its own copy button. Turn on HMAC to hash text with a secret key.' },
    { title: 'Check a checksum', body: 'Paste the hash a website publishes for a download. The tool tells you which algorithm matches, or that nothing does.' },
  ],
  faq: [
    { q: 'Which hash should I use?', a: 'SHA-256 for checksums and anything new. MD5 and SHA-1 are still fine for spotting accidental corruption, but people can deliberately create two different files with the same MD5 or SHA-1 hash, so don’t rely on them for security.' },
    { q: 'Can I hash passwords with this?', a: 'Not for storing them. Plain SHA-256 or MD5 is far too fast: attackers can try billions of guesses a second. Password storage needs a slow algorithm like Argon2, bcrypt or scrypt.' },
    { q: 'Why is my hash different from the one my command line gives?', a: 'Usually a trailing newline. echo "abc" | sha256sum hashes "abc" plus a newline; use echo -n. Line endings (CRLF vs LF) and text encoding also change the bytes, and so the hash.' },
    { q: 'What is HMAC?', a: 'A hash mixed with a secret key, used to sign API requests and webhooks. Only someone with the key can produce the same value. The tool offers HMAC-SHA-1, SHA-256, SHA-384 and SHA-512; the key stays in memory and is never saved.' },
    { q: 'Is my file uploaded?', a: 'No. The browser reads the file locally and hashes it in this tab. SHA hashes use the built-in Web Crypto API; MD5 is computed in the page.' },
  ],
  example: {
    intro: 'The classic test sentence, hashed as UTF-8 text with no trailing newline.',
    inputLabel: 'text',
    input: 'The quick brown fox jumps over the lazy dog',
    outputLabel: 'MD5 · SHA-256',
    output: '9e107d9d372bb6826bd81d3542a419d6\nd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
  },
  mistakes: [
    { title: 'Hashing a trailing newline by accident', body: 'Text copied from a terminal or saved by an editor often ends with a line break. One extra byte gives a completely different hash.' },
    { title: 'Storing passwords as SHA-256', body: 'Fast hashes are easy to brute-force. Use a password hashing function such as Argon2id or bcrypt, with a salt.' },
    { title: 'Trusting MD5 to prove a file is genuine', body: 'MD5 catches corruption, but an attacker can craft a different file with the same MD5. Compare SHA-256 when it’s published.' },
    { title: 'Comparing hex in different cases', body: 'A9993E… and a9993e… are the same hash. The compare box ignores case, spaces and a trailing file name.' },
  ],
  related: ['base64', 'uuid-generator', 'password-generator', 'jwt-decoder'],
};

export default content;
