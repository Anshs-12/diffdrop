/** Titles and dates of guides and other text pages, kept free of React so the build config can read them. */

export type GuideId = 'guide-compare-json' | 'guide-json-to-csv' | 'about' | 'contact';

export const CONTACT_EMAIL = 'anshxcookies@gmail.com';

export const GUIDE_META: Record<GuideId, { h1: string; lede: string; published: string; kind: 'guide' | 'about' | 'contact' }> = {
  'guide-compare-json': {
    h1: 'How to compare two JSON files',
    lede: 'Why a plain text diff of JSON is misleading, and how to see only the changes that matter: values, added keys and removed keys.',
    published: '2026-10-17',
    kind: 'guide',
  },
  'guide-json-to-csv': {
    h1: 'JSON to CSV for Excel: nested objects, arrays and encoding',
    lede: 'How to turn JSON, especially nested JSON from an API, into a CSV that opens cleanly in Excel or Google Sheets.',
    published: '2026-10-17',
    kind: 'guide',
  },
  'about': {
    h1: 'About toolspace',
    lede: 'Free, open source developer tools that run in your browser.',
    published: '2026-10-17',
    kind: 'about',
  },
  contact: {
    h1: 'Contact',
    lede: 'Questions, feedback, a bug or an idea for a tool: email or open an issue.',
    published: '2026-10-17',
    kind: 'contact',
  },
};
