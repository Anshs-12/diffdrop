/** Running a JavaScript regular expression over text: matches, groups and replacement. */

export interface RegexGroup {
  /** Group number (1-based) and name, if named. */
  index: number;
  name: string | null;
  value: string | null;
  start: number | null;
  end: number | null;
}

export interface RegexMatch {
  start: number;
  end: number;
  value: string;
  groups: RegexGroup[];
}

export interface RegexRequest {
  pattern: string;
  flags: string;
  text: string;
  /** Replacement string ($1, $<name>, $&), or null to skip replacing. */
  replacement: string | null;
}

export type RegexResult =
  | { ok: true; matches: RegexMatch[]; truncated: boolean; replaced: string | null }
  | { ok: false; message: string };

/** Matches beyond this are counted no further, so huge texts stay responsive. */
export const MAX_MATCHES = 10_000;

/** Check a pattern and flags without running them (compiling can't hang). */
export function compileRegex(pattern: string, flags: string): { ok: true; re: RegExp } | { ok: false; message: string } {
  try {
    return { ok: true, re: new RegExp(pattern, flags) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg.replace(/^Invalid regular expression: (\/.*\/[a-z]*: )?/, '').replace(/^Invalid flags.*$/, `Invalid flags "${flags}"`) };
  }
}

export function runRegex({ pattern, flags, text, replacement }: RegexRequest): RegexResult {
  const compiled = compileRegex(pattern, flags.includes('d') ? flags : flags + 'd');
  if (!compiled.ok) return compiled;
  const re = compiled.re;
  const names = groupNames(re);
  const matches: RegexMatch[] = [];
  let truncated = false;

  const toMatch = (m: RegExpExecArray): RegexMatch => {
    const indices = (m as RegExpExecArray & { indices?: ([number, number] | undefined)[] }).indices;
    const groups: RegexGroup[] = [];
    for (let g = 1; g < m.length; g++) {
      const span = indices?.[g];
      groups.push({ index: g, name: names[g] ?? null, value: m[g] ?? null, start: span ? span[0] : null, end: span ? span[1] : null });
    }
    return { start: m.index, end: m.index + m[0].length, value: m[0], groups };
  };

  if (re.global || re.sticky) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (matches.length >= MAX_MATCHES) {
        truncated = true;
        break;
      }
      matches.push(toMatch(m));
      // An empty match would repeat forever; step past it (by code point with the u/v flag)
      if (m[0] === '') re.lastIndex += re.unicode || re.flags.includes('v') ? (text.codePointAt(re.lastIndex)! > 0xffff ? 2 : 1) : 1;
      if (!re.global) break;
    }
  } else {
    const m = re.exec(text);
    if (m) matches.push(toMatch(m));
  }

  let replaced: string | null = null;
  if (replacement !== null) {
    const r = new RegExp(pattern, flags);
    replaced = text.replace(r, replacement);
  }
  return { ok: true, matches, truncated, replaced };
}

/** Names of named capture groups, by group number. */
function groupNames(re: RegExp): Record<number, string> {
  // Walk the source counting capture groups, noting "(?<name>" ones
  const out: Record<number, string> = {};
  const src = re.source;
  let group = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '[') {
      // Skip a character class
      for (i++; i < src.length && src[i] !== ']'; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c !== '(') continue;
    if (src[i + 1] !== '?') {
      group++;
    } else if (src[i + 2] === '<' && src[i + 3] !== '=' && src[i + 3] !== '!') {
      group++;
      const end = src.indexOf('>', i);
      out[group] = src.slice(i + 3, end);
    }
  }
  return out;
}

/** Flags offered as toggles, with what they do. */
export const FLAGS: { flag: string; name: string; description: string }[] = [
  { flag: 'g', name: 'global', description: 'Find every match, not just the first' },
  { flag: 'i', name: 'ignore case', description: 'Letters match regardless of case' },
  { flag: 'm', name: 'multiline', description: '^ and $ match at each line start and end' },
  { flag: 's', name: 'dot all', description: '. also matches line breaks' },
  { flag: 'u', name: 'unicode', description: 'Full Unicode: \\u{...}, \\p{...}, code points' },
  { flag: 'y', name: 'sticky', description: 'Match only at the current position' },
];
