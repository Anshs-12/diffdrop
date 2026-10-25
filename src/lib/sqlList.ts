/** Lists of values to a SQL IN (...) list or a separated line, and a separated line back to lines. */
import { splitLines } from './lines';

export type QuoteStyle = 'single' | 'double' | 'none';

export interface ItemOptions {
  trim: boolean;
  skipEmpty: boolean;
  dedupe: boolean;
}

export interface SqlInOptions {
  quote: QuoteStyle;
  /** Double the quote character inside values: O'Brien → 'O''Brien'. */
  escape: boolean;
  /** Wrap the list in IN ( ... ). */
  wrap: boolean;
  /** Values per line; 0 puts them all on one line. */
  perLine: number;
}

export const DEFAULT_ITEM_OPTIONS: ItemOptions = { trim: true, skipEmpty: true, dedupe: true };
export const DEFAULT_SQL_OPTIONS: SqlInOptions = { quote: 'single', escape: true, wrap: true, perLine: 0 };

/** Apply trim / skip-empty / dedupe (first occurrence kept) to a list of values. */
export function cleanItems(items: string[], o: ItemOptions): string[] {
  let out = o.trim ? items.map((s) => s.trim()) : items;
  if (o.skipEmpty) out = out.filter((s) => s !== '');
  if (o.dedupe) out = [...new Set(out)];
  return out;
}

/** One value per line. */
export const linesToItems = (text: string, o: ItemOptions) => cleanItems(splitLines(text), o);

const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
export const isNumeric = (s: string) => NUMERIC.test(s.trim());

/** Whether every value is a plain number (so quotes aren't needed). */
export const allNumeric = (items: string[]) => items.length > 0 && items.every(isNumeric);

export function quoteValue(v: string, quote: QuoteStyle, escape: boolean): string {
  if (quote === 'none') return v;
  const q = quote === 'single' ? "'" : '"';
  return q + (escape ? v.split(q).join(q + q) : v) + q;
}

/** Values as a SQL list: IN ('a', 'b'). Empty when there are no values (IN () isn't valid SQL). */
export function toSqlIn(items: string[], options: Partial<SqlInOptions> = {}): string {
  const o = { ...DEFAULT_SQL_OPTIONS, ...options };
  if (!items.length) return '';
  const quoted = items.map((v) => quoteValue(v, o.quote, o.escape));
  const per = Math.max(0, Math.floor(o.perLine || 0));
  if (!per) {
    const list = quoted.join(', ');
    return o.wrap ? `IN (${list})` : list;
  }
  const rows: string[] = [];
  for (let i = 0; i < quoted.length; i += per) rows.push(quoted.slice(i, i + per).join(', '));
  if (!o.wrap) return rows.join(',\n');
  return `IN (\n${rows.map((r) => `  ${r}`).join(',\n')}\n)`;
}

/** Turn the text "\t" and "\n" in a separator typed by the user into a tab and a line break. */
export const unescapeSeparator = (sep: string) => sep.replace(/\\t/g, '\t').replace(/\\n/g, '\n');

/** Values joined into one line. */
export const toSeparated = (items: string[], separator: string) => items.join(unescapeSeparator(separator));

/**
 * Split a separated line (or several) back into values. Values in matching
 * quotes may contain the separator; with `unquote`, the quotes are removed and
 * doubled quotes inside become single. A surrounding IN ( ... ) is ignored.
 */
export function splitSeparated(text: string, separator: string, o: ItemOptions & { unquote: boolean }): string[] {
  const typed = unescapeSeparator(separator);
  // With trimming on, ", " splits like "," so a line ending in a comma still works
  const sep = o.trim && typed.trim() ? typed.trim() : typed;
  let src = text;
  const inList = /^\s*(?:not\s+)?in\s*\(([\s\S]*)\)\s*;?\s*$/i.exec(src);
  if (inList) src = inList[1]!;
  const raw: string[] = [];
  let cur = '';
  let i = 0;
  const n = src.length;
  const flush = () => {
    raw.push(cur);
    cur = '';
  };
  while (i < n) {
    const c = src[i]!;
    if ((c === "'" || c === '"') && cur.trim() === '') {
      // A quoted value: read to the closing quote ('' or "" inside is an escaped quote)
      let j = i + 1;
      let inner = '';
      let closed = false;
      while (j < n) {
        if (src[j] === c) {
          if (src[j + 1] === c) {
            inner += c;
            j += 2;
            continue;
          }
          closed = true;
          break;
        }
        inner += src[j];
        j++;
      }
      if (closed) {
        cur = o.unquote ? inner : src.slice(i, j + 1);
        i = j + 1;
        // Skip anything up to the next separator or line break
        while (i < n && !(sep && src.startsWith(sep, i)) && src[i] !== '\n' && src[i] !== '\r') {
          if (src[i]!.trim()) cur += src[i];
          i++;
        }
        continue;
      }
    }
    if (sep && src.startsWith(sep, i)) {
      flush();
      i += sep.length;
      continue;
    }
    if (c === '\n' || c === '\r') {
      flush();
      i += c === '\r' && src[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    cur += c;
    i++;
  }
  flush();
  return cleanItems(raw, o);
}
