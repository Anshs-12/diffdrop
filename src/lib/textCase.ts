/** Case conversion, title case styles and text statistics. */

export type CaseMode =
  | 'upper'
  | 'lower'
  | 'sentence'
  | 'title'
  | 'capitalized'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'constant'
  | 'kebab'
  | 'dot'
  | 'alternating'
  | 'inverse';

export const CASE_MODES: { mode: CaseMode; label: string; example: string }[] = [
  { mode: 'upper', label: 'UPPER CASE', example: 'THE QUICK BROWN FOX' },
  { mode: 'lower', label: 'lower case', example: 'the quick brown fox' },
  { mode: 'sentence', label: 'Sentence case', example: 'The quick brown fox' },
  { mode: 'title', label: 'Title Case', example: 'The Quick Brown Fox' },
  { mode: 'capitalized', label: 'Capitalized Case', example: 'The Quick Brown Fox Of' },
  { mode: 'camel', label: 'camelCase', example: 'theQuickBrownFox' },
  { mode: 'pascal', label: 'PascalCase', example: 'TheQuickBrownFox' },
  { mode: 'snake', label: 'snake_case', example: 'the_quick_brown_fox' },
  { mode: 'constant', label: 'CONSTANT_CASE', example: 'THE_QUICK_BROWN_FOX' },
  { mode: 'kebab', label: 'kebab-case', example: 'the-quick-brown-fox' },
  { mode: 'dot', label: 'dot.case', example: 'the.quick.brown.fox' },
  { mode: 'alternating', label: 'aLtErNaTiNg', example: 'tHe QuIcK' },
  { mode: 'inverse', label: 'iNVERSE cASE', example: 'tHE qUICK' },
];

/**
 * Words for code-style cases: splits on spaces, punctuation and existing
 * camelCase/PascalCase boundaries ("parseHTTPRequest" → parse, HTTP, Request).
 */
