/** Guide titles and dates, kept free of React so the build config can read them (structured data). */

export type GuideId = 'guide-compare-json' | 'guide-json-to-csv';

export const GUIDE_META: Record<GuideId, { h1: string; lede: string; published: string }> = {
  'guide-compare-json': {
    h1: 'How to compare two JSON files',
    lede: 'Why a plain text diff of JSON is misleading, and how to see only the changes that matter: values, added keys and removed keys.',
    published: '2026-10-17',
  },
  'guide-json-to-csv': {
    h1: 'JSON to CSV for Excel: nested objects, arrays and encoding',
    lede: 'How to turn JSON, especially nested JSON from an API, into a CSV that opens cleanly in Excel or Google Sheets.',
    published: '2026-10-17',
  },
};
