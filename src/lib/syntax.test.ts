import { describe, expect, it } from 'vitest';
import { detectLang, lineStartStates, tokenizeLine, tokenizeLines } from './syntax';

const kinds = (line: string, lang: Parameters<typeof tokenizeLine>[1]) =>
  tokenizeLine(line, lang, 0).tokens.map((t) => `${t.kind}:${line.slice(t.start, t.end)}`);

describe('syntax', () => {
  it('detects languages from file names and content', () => {
    expect(detectLang('', 'app.tsx')).toBe('c');
    expect(detectLang('', 'config.yml')).toBe('hash');
    expect(detectLang('', 'index.html')).toBe('markup');
    expect(detectLang('import os\ndef main():\n  pass', null)).toBe('hash');
    expect(detectLang('const a = 1;', null)).toBe('c');
    expect(detectLang('Dear Sam,\nthanks for the call.', null)).toBe('none');
  });

  it('tokenizes keywords, strings, numbers and comments', () => {
    expect(kinds('const x = "a // b"; // note', 'c')).toEqual([
      'keyword:const',
      'string:"a // b"',
      'comment:// note',
    ]);
    expect(kinds('let n = 0x1F + 3.5e2; return true;', 'c')).toEqual([
      'keyword:let',
      'number:0x1F',
      'number:3.5e2',
      'keyword:return',
      'literal:true',
    ]);
    expect(kinds("x = 'a#b'  # comment", 'hash')).toEqual(["string:'a#b'", 'comment:# comment']);
  });

  it('does not color digits inside identifiers', () => {
    expect(kinds('item2 = v8', 'c')).toEqual([]);
  });

  it('carries block comments across lines', () => {
    const lines = ['a /* start', 'middle', 'end */ const b = 1;'];
    const tokens = tokenizeLines(lines, 'c');
    expect(tokens[1]).toEqual([{ start: 0, end: 6, kind: 'comment' }]);
    expect(tokens[2]![0]).toEqual({ start: 0, end: 6, kind: 'comment' });
    expect(lineStartStates(lines, 'c')).toEqual([0, 1, 1]);
  });

  it('colors markup tags and ignores apostrophes in text', () => {
    expect(kinds("<div class=\"x\">it's</div>", 'markup')).toEqual(['tag:<div', 'string:"x"', 'tag:</div']);
  });

  it('produces no tokens for plain text', () => {
    expect(tokenizeLine('if this then that', 'none', 0).tokens).toEqual([]);
  });
});
