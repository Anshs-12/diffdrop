import { describe, expect, it } from 'vitest';
import { explain, modeFromNumber, modeToNumber, parseOctal, parseSymbolic, shellQuote, toChmodSymbolic, toOctal, toSymbolic } from './chmod';

const sym = (octal: string) => {
  const r = parseOctal(octal);
  if (!r.ok) throw new Error(r.error);
  return toSymbolic(r.mode);
};
const oct = (s: string) => {
  const r = parseSymbolic(s);
  if (!r.ok) throw new Error(r.error);
  return toOctal(r.mode);
};

describe('octal to symbolic', () => {
  it.each([
    ['644', 'rw-r--r--'],
    ['755', 'rwxr-xr-x'],
    ['0755', 'rwxr-xr-x'],
    ['600', 'rw-------'],
    ['700', 'rwx------'],
    ['775', 'rwxrwxr-x'],
    ['777', 'rwxrwxrwx'],
    ['000', '---------'],
    ['4755', 'rwsr-xr-x'],
    ['2755', 'rwxr-sr-x'],
    ['1777', 'rwxrwxrwt'],
    ['4644', 'rwSr--r--'],
    ['2644', 'rw-r-Sr--'],
    ['1644', 'rw-r--r-T'],
    ['7777', 'rwsrwsrwt'],
    ['7000', '--S--S--T'],
    ['0o644', 'rw-r--r--'],
    ['7', '------rwx'],
  ])('%s → %s', (o, s) => expect(sym(o)).toBe(s));
});

describe('symbolic to octal', () => {
  it.each([
    ['rw-r--r--', '644'],
    ['rwxr-xr-x', '755'],
    ['rwsr-xr-x', '4755'],
    ['rwSr--r--', '4644'],
    ['rwxr-sr-x', '2755'],
    ['rwxrwxrwt', '1777'],
    ['rw-r--r-T', '1644'],
    ['rwsrwsrwt', '7777'],
    ['---------', '000'],
    ['-rw-r--r--', '644'],
    ['drwxr-xr-x', '755'],
    ['drwxrwxrwt.', '1777'],
  ])('%s → %s', (s, o) => expect(oct(s)).toBe(o));
});

it('round-trips every mode', () => {
  for (let n = 0; n <= 0o7777; n++) {
    const m = modeFromNumber(n);
    expect(modeToNumber(m)).toBe(n);
    const back = parseSymbolic(toSymbolic(m));
    expect(back.ok && modeToNumber(back.mode)).toBe(n);
    const o = parseOctal(toOctal(m));
    expect(o.ok && modeToNumber(o.mode)).toBe(n);
  }
});

describe('invalid input', () => {
  it.each(['', '   ', '8', '789', '12345', 'abc', '64a', '-1'])('octal %j is rejected', (s) => {
    const r = parseOctal(s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/\w/);
  });
  it.each(['', 'rwx', 'rwxrwxrwxx', 'xwrxwrxwr', 'rwtr-xr-x', 'rwxr-xr-s', 'rwxr-xr-é', '🙂🙂🙂', 'r'.repeat(10000)])('symbolic %j is rejected', (s) => {
    expect(parseSymbolic(s).ok).toBe(false);
  });
  it('mentions 8 and 9', () => {
    const r = parseOctal('789');
    expect(!r.ok && r.error).toMatch(/8 and 9/);
  });
});

it('writes chmod symbolic form', () => {
  expect(toChmodSymbolic(modeFromNumber(0o755))).toBe('u=rwx,g=rx,o=rx');
  expect(toChmodSymbolic(modeFromNumber(0o600))).toBe('u=rw,g=,o=');
  expect(toChmodSymbolic(modeFromNumber(0o4755))).toBe('u=rwxs,g=rx,o=rx');
  expect(toChmodSymbolic(modeFromNumber(0o3775))).toBe('u=rwx,g=rwxs,o=rxt');
});

it('quotes file names for the shell', () => {
  expect(shellQuote('deploy.sh')).toBe('deploy.sh');
  expect(shellQuote('')).toBe('file');
  expect(shellQuote('my file.txt')).toBe(`'my file.txt'`);
  expect(shellQuote(`it's`)).toBe(`'it'\\''s'`);
  expect(shellQuote('naïve.txt')).toBe(`'naïve.txt'`);
});

it('explains a mode', () => {
  const lines = explain(modeFromNumber(0o4754));
  expect(lines[0]).toBe('The owner can read, write and execute it.');
  expect(lines[1]).toBe('Members of the file’s group can read and execute it.');
  expect(lines[2]).toBe('Everyone else can read it.');
  expect(lines.some((l) => l.startsWith('Setuid'))).toBe(true);
  expect(explain(modeFromNumber(0o777)).some((l) => l.startsWith('Warning'))).toBe(true);
  expect(explain(modeFromNumber(0))[0]).toBe('The owner can’t read, write or execute it.');
});

it('the worked example matches the real output', async () => {
  const { default: content } = await import('../tools/content/chmod-calculator');
  const r = parseOctal(content.example!.input);
  if (!r.ok) throw new Error(r.error);
  expect([toSymbolic(r.mode), `chmod ${toOctal(r.mode)} deploy.sh`, `chmod ${toChmodSymbolic(r.mode)} deploy.sh`].join('\n')).toBe(content.example!.output);
});
