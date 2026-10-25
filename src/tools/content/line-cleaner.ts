import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Line cleaner',
  lede: 'Remove duplicate lines, trim spaces, drop blank lines and sort a list A–Z, Z–A, naturally, by length or by number, with before and after counts. Runs in your browser.',
  steps: [
    { title: 'Paste your lines', body: 'One item per line: emails, IDs, keywords, log lines. Open a text file or drop it on the left; it’s read on your machine and never uploaded.' },
    {
      title: 'Choose what to clean',
      body: 'Remove duplicates (optionally ignoring case), trim spaces from each line, drop blank lines, then pick a sort order or shuffle. Reverse flips whatever order you end up with.',
    },
    { title: 'Check the counts and copy', body: 'The counts show how many lines you had, how many were unique, and how many duplicates and blank lines were removed. Copy the result or download it as a .txt file.' },
  ],
  faq: [
    {
      q: 'Which copy of a duplicate is kept?',
      a: 'The first one, in its original position. With Ignore case on, Apple and apple count as the same line, and whichever comes first keeps its casing.',
    },
    {
      q: 'What’s the difference between A–Z and natural sort?',
      a: 'A–Z compares text character by character, so item10 comes before item2. Natural sort reads runs of digits as numbers, so item2 comes before item10. Both follow your browser’s language rules for accents and case.',
    },
    {
      q: 'How does sorting by number work?',
      a: 'Each line is sorted by the first number in it, such as 42, -3 or 2.5. Lines without a number go to the end, in their original order. A dash right after a letter, as in item-7, isn’t read as a minus sign.',
    },
    {
      q: 'Does it handle Windows line endings?',
      a: 'Yes. Lines can end in \\n, \\r\\n or \\r, and the result uses \\n. One line break at the very end doesn’t count as an extra empty line.',
    },
    { q: 'Is my text uploaded?', a: 'No. Everything happens in this tab.' },
  ],
  example: {
    intro: 'Duplicates removed ignoring case, spaces trimmed, the blank line dropped, then sorted A–Z. Apple and pear keep the casing of their first appearance.',
    inputLabel: 'lines',
    input: 'pear\nApple\n  banana\napple\n\nPear\n',
    outputLabel: 'cleaned',
    output: 'Apple\nbanana\npear',
  },
  mistakes: [
    { title: 'Spaces hiding duplicates', body: '"apple" and "apple " look the same but aren’t. Keep Trim spaces on unless the spaces matter.' },
    { title: 'Sorting numbers as text', body: 'A–Z puts 10 before 9. Use natural sort or sort by number for lists of IDs, versions or amounts.' },
    { title: 'Forgetting about case', body: 'By default, Apple and apple are different lines. Turn on Ignore case for emails, tags or keywords where case doesn’t matter.' },
    { title: 'Sorting when order matters', body: 'Keep order removes duplicates without moving anything, which is what you want for steps, logs or ranked lists.' },
  ],
  related: ['list-to-sql', 'word-counter', 'case-converter', 'diff-checker'],
};

export default content;
