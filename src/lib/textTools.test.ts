import { describe, expect, it } from 'vitest';
import { convertCase, formatMinutes, splitWords, textStats, titleCase } from './textCase';
import { crackTime, entropyBits, generatePassword, lorem, passwordAlphabets, randomInt } from './generate';
import { contrast, formats, gradientCss, harmonies, parseColor, rgbToHsl, tintsAndShades, toHex, wcagLevel } from './color';
import { detectLang, formatCode, minifyCss, type FormatOptions } from './beautify';
import { markdownToHtml } from './markdown';
import { makeQr, QR_TEMPLATES, qrSvg } from './qr';

describe('case converter', () => {
  const s = 'the quick brown FOX jumps';
  it('converts between the common cases', () => {
    expect(convertCase(s, 'upper')).toBe('THE QUICK BROWN FOX JUMPS');
    expect(convertCase(s, 'lower')).toBe('the quick brown fox jumps');
    expect(convertCase('hello world. how are you? i am fine', 'sentence')).toBe('Hello world. How are you? I am fine');
    expect(convertCase(s, 'capitalized')).toBe('The Quick Brown Fox Jumps');
    expect(convertCase(s, 'camel')).toBe('theQuickBrownFoxJumps');
    expect(convertCase(s, 'pascal')).toBe('TheQuickBrownFoxJumps');
    expect(convertCase(s, 'snake')).toBe('the_quick_brown_fox_jumps');
    expect(convertCase(s, 'constant')).toBe('THE_QUICK_BROWN_FOX_JUMPS');
    expect(convertCase(s, 'kebab')).toBe('the-quick-brown-fox-jumps');
    expect(convertCase(s, 'dot')).toBe('the.quick.brown.fox.jumps');
    expect(convertCase('abcd', 'alternating')).toBe('aBcD');
    expect(convertCase('Hello', 'inverse')).toBe('hELLO');
  });

  it('splits existing code identifiers into words', () => {
    expect(splitWords('parseHTTPRequest')).toEqual(['parse', 'HTTP', 'Request']);
    expect(splitWords('user_id-list.v2')).toEqual(['user', 'id', 'list', 'v2']);
    expect(convertCase('parseHTTPRequest\nuser_id', 'snake')).toBe('parse_http_request\nuser_id');
    expect(convertCase('crème brûlée', 'pascal')).toBe('CrèmeBrûlée');
  });
});

describe('title case', () => {
  it('follows each style guide', () => {
    const t = 'a tale of two cities and the war between them';
    expect(titleCase(t, 'chicago')).toBe('A Tale of Two Cities and the War between Them');
    expect(titleCase(t, 'ap')).toBe('A Tale of Two Cities and the War Between Them');
    expect(titleCase(t, 'apa')).toBe('A Tale of Two Cities and the War Between Them');
    expect(titleCase('what to do with your life', 'nyt')).toBe('What to Do With Your Life');
  });

  it('always capitalizes the first and last word and after a colon', () => {
    expect(titleCase('the end: a story to think about', 'chicago')).toBe('The End: A Story to Think About');
    expect(titleCase('where are you from', 'chicago')).toBe('Where Are You From');
  });

  it('leaves acronyms, brand names and URLs alone and handles hyphens', () => {
    expect(titleCase('using NASA data on an iPhone via example.com', 'ap')).toBe('Using NASA Data on an iPhone via example.com');
    expect(titleCase('self-driving cars in the long-term', 'chicago')).toBe('Self-Driving Cars in the Long-Term');
    expect(titleCase('"quoted words" and (parens)', 'chicago')).toBe('"Quoted Words" and (Parens)');
  });
});

