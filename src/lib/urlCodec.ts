/** Percent-encoding (URL encoding) and URL parsing. */

/**
 * component: encodeURIComponent, for one query value or path segment.
 * uri: encodeURI, for a whole URL (keeps : / ? # & =).
 * form: application/x-www-form-urlencoded, as HTML forms send (spaces as +).
 */
export type UrlMode = 'component' | 'uri' | 'form';

export function urlEncode(text: string, mode: UrlMode): string {
  if (mode === 'uri') return encodeURI(text);
  const encoded = encodeURIComponent(text);
  // Forms also escape ! ' ( ) * and write spaces as +
  return mode === 'form'
    ? encoded.replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, '+')
    : encoded;
}

export type UrlDecodeResult = { ok: true; text: string } | { ok: false; message: string; index: number };

/**
 * Decode percent-escapes. Unlike decodeURIComponent, says where a bad escape is
 * (a stray % or bytes that aren't UTF-8). In form mode, + means a space.
 */
export function urlDecode(text: string, mode: UrlMode): UrlDecodeResult {
  const input = mode === 'form' ? text.replace(/\+/g, ' ') : text;
  // Find the first malformed %XX before trying, for a precise position
  for (let i = input.indexOf('%'); i !== -1; i = input.indexOf('%', i + 1)) {
    if (!/^[0-9a-fA-F]{2}$/.test(input.slice(i + 1, i + 3))) {
      return { ok: false, message: `"%" must be followed by two hex digits (like %20); found ${JSON.stringify(input.slice(i, i + 3))}`, index: i };
    }
  }
  try {
    return { ok: true, text: mode === 'uri' ? decodeURI(input) : decodeURIComponent(input) };
  } catch {
    // Valid escapes, but the bytes aren't UTF-8: find the first bad run
    const re = /(%[0-9a-fA-F]{2})+/g;
    for (let m = re.exec(input); m; m = re.exec(input)) {
      try {
        decodeURIComponent(m[0]);
      } catch {
        return { ok: false, message: `${m[0]} isn't valid UTF-8 text`, index: m.index };
      }
    }
    return { ok: false, message: 'Invalid escape sequence', index: 0 };
  }
}

export interface ParsedUrl {
  href: string;
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  /** Query parameters, decoded, in order (repeats kept). */
  params: [string, string][];
}

/** Parts of an absolute URL, or null when the text isn't one. */
export function parseUrl(text: string): ParsedUrl | null {
  const t = text.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) return null;
  try {
    const u = new URL(t);
    return {
      href: u.href,
      protocol: u.protocol,
      username: decodeSafe(u.username),
      password: decodeSafe(u.password),
      hostname: u.hostname,
      port: u.port,
      pathname: decodeSafe(u.pathname),
      search: u.search,
      hash: decodeSafe(u.hash),
      origin: u.origin,
      params: [...u.searchParams.entries()],
    };
  } catch {
    return null;
  }
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
