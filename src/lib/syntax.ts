/**
 * A small, dependency-free syntax highlighter. It is deliberately generic: it knows
 * comments, strings, numbers and keywords for the common C-like, hash-comment and
 * markup families, which covers most code people paste into a diff tool.
 * Lines are tokenized one at a time; only block-comment state carries over.
 */

export type TokenKind = 'comment' | 'string' | 'number' | 'keyword' | 'literal' | 'tag';

export interface Token {
  start: number;
  end: number;
  kind: TokenKind;
}

export type Lang = 'c' | 'hash' | 'markup' | 'none';

/** Carried between lines: whether we are inside a block comment. */
export type LineState = 0 | 1;

const KEYWORDS = new Set(
  (
    'abstract as async await break case catch class const continue def default defer del delete do elif else enum ' +
    'export extends final finally fn for foreach from func function go goto if impl implements import in instanceof ' +
    'interface is lambda let loop match mod module mut namespace new package pass private protected pub public raise ' +
    'readonly return select static struct super switch this throw throws trait try type typeof union unsafe use using ' +
    'var void where while with yield'
  ).split(' '),
);

const LITERALS = new Set('true false null undefined None True False nil NaN Infinity self'.split(' '));

const EXT_LANG: Record<string, Lang> = {
  js: 'c', jsx: 'c', ts: 'c', tsx: 'c', mjs: 'c', cjs: 'c', java: 'c', kt: 'c', c: 'c', h: 'c', cpp: 'c', cc: 'c',
  hpp: 'c', cs: 'c', go: 'c', rs: 'c', swift: 'c', scala: 'c', dart: 'c', php: 'c', css: 'c', scss: 'c', less: 'c',
  json: 'c', jsonc: 'c', sql: 'c',
  py: 'hash', rb: 'hash', sh: 'hash', bash: 'hash', zsh: 'hash', yml: 'hash', yaml: 'hash', toml: 'hash', r: 'hash',
  pl: 'hash', ex: 'hash', exs: 'hash', dockerfile: 'hash', makefile: 'hash', conf: 'hash', ini: 'hash', env: 'hash',
  html: 'markup', htm: 'markup', xml: 'markup', svg: 'markup', vue: 'markup', md: 'none', txt: 'none',
};

/** Pick a language family from a file name, falling back to sniffing the text. */
export function detectLang(text: string, fileName: string | null): Lang {
  if (fileName) {
    const lower = fileName.toLowerCase();
    const ext = lower.includes('.') ? lower.split('.').pop()! : lower;
    if (ext in EXT_LANG) return EXT_LANG[ext]!;
  }
  const sample = text.slice(0, 4000);
  if (/^\s*<(!doctype|html|\?xml|[a-z][\w-]*[\s>])/i.test(sample) && /<\/[a-z]/i.test(sample)) return 'markup';
  if (/^\s*(def |import |from \S+ import |class \w+.*:\s*$|#!.*\b(python|bash|sh)\b)/m.test(sample)) return 'hash';
  if (/[{};]\s*$|=>|\bfunction\b|\bconst\b|\breturn\b|#include|\bpublic\b|\bfunc\b|\bfn\b/m.test(sample)) return 'c';
  return 'none';
}

/** Tokenize one line. Returns its tokens and the state the next line starts in. */
export function tokenizeLine(line: string, lang: Lang, state: LineState): { tokens: Token[]; state: LineState } {
  const tokens: Token[] = [];
  if (lang === 'none') return { tokens, state: 0 };

  const n = line.length;
  let i = 0;

  const blockOpen = lang === 'markup' ? '<!--' : '/*';
  const blockClose = lang === 'markup' ? '-->' : '*/';

  if (state === 1) {
    const end = line.indexOf(blockClose);
    if (end === -1) {
      if (n > 0) tokens.push({ start: 0, end: n, kind: 'comment' });
      return { tokens, state: 1 };
    }
    i = end + blockClose.length;
    tokens.push({ start: 0, end: i, kind: 'comment' });
  }

  while (i < n) {
    const ch = line[i]!;

    // Block comments
    if ((lang === 'c' || lang === 'markup') && line.startsWith(blockOpen, i)) {
      const end = line.indexOf(blockClose, i + blockOpen.length);
      if (end === -1) {
        tokens.push({ start: i, end: n, kind: 'comment' });
        return { tokens, state: 1 };
      }
      tokens.push({ start: i, end: end + blockClose.length, kind: 'comment' });
      i = end + blockClose.length;
      continue;
    }

    // Line comments
    if ((lang === 'c' && line.startsWith('//', i)) || (lang === 'hash' && ch === '#')) {
      tokens.push({ start: i, end: n, kind: 'comment' });
      break;
    }

    // Markup tags: color the tag name
    if (lang === 'markup' && ch === '<') {
      const m = /^<\/?([A-Za-z][\w:-]*)/.exec(line.slice(i));
      if (m) {
        tokens.push({ start: i, end: i + m[0].length, kind: 'tag' });
        i += m[0].length;
        continue;
      }
    }

    // Strings (single line; backslash escapes)
    if (ch === '"' || ch === "'" || (ch === '`' && lang === 'c')) {
      // In markup, apostrophes in plain text are not strings
      if (lang === 'markup' && ch === "'") {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < n && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
      const end = Math.min(n, j + 1);
      tokens.push({ start: i, end, kind: 'string' });
      i = end;
      continue;
    }

    // Numbers (not part of an identifier)
    if (/[0-9]/.test(ch) && (i === 0 || !/[\w$]/.test(line[i - 1]!))) {
      const m = /^(0[xob][\da-f_]+|\d[\d_]*(\.\d+)?(e[+-]?\d+)?)[a-z]*/i.exec(line.slice(i));
      if (m) {
        tokens.push({ start: i, end: i + m[0].length, kind: 'number' });
        i += m[0].length;
        continue;
      }
    }

    // Identifiers → keywords / literals
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(line[j]!)) j++;
      const word = line.slice(i, j);
      if (lang !== 'markup') {
        if (KEYWORDS.has(word)) tokens.push({ start: i, end: j, kind: 'keyword' });
        else if (LITERALS.has(word)) tokens.push({ start: i, end: j, kind: 'literal' });
      }
      i = j;
      continue;
    }

    i++;
  }
  return { tokens, state: 0 };
}

/** Tokenize every line of a text, carrying block-comment state. */
export function tokenizeLines(lines: string[], lang: Lang): Token[][] {
  const out: Token[][] = [];
  let state: LineState = 0;
  for (const line of lines) {
    const r = tokenizeLine(line, lang, state);
    out.push(r.tokens);
    state = r.state;
  }
  return out;
}

/** The block-comment state each line starts in (cheap; used to tokenize lines independently). */
export function lineStartStates(lines: string[], lang: Lang): LineState[] {
  const states: LineState[] = [];
  let state: LineState = 0;
  for (const line of lines) {
    states.push(state);
    if (lang === 'c' || lang === 'markup') state = tokenizeLine(line, lang, state).state;
  }
  return states;
}