describe('word counter', () => {
  it('counts words, characters, sentences and paragraphs', () => {
    const t = 'Hello world! This is a test.\n\nIt’s a second paragraph, with emoji 😀 and café.';
    const s = textStats(t);
    expect(s.words).toBe(14);
    expect(s.sentences).toBe(3);
    expect(s.paragraphs).toBe(2);
    expect(s.lines).toBe(3);
    expect(s.characters).toBe([...t].length);
    expect(s.charactersNoSpaces).toBe([...t.replace(/\s/g, '')].length);
    expect(s.longestWord).toBe('paragraph');
  });

  it('handles empty text and finds frequent words without stop words', () => {
    expect(textStats('')).toMatchObject({ words: 0, characters: 0, sentences: 0, paragraphs: 0, lines: 0 });
    expect(textStats('apple banana apple the the the cherry apple').topWords[0]).toEqual(['apple', 3]);
    expect(formatMinutes(0.25)).toBe('15 sec');
    expect(formatMinutes(3.4)).toBe('3 min');
    expect(formatMinutes(75)).toBe('1 h 15 min');
  });
});

describe('password generator', () => {
  const o = { length: 20, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: false };
  it('uses every chosen set and the requested length', () => {
    for (let k = 0; k < 200; k++) {
      const p = generatePassword(o);
      expect(p).toHaveLength(20);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^a-zA-Z0-9]/);
    }
    expect(generatePassword({ ...o, lower: false, upper: false, symbols: false, length: 8 })).toMatch(/^\d{8}$/);
    expect(generatePassword({ ...o, lower: false, upper: false, digits: false, symbols: false })).toBe('');
  });

  it('leaves out ambiguous characters when asked', () => {
    for (let k = 0; k < 100; k++) expect(generatePassword({ ...o, excludeAmbiguous: true, length: 64 })).not.toMatch(/[Il1O0o]/);
    expect(passwordAlphabets({ ...o, excludeAmbiguous: true }).join('')).not.toMatch(/[Il1O0o]/);
  });

  it('draws uniformly (no modulo bias)', () => {
    const counts = new Array(6).fill(0);
    for (let k = 0; k < 60_000; k++) counts[randomInt(6)]++;
    for (const c of counts) expect(Math.abs(c - 10_000)).toBeLessThan(500);
  });

  it('estimates strength', () => {
    expect(entropyBits(16, 94)).toBeCloseTo(104.9, 1);
    expect(crackTime(entropyBits(4, 10))).toBe('instantly');
    expect(crackTime(80)).toMatch(/million years/);
  });
});

describe('lorem ipsum', () => {
  it('starts classically and gives the requested amount', () => {
    expect(lorem('paragraphs', 3, { classic: true, seed: 1 })[0]).toMatch(/^Lorem ipsum dolor sit amet, consectetur adipiscing elit, /);
    expect(lorem('paragraphs', 3, { seed: 1 })).toHaveLength(3);
    expect(lorem('words', 7, { classic: true, seed: 1 })[0]).toBe('Lorem ipsum dolor sit amet consectetur adipiscing');
    expect(lorem('sentences', 5, { seed: 2 })).toHaveLength(5);
    expect(lorem('sentences', 5, { seed: 2 })).toEqual(lorem('sentences', 5, { seed: 2 }));
    for (const s of lorem('sentences', 50, { seed: 3 })) expect(s).toMatch(/^[A-Z][a-z ,]+\.$/);
  });
});

