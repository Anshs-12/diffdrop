/** Text to URL slugs: accents transliterated, symbols and emoji dropped, words joined by a separator. */

export interface SlugOptions {
  separator: '-' | '_';
  lowercase: boolean;
  /** 0 for no limit. Cut at a word boundary when possible. */
  maxLength: number;
  removeStopWords: boolean;
}

export const DEFAULT_SLUG: SlugOptions = {
  separator: '-',
  lowercase: true,
  maxLength: 0,
  removeStopWords: false,
};

// Letters NFKD doesn't split into a base letter plus accents
const EXTRA: Record<string, string> = {
  ß: 'ss',
  ẞ: 'SS',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ø: 'o',
  Ø: 'O',
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  ð: 'd',
  Ð: 'D',
  þ: 'th',
  Þ: 'TH',
  ħ: 'h',
  Ħ: 'H',
  ı: 'i',
  ŀ: 'l',
  Ŀ: 'L',
  ŋ: 'ng',
  Ŋ: 'NG',
  ĸ: 'k',
  ſ: 's',
  '&': ' and ',
  '’': '',
  "'": '',
};

/** Short English words commonly left out of slugs. */
export const STOP_WORDS = new Set(
  'a an and are as at be but by for from how in into is it of on or so than that the this to was what when where which who why will with'.split(' '),
);

export function transliterate(text: string): string {
  let s = '';
  for (const ch of text) s += EXTRA[ch] ?? ch;
  // Split accented letters into letter + combining mark, then drop the marks
  return s.normalize('NFKD').replace(/\p{M}+/gu, '');
}

export function slugify(text: string, o: SlugOptions = DEFAULT_SLUG): string {
  let words = transliterate(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (o.removeStopWords) {
    const kept = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    if (kept.length) words = kept; // a title made only of stop words keeps them
  }
  if (o.lowercase) words = words.map((w) => w.toLowerCase());
  let slug = words.join(o.separator);
  if (o.maxLength > 0 && slug.length > o.maxLength) {
    const cut = slug.slice(0, o.maxLength + 1);
    const at = cut.lastIndexOf(o.separator);
    // Cut at the last whole word; a single very long word is cut mid-word
    slug = at > 0 ? cut.slice(0, at) : slug.slice(0, o.maxLength);
  }
  return slug;
}

/** One slug per line; blank lines stay blank so lines keep lining up. */
export function slugifyLines(text: string, o: SlugOptions): string {
  if (!text) return '';
  return text
    .split(/\r?\n/)
    .map((l) => slugify(l, o))
    .join('\n');
}