export function splitWords(text: string): string[] {
  return (
    text
      .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

const cap = (w: string) => (w ? w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase() : w);

/** Sentence case: lower everything, then capitalize each sentence's first letter (and "I"). */
function sentenceCase(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, (_, pre: string, l: string) => pre + l.toLocaleUpperCase())
    .replace(/\bi\b/g, 'I');
}

/** Convert each line separately for code cases, so lists of names convert one per line. */
const perLine = (text: string, fn: (line: string) => string) => text.split('\n').map(fn).join('\n');

export function convertCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper':
      return text.toLocaleUpperCase();
    case 'lower':
      return text.toLocaleLowerCase();
    case 'sentence':
      return sentenceCase(text);
    case 'title':
      return titleCase(text, 'chicago');
    case 'capitalized':
      return text.replace(/\p{L}[\p{L}\p{M}'’]*/gu, cap);
    case 'camel':
      return perLine(text, (l) => splitWords(l).map((w, i) => (i === 0 ? w.toLocaleLowerCase() : cap(w))).join(''));
    case 'pascal':
      return perLine(text, (l) => splitWords(l).map(cap).join(''));
    case 'snake':
      return perLine(text, (l) => splitWords(l).map((w) => w.toLocaleLowerCase()).join('_'));
    case 'constant':
      return perLine(text, (l) => splitWords(l).map((w) => w.toLocaleUpperCase()).join('_'));
    case 'kebab':
      return perLine(text, (l) => splitWords(l).map((w) => w.toLocaleLowerCase()).join('-'));
    case 'dot':
      return perLine(text, (l) => splitWords(l).map((w) => w.toLocaleLowerCase()).join('.'));
    case 'alternating': {
      let i = 0;
      return text.replace(/\p{L}/gu, (c) => (i++ % 2 ? c.toLocaleUpperCase() : c.toLocaleLowerCase()));
    }
    case 'inverse':
      return [...text].map((c) => (c === c.toLocaleUpperCase() ? c.toLocaleLowerCase() : c.toLocaleUpperCase())).join('');
  }
}

// ─────────────────────────────────────────────────────────────
// Title case styles
// ─────────────────────────────────────────────────────────────

export type TitleStyle = 'ap' | 'chicago' | 'apa' | 'mla' | 'nyt';

export const TITLE_STYLES: { style: TitleStyle; label: string; rule: string }[] = [
  { style: 'chicago', label: 'Chicago', rule: 'Lowercase articles, prepositions (any length) and and/but/or/nor/for/so/yet.' },
  { style: 'ap', label: 'AP', rule: 'Lowercase articles, conjunctions and prepositions of three letters or fewer.' },
  { style: 'apa', label: 'APA', rule: 'Capitalize every word of four letters or more; lowercase shorter minor words.' },
  { style: 'mla', label: 'MLA', rule: 'Lowercase articles, prepositions and coordinating conjunctions.' },
  { style: 'nyt', label: 'New York Times', rule: 'Lowercase a short list: a, and, as, at, but, by, for, in, of, off, on, or, the, to, up, via.' },
];

const ARTICLES = ['a', 'an', 'the'];
const COORD = ['and', 'but', 'or', 'nor', 'for', 'so', 'yet'];
const PREPOSITIONS = [
  'as', 'at', 'by', 'en', 'for', 'in', 'of', 'off', 'on', 'onto', 'out', 'per', 'to', 'up', 'via', 'vs', 'with', 'from', 'into',
  'like', 'near', 'over', 'past', 'upon', 'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'before',
  'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'despite', 'down', 'during', 'except', 'inside', 'outside',
  'since', 'than', 'through', 'toward', 'towards', 'under', 'underneath', 'until', 'unto', 'within', 'without',
];

function isMinor(word: string, style: TitleStyle): boolean {
  const w = word.toLowerCase();
  switch (style) {
    case 'chicago':
    case 'mla':
      return ARTICLES.includes(w) || COORD.includes(w) || PREPOSITIONS.includes(w);
    case 'ap':
      return w.length <= 3 && (ARTICLES.includes(w) || COORD.includes(w) || PREPOSITIONS.includes(w));
    case 'apa':
      return w.length <= 3 && (ARTICLES.includes(w) || COORD.includes(w) || PREPOSITIONS.includes(w));
    case 'nyt':
      return ['a', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'off', 'on', 'or', 'the', 'to', 'up', 'via'].includes(w);
  }
}

/**
 * Title case in a style guide's rules. First and last words, and the word after
 * a colon or dash, are always capitalized; words already in mixed or all
 * caps (iPhone, NASA) and URLs are left alone. Hyphenated parts are each
 * capitalized (Chicago capitalizes both: "Self-Driving").
 */
export function titleCase(text: string, style: TitleStyle): string {
  return text
    .split('\n')
    .map((line) => {
      const tokens = line.split(/(\s+)/);
      const wordIdx = tokens.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i >= 0);
      const first = wordIdx[0];
      const last = wordIdx[wordIdx.length - 1];
      let afterBreak = false;
      return tokens
        .map((tok, i) => {
          if (!/\S/.test(tok)) return tok;
          const force = i === first || i === last || afterBreak;
          afterBreak = /[:—–?!]$/.test(tok) || tok === '-';
          if (/[./@]\S/.test(tok) || /\p{Lu}/u.test(tok.slice(1))) return tok; // URLs, emails, iPhone, NASA
          return tok
            .split('-')
            .map((part, j) => {
              const m = /^([^\p{L}\p{N}]*)([\p{L}\p{N}'’]*)(.*)$/u.exec(part)!;
              const [, pre, word, post] = m;
              if (!word) return part;
              const lower = word.toLowerCase();
              const keepLower = !force && j === 0 && isMinor(lower, style);
              return pre + (keepLower ? lower : cap(word)) + post;
            })
            .join('-');
        })
        .join('');
    })
    .join('\n');
}

// ─────────────────────────────────────────────────────────────
// Word counter
// ─────────────────────────────────────────────────────────────

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  letters: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** Minutes at 238 words per minute (average silent reading, Brysbaert 2019). */
  readingMinutes: number;
  /** Minutes at 150 words per minute. */
  speakingMinutes: number;
  averageWordLength: number;
  longestWord: string;
  /** Most frequent words (stop words excluded), with counts. */
  topWords: [string, number][];
}

const STOP = new Set(
  'a an the and or but nor for so yet of in on at to by with from as is are was were be been being it its this that these those i you he she we they me him her us them my your his our their not no do does did have has had will would can could should may might must shall than then there here what which who whom whose when where why how all any some such into about over after before up down out if just also very'.split(
    ' ',
  ),
);

/** Characters counted as users see them (emoji and accents as one), when the browser can segment. */
function graphemes(text: string): number {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<unknown> } }).Segmenter;
  if (!Seg) return [...text].length;
  let n = 0;
  for (const _ of new Seg(undefined, { granularity: 'grapheme' }).segment(text)) n++;
  return n;
}

export function textStats(text: string): TextStats {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-_]*/gu) ?? [];
  const characters = graphemes(text);
  const charactersNoSpaces = graphemes(text.replace(/\s/g, ''));
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  const sentences = text.trim() ? (text.match(/[^.!?…]*[\p{L}\p{N}][^.!?…]*(?:[.!?…]+|$)/gu) ?? []).length : 0;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text ? text.split('\n').length : 0;
  const counts = new Map<string, number>();
  let longestWord = '';
  for (const w of words) {
    if (w.length > longestWord.length) longestWord = w;
    const k = w.toLocaleLowerCase();
    if (STOP.has(k) || k.length < 3) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const topWords = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  return {
    words: words.length,
    characters,
    charactersNoSpaces,
    letters,
    sentences,
    paragraphs,
    lines,
    readingMinutes: words.length / 238,
    speakingMinutes: words.length / 150,
    averageWordLength: words.length ? words.reduce((n, w) => n + w.length, 0) / words.length : 0,
    longestWord,
    topWords,
  };
}

/** "45 sec", "3 min", "1 h 12 min". */
export function formatMinutes(min: number): string {
  if (min === 0) return '0 sec';
  if (min < 1) return `${Math.max(1, Math.round(min * 60))} sec`;
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${Math.round(min - h * 60)} min`;
}