describe('colors', () => {
  it('parses every common CSS syntax to the same color', () => {
    const coral = { r: 255, g: 127, b: 80, a: 1 };
    for (const s of ['#ff7f50', 'FF7F50', 'coral', 'rgb(255, 127, 80)', 'rgb(255 127 80)', 'rgba(255,127,80,1)', 'hsl(16 100% 65.7%)', 'hsl(16, 100%, 65.7%)']) {
      expect(parseColor(s), s).toEqual(coral);
    }
    expect(parseColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 0.502 });
    expect(parseColor('rgb(0 0 255 / 50%)')).toEqual({ r: 0, g: 0, b: 255, a: 0.5 });
    expect(parseColor('hwb(0 0% 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('oklch(62.8% 0.2577 29.23)')).toMatchObject({ r: 255, g: 0, b: 0 });
    expect(parseColor('not a color')).toBeNull();
    expect(parseColor('rgb(1,2)')).toBeNull();
  });

  it('formats a color in every notation and round-trips HSL', () => {
    const f = Object.fromEntries(formats(parseColor('#336699')!).map((x) => [x.label, x.value]));
    expect(f.HEX).toBe('#336699');
    expect(f.RGB).toBe('rgb(51 102 153)');
    expect(f.HSL).toBe('hsl(210 50% 40%)');
    expect(f.CMYK).toBe('67%, 33%, 0%, 40%');
    expect(f.OKLCH).toMatch(/^oklch\(/);
    for (let k = 0; k < 500; k++) {
      const c = { r: (k * 37) % 256, g: (k * 91) % 256, b: (k * 53) % 256, a: 1 };
      const { h, s, l } = rgbToHsl(c);
      expect(toHex(parseColor(`hsl(${h} ${s}% ${l}%)`)!)).toBe(toHex(c));
    }
  });

  it('computes WCAG contrast and palettes', () => {
    const white = parseColor('white')!;
    const black = parseColor('black')!;
    expect(contrast(white, black)).toBeCloseTo(21, 5);
    expect(contrast(parseColor('#777')!, white)).toBeCloseTo(4.48, 2);
    expect(wcagLevel(4.48)).toBe('AA large');
    expect(wcagLevel(7.1)).toBe('AAA');
    const scale = tintsAndShades(parseColor('#336699')!);
    expect(scale).toHaveLength(11);
    expect(toHex(scale[5]!)).toBe('#336699');
    expect(harmonies(parseColor('red')!)[0]!.colors.map(toHex)).toEqual(['#ff0000', '#00ffff']);
  });

  it('writes gradient CSS', () => {
    const stops = [
      { color: '#ff0000', at: 100 },
      { color: '#0000ff', at: 0 },
    ];
    expect(gradientCss('linear', 90, stops)).toBe('linear-gradient(90deg, #0000ff 0%, #ff0000 100%)');
    expect(gradientCss('radial', 0, stops)).toBe('radial-gradient(circle, #0000ff 0%, #ff0000 100%)');
    expect(gradientCss('conic', 45, stops)).toBe('conic-gradient(from 45deg, #0000ff 0%, #ff0000 100%)');
  });
});

describe('code beautifier', () => {
  const o: FormatOptions = { indent: 2, printWidth: 80, singleQuote: false };
  const fmt = async (code: string, lang: Parameters<typeof formatCode>[1], opts: FormatOptions = o) => {
    const r = await formatCode(code, lang, opts);
    if (!r.ok) throw new Error(r.message);
    return r.text;
  };

  it('formats every supported language', async () => {
    expect(await fmt('function f(a,b){return a+b}', 'javascript')).toBe('function f(a, b) {\n  return a + b;\n}\n');
    expect(await fmt("const x:number=1;interface A{b:string}", 'typescript')).toBe('const x: number = 1;\ninterface A {\n  b: string;\n}\n');
    expect(await fmt('{"a":1,"b":[1,2]}', 'json')).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}\n');
    expect(await fmt('a{color:red;margin:0}', 'css')).toBe('a {\n  color: red;\n  margin: 0;\n}\n');
    expect(await fmt('$c:red;a{b{color:$c}}', 'css')).toBe('$c: red;\na {\n  b {\n    color: $c;\n  }\n}\n');
    expect(await fmt('<div><p>Hi</p></div>', 'html')).toBe('<div><p>Hi</p></div>\n');
    expect(await fmt('# T\n*  a\n*  b', 'markdown')).toBe('# T\n\n- a\n- b\n');
    expect(await fmt('a:   1\nb:\n    - x', 'yaml')).toBe('a: 1\nb:\n  - x\n');
    expect(await fmt('select a,b from t where x=1', 'sql')).toBe('SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1\n');
    expect(await fmt('<a><b>1</b></a>', 'xml')).toBe('<a>\n  <b>1</b>\n</a>\n');
  });

  it('honours indentation, quotes and reports syntax errors with a position', async () => {
    expect(await fmt('if(x){y("a")}', 'javascript', { indent: 'tab', printWidth: 80, singleQuote: true })).toBe("if (x) {\n\ty('a');\n}\n");
    const bad = await formatCode('function (', 'javascript', o);
    expect(bad).toMatchObject({ ok: false, line: 1 });
  });

  it('minifies CSS and detects the language', () => {
    expect(minifyCss('a {\n  color: red; /* note */\n  margin: 0;\n}\n')).toBe('a{color:red;margin:0}');
    const cases: [string, string][] = [
      ['<!doctype html><p>x', 'html'],
      ['<?xml version="1.0"?><a/>', 'xml'],
      ['.btn { color: red; }', 'css'],
      ['$x: 1px;\n.a { &:hover { color: red } }', 'css'],
      ['{"a": 1}', 'json'],
      ['SELECT * FROM users', 'sql'],
      ['def greet(name):\n    return f"Hi {name}"', 'python'],
      ['import os\nprint(os.getcwd())', 'python'],
      ['public class Main { public static void main(String[] args) { System.out.println(1); } }', 'java'],
      ['using System;\nclass P { static void Main() { Console.WriteLine(1); } }', 'csharp'],
      ['#include <iostream>\nint main() { std::cout << 1; }', 'cpp'],
      ['#include <stdio.h>\nint main(void) { printf("1"); }', 'c'],
      ['package main\nimport "fmt"\nfunc main() { fmt.Println(1) }', 'go'],
      ['<?php echo "hi";', 'php'],
      ['local x = 1\nfunction f()\n  return x\nend', 'lua'],
      ['#!/bin/bash\necho hi', 'shell'],
      ['name: app\nversion: 2', 'yaml'],
      ['# Title\n\n- one\n- two', 'markdown'],
      ['const a: number = 1', 'typescript'],
      ['const a = () => 1', 'javascript'],
    ];
    for (const [code, lang] of cases) expect(detectLang(code), code).toBe(lang);
  });
});

describe('markdown', () => {
  it('renders GitHub-flavored Markdown', () => {
    const html = markdownToHtml('# Title\n\n- [x] done\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n`code` and **bold**');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<table>');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<strong>bold</strong>');
  });
});

