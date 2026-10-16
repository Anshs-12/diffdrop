import { describe, expect, it } from 'vitest';
import { checkJson, formatJson } from './json';
import { computeDiff } from './diffProcessor';

describe('formatJson', () => {
  it('pretty-prints with sorted keys, recursively, and a final newline', () => {
    expect(formatJson('{"b":1,"a":{"d":[{"z":1,"y":2}],"c":null}}')).toBe(
      ['{', '  "a": {', '    "c": null,', '    "d": [', '      {', '        "y": 2,', '        "z": 1', '      }', '    ]', '  },', '  "b": 1', '}', ''].join('\n'),
    );
  });

  it('keeps key order when asked', () => {
    expect(formatJson('{"b":1,"a":2}', false)).toBe('{\n  "b": 1,\n  "a": 2\n}\n');
  });

  it('keeps array order (order matters in arrays)', () => {
    expect(formatJson('[3,1,2]')).toBe('[\n  3,\n  1,\n  2\n]\n');
  });

  it('returns null for invalid or empty input', () => {
    expect(formatJson('{"a":')).toBeNull();
    expect(formatJson('   ')).toBeNull();
  });

  it('makes reordered, minified JSON compare as identical', () => {
    const a = formatJson('{"name":"x","tags":["a","b"],"n":1}')!;
    const b = formatJson('{\n  "n": 1,\n  "tags": ["a", "b"],\n  "name": "x"\n}')!;
    const opts = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };
    expect(computeDiff(a, b, opts).hunks).toHaveLength(0);
  });
});

describe('checkJson', () => {
  it('reports empty and valid input', () => {
    expect(checkJson('')).toEqual({ status: 'empty' });
    expect(checkJson('{"a": [1, 2]}')).toEqual({ status: 'valid' });
  });

  it('points at the line and column of a syntax error', () => {
    const r = checkJson('{\n  "a": 1,\n  "b": \n}');
    expect(r.status).toBe('invalid');
    if (r.status === 'invalid') {
      expect(r).toMatchObject({ line: 4, column: 1, message: 'Unexpected "}"' });
    }
  });

  it('agrees with JSON.parse on what is valid (random)', () => {
    const pieces = ['{', '}', '[', ']', ',', ':', '"a"', '"b\\n"', '1', '-2.5e3', 'true', 'null', ' ', '\n', 'x', '"', '01'];
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let k = 0; k < 20000; k++) {
      const text = Array.from({ length: 1 + Math.floor(rand() * 8) }, () => pieces[Math.floor(rand() * pieces.length)]).join('');
      let valid = true;
      try {
        JSON.parse(text);
      } catch {
        valid = false;
      }
      const r = checkJson(text);
      if (!text.trim()) continue;
      expect(r.status === 'valid', text).toBe(valid);
      if (r.status === 'invalid') expect(r.line, text).not.toBeNull();
    }
  });

  it('describes common mistakes', () => {
    expect(checkJson('{"a": 1,}')).toMatchObject({ status: 'invalid', message: 'Trailing comma before "}"', column: 9 });
    expect(checkJson('[1, 2,\n]')).toMatchObject({ status: 'invalid', message: 'Trailing comma before "]"', line: 2, column: 1 });
    expect(checkJson("{'a': 1}")).toMatchObject({ status: 'invalid', message: 'Keys need "double quotes", not single quotes', line: 1, column: 2 });
    expect(checkJson('{"a":tru}')).toMatchObject({ message: 'Invalid value "tru" (did you mean true?)', line: 1, column: 6 });
    expect(checkJson('[True]')).toMatchObject({ message: '"True" should be lowercase: true', column: 2 });
    expect(checkJson('{"a": undefined}')).toMatchObject({ message: "undefined isn't allowed in JSON", column: 7 });
    expect(checkJson('\uFEFF{}')).toMatchObject({ message: expect.stringContaining('byte order mark'), line: 1, column: 1 });
    expect(checkJson('[1,\u00A02]')).toMatchObject({ message: 'Unexpected invisible character U+00A0 (no-break space)', column: 4 });
    expect(checkJson('{"a": 1 // note\n}')).toMatchObject({ message: "Comments aren't allowed in JSON" });
    expect(checkJson("['a']")).toMatchObject({ message: 'JSON needs "double quotes", not single quotes', column: 2 });
    expect(checkJson('{"a": 1')).toMatchObject({ status: 'invalid', message: 'Unexpected end of input' });
  });
});
