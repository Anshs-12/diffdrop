/** Unix file permissions: octal (755, 4755) and symbolic (rwxr-xr-x) forms. Pure functions. */

export type Who = 'owner' | 'group' | 'others';
export type Perm = 'read' | 'write' | 'execute';

export interface Mode {
  owner: { read: boolean; write: boolean; execute: boolean };
  group: { read: boolean; write: boolean; execute: boolean };
  others: { read: boolean; write: boolean; execute: boolean };
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

export const WHO: Who[] = ['owner', 'group', 'others'];
export const PERMS: Perm[] = ['read', 'write', 'execute'];

export type Parsed = { ok: true; mode: Mode } | { ok: false; error: string };

const triple = (n: number) => ({ read: (n & 4) !== 0, write: (n & 2) !== 0, execute: (n & 1) !== 0 });
const digit = (t: { read: boolean; write: boolean; execute: boolean }) => (t.read ? 4 : 0) + (t.write ? 2 : 0) + (t.execute ? 1 : 0);

/** The mode for a number 0–0o7777. */
export function modeFromNumber(n: number): Mode {
  return {
    owner: triple((n >> 6) & 7),
    group: triple((n >> 3) & 7),
    others: triple(n & 7),
    setuid: (n & 0o4000) !== 0,
    setgid: (n & 0o2000) !== 0,
    sticky: (n & 0o1000) !== 0,
  };
}

export function modeToNumber(m: Mode): number {
  const special = (m.setuid ? 4 : 0) + (m.setgid ? 2 : 0) + (m.sticky ? 1 : 0);
  return (special << 9) | (digit(m.owner) << 6) | (digit(m.group) << 3) | digit(m.others);
}

/** "644", "0755", "4755". Three digits when there are no special bits, four when there are. */
export function toOctal(m: Mode): string {
  const n = modeToNumber(m);
  return n > 0o777 ? n.toString(8).padStart(4, '0') : n.toString(8).padStart(3, '0');
}

/** Reads 1–4 octal digits ("7", "644", "0755", "4755"); a leading 0o is accepted too. */
export function parseOctal(input: string): Parsed {
  const s = input.trim().replace(/^0o/i, '');
  if (!s) return { ok: false, error: 'Enter an octal mode such as 644 or 0755.' };
  if (!/^[0-7]+$/.test(s)) {
    return { ok: false, error: /[89]/.test(s) ? 'Octal digits go from 0 to 7; 8 and 9 aren’t allowed.' : 'An octal mode uses only the digits 0–7, such as 644 or 4755.' };
  }
  if (s.length > 4) return { ok: false, error: 'An octal mode has at most four digits (for example 4755).' };
  return { ok: true, mode: modeFromNumber(parseInt(s, 8)) };
}

/** "rwxr-xr-x", with s/S in the execute spot for setuid/setgid and t/T for sticky. */
export function toSymbolic(m: Mode): string {
  const part = (t: Mode['owner'], special: boolean, on: string, off: string) =>
    (t.read ? 'r' : '-') + (t.write ? 'w' : '-') + (special ? (t.execute ? on : off) : t.execute ? 'x' : '-');
  return part(m.owner, m.setuid, 's', 'S') + part(m.group, m.setgid, 's', 'S') + part(m.others, m.sticky, 't', 'T');
}

/**
 * Reads a 9-character symbolic mode like "rwxr-xr-x" or "rwsr-xr-T". A leading
 * file-type letter as in `ls -l` output ("-rw-r--r--", "drwxr-xr-x") is ignored.
 */
export function parseSymbolic(input: string): Parsed {
  let s = input.trim();
  if (s.length === 10 && /^[-dlcbps]/.test(s)) s = s.slice(1);
  if (s.length === 11 && /^[-dlcbps].{9}[.+@]$/.test(s)) s = s.slice(1, 10);
  if (!s) return { ok: false, error: 'Enter a symbolic mode such as rwxr-xr-x.' };
  if (s.length !== 9) return { ok: false, error: 'A symbolic mode has nine characters: rwx for owner, group and others, with - for “not set”.' };
  const sets = [s.slice(0, 3), s.slice(3, 6), s.slice(6, 9)];
  const out: Mode = modeFromNumber(0);
  for (let i = 0; i < 3; i++) {
    const [r, w, x] = sets[i]!;
    const who = WHO[i]!;
    if (r !== 'r' && r !== '-') return { ok: false, error: `Character ${i * 3 + 1} must be r or -.` };
    if (w !== 'w' && w !== '-') return { ok: false, error: `Character ${i * 3 + 2} must be w or -.` };
    const specialOn = i === 2 ? 't' : 's';
    const specialOff = i === 2 ? 'T' : 'S';
    if (x !== 'x' && x !== '-' && x !== specialOn && x !== specialOff) {
      return { ok: false, error: `Character ${i * 3 + 3} must be x, -, ${specialOn} or ${specialOff}.` };
    }
    out[who] = { read: r === 'r', write: w === 'w', execute: x === 'x' || x === specialOn };
    const special = x === specialOn || x === specialOff;
    if (i === 0) out.setuid = special;
    if (i === 1) out.setgid = special;
    if (i === 2) out.sticky = special;
  }
  return { ok: true, mode: out };
}

/** "u=rwx,g=rx,o=rx"; special bits as u+s, g+s, o+t. Empty sets are written "u=". */
export function toChmodSymbolic(m: Mode): string {
  const letters = (t: Mode['owner']) => (t.read ? 'r' : '') + (t.write ? 'w' : '') + (t.execute ? 'x' : '');
  const u = letters(m.owner) + (m.setuid ? 's' : '');
  const g = letters(m.group) + (m.setgid ? 's' : '');
  const o = letters(m.others) + (m.sticky ? 't' : '');
  return `u=${u},g=${g},o=${o}`;
}

/** Shell-quotes a file name when it needs it. */
export function shellQuote(name: string): string {
  if (!name) return 'file';
  if (/^[\w./@%+=:,-]+$/.test(name)) return name;
  return `'${name.replace(/'/g, `'\\''`)}'`;
}

/** Plain-language lines describing what the mode allows. */
export function explain(m: Mode): string[] {
  const names: Record<Who, string> = { owner: 'The owner', group: 'Members of the file’s group', others: 'Everyone else' };
  const lines = WHO.map((who) => {
    const t = m[who];
    const can = [t.read && 'read', t.write && 'write', t.execute && 'execute'].filter(Boolean) as string[];
    if (!can.length) return `${names[who]} can’t read, write or execute it.`;
    const list = can.length === 1 ? can[0] : `${can.slice(0, -1).join(', ')} and ${can[can.length - 1]}`;
    return `${names[who]} can ${list} it.`;
  });
  lines.push('On a directory, read lists its names, write creates and deletes entries, and execute lets you enter it and reach files inside.');
  if (m.setuid) lines.push('Setuid: an executable runs with the owner’s user ID, whoever starts it.' + (m.owner.execute ? '' : ' (Shown as S: the owner has no execute bit, so it has no effect.)'));
  if (m.setgid) lines.push('Setgid: an executable runs with the file’s group; on a directory, new files inherit the directory’s group.' + (m.group.execute ? '' : ' (Shown as S: the group has no execute bit.)'));
  if (m.sticky) lines.push('Sticky: on a directory, only a file’s owner (or the directory owner, or root) can delete or rename it, as on /tmp.');
  if (m.others.write) lines.push('Warning: anyone on the system can change this file.');
  return lines;
}

export const PRESETS: { octal: string; label: string }[] = [
  { octal: '644', label: 'files' },
  { octal: '600', label: 'private file' },
  { octal: '755', label: 'scripts, dirs' },
  { octal: '700', label: 'private dir' },
  { octal: '775', label: 'shared dir' },
  { octal: '777', label: 'everyone' },
];