describe('qr codes', () => {
  it('encodes text and grows with the data', () => {
    const small = makeQr('hi', 'M');
    const big = makeQr('x'.repeat(500), 'M');
    expect(small.ok && small.qr.size).toBe(21);
    expect(big.ok && big.qr.size).toBeGreaterThan(50);
    expect(makeQr('x'.repeat(5000), 'H')).toMatchObject({ ok: false });
    // The three finder patterns are dark at their corners
    if (small.ok) for (const [r, c] of [[0, 0], [0, 20], [20, 0]] as const) expect(small.qr.isDark(r, c)).toBe(true);
  });

  it('encodes non-ASCII text as UTF-8 and writes SVG', () => {
    const r = makeQr('café 😀', 'L');
    expect(r.ok).toBe(true);
    if (r.ok) expect(qrSvg(r.qr, { margin: 4, fg: '#000', bg: '#fff' })).toMatch(/^<svg[^>]+viewBox="0 0 29 29"/);
  });

  it('builds Wi-Fi, email and phone payloads', () => {
    expect(QR_TEMPLATES.wifi('My;Net', 'p@ss:1', 'WPA', false)).toBe('WIFI:T:WPA;S:My\\;Net;P:p@ss\\:1;;');
    expect(QR_TEMPLATES.wifi('Open', '', 'nopass', true)).toBe('WIFI:T:nopass;S:Open;H:true;;');
    expect(QR_TEMPLATES.email('a@b.co', 'Hi there', '')).toBe('mailto:a@b.co?subject=Hi%20there');
    expect(QR_TEMPLATES.phone('+1 (555) 010-9999')).toBe('tel:+15550109999');
  });
});
