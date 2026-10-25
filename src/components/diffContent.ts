import type { Variant } from '@/variant';

/** Heading, how-to and FAQ for the two diff pages (/diff-checker/ and /json-diff/). */
export const DIFF_CONTENT: Record<
  Variant,
  { title: string; description: string; stepsTitle: string; steps: { title: string; body: string }[]; faq: { q: string; a: string }[] }
> = {
  text: {
    title: 'Diff checker',
    description: 'Compare two texts or files, line by line and word by word. Free, unlimited, and your text never leaves your browser.',
    stepsTitle: 'How to compare two texts',
    steps: [
      { title: 'Paste or drop both versions', body: 'The original goes on the left (a), the changed version on the right (b). Files are read on your machine, never uploaded.' },
      { title: 'Read the changes', body: 'Removed lines are red, added lines green, and changed words inside a line are marked. Jump between changes with the arrows.' },
      { title: 'Merge, share or export', body: 'Copy a change across with one click, share a link that carries both texts, download a .patch file, or save the comparison as a PDF.' },
    ],
    faq: [
      { q: 'Is there a size limit?', a: 'No fixed limit. Files with hundreds of thousands of lines work; the only limit is your browser’s memory.' },
      { q: 'Is my text uploaded?', a: 'No. The diff is computed in this tab, and the page is blocked from sending data to any server. Share links keep the texts in the part of the URL after #, which browsers never send.' },
      { q: 'Can it ignore whitespace or case?', a: 'Yes. Ignore whitespace, case, or lines matching your own patterns, and the diff updates instantly.' },
    ],
  },
  json: {
    title: 'JSON diff',
    description: 'Compare two JSON files and see every changed key and value. Format and sort keys in one click, so only real changes show.',
    stepsTitle: 'How to compare two JSON files',
    steps: [
      { title: 'Paste or drop both files', body: 'Put the old JSON on the left (a) and the new JSON on the right (b). Files are read on your machine, never uploaded.' },
      {
        title: 'Format and sort keys',
        body: 'Minified JSON and keys in a different order would otherwise look like changes. Format JSON & sort keys pretty-prints both sides with keys A–Z, leaving only real differences.',
      },
      { title: 'Read the changes', body: 'Changed values are marked word by word, added keys in green, removed keys in red. Invalid JSON is flagged with the exact line and column.' },
    ],
    faq: [
      { q: 'Does key order count as a change?', a: 'Not after Format JSON & sort keys: both sides are sorted A–Z, so reordered keys line up and only real changes show.' },
      { q: 'What kinds of JSON work?', a: 'API responses, config files, package.json, translation files and any other JSON, up to hundreds of thousands of lines.' },
      { q: 'Is my JSON uploaded?', a: 'No. Everything happens in this tab; nothing is sent anywhere.' },
    ],
  },
};
