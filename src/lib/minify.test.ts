import { describe, expect, it } from 'vitest';
import { checkBrackets, formatCode, minifyCode, type FormatOptions } from './beautify';
import { minifyCss, minifyHtml } from './minify';

describe('CSS minifier', () => {
  it('removes comments and whitespace', () => {
    expect(minifyCss('a {\n  color: red; /* note */\n  margin: 0;\n}\n')).toBe('a{color:red;margin:0}');
    expect(minifyCss('.a > .b ,\n.c ~ .d + .e {\n  padding : 0 4px;\n}')).toBe('.a>.b,.c~.d+.e{padding :0 4px}');
    expect(minifyCss('')).toBe('');
  });

  it('keeps the spaces that matter', () => {
    // Descendant pseudo-class vs. attached pseudo-class
    expect(minifyCss('.a :hover { x: 1 }')).toBe('.a :hover{x:1}');
    // calc() needs spaces around + and -
    expect(minifyCss('a { width: calc(100% - 2 * 8px + 1px); }')).toBe('a{width:calc(100% - 2 * 8px + 1px)}');
    // "and (" must not become a function call
    expect(minifyCss('@media screen and (max-width: 600px) { a { b: c } }')).toBe('@media screen and (max-width:600px){a{b:c}}');
    expect(minifyCss('a { margin: 0 auto; font: 12px / 1.5 "Open  Sans", serif; }')).toBe('a{margin:0 auto;font:12px / 1.5 "Open  Sans",serif}');
  });

  it('keeps strings, escapes and /*! comments as written', () => {
    expect(minifyCss('a::before { content: "  ;}  /* not a comment */"; }')).toBe('a::before{content:"  ;}  /* not a comment */"}');
    expect(minifyCss("/*! licence */\n.x\\:y { content: '\\'' }")).toBe("/*! licence */.x\\:y{content:'\\''}");
    expect(minifyCss('.é::after { content: "😀" }')).toBe('.é::after{content:"😀"}');
  });

  it('handles large input', () => {
    const big = '.card { display: flex; gap: 8px; }\n'.repeat(20_000);
    expect(minifyCss(big)).toBe('.card{display:flex;gap:8px}'.repeat(20_000));
  });
});

describe('HTML minifier', () => {
  it('collapses whitespace and removes comments', () => {
    expect(minifyHtml('<!doctype html>\n<html>\n  <head>\n    <title>T</title>\n  </head>\n  <body>\n    <!-- note -->\n    <p>Hello   <b>world</b>\n    again</p>\n  </body>\n</html>\n')).toBe(
      '<!doctype html><html><head><title>T</title></head><body> <p>Hello <b>world</b> again</p> </body></html>',
    );
  });

  it('keeps a space between inline elements', () => {
    expect(minifyHtml('<a href="/">Home</a>\n<a href="/b">B</a>')).toBe('<a href="/">Home</a> <a href="/b">B</a>');
  });

  it('keeps pre, textarea, script and style exactly', () => {
    const src = '<div>\n  <pre>  a\n    b  </pre>\n  <textarea>\n x  y</textarea>\n  <script>if (a  <  b) { x = "  "; }</script>\n  <style>a  {  color : red }</style>\n</div>';
    expect(minifyHtml(src)).toBe('<div> <pre>  a\n    b  </pre> <textarea>\n x  y</textarea> <script>if (a  <  b) { x = "  "; }</script><style>a  {  color : red }</style> </div>');
  });

  it('tidies tags but not attribute values', () => {
    expect(minifyHtml('<img   src="a b.png"\n   alt = "two  spaces" >')).toBe('<img src="a b.png" alt="two  spaces">');
    expect(minifyHtml('<br />')).toBe('<br/>');
    expect(minifyHtml('<p title="a > b">x</p>')).toBe('<p title="a > b">x</p>');
  });

  it('keeps conditional comments, unicode and a bare <', () => {
    expect(minifyHtml('<!--[if IE]><p>old</p><![endif]-->\n<p>1 < 2 😀</p>')).toBe('<!--[if IE]><p>old</p><![endif]--> <p>1 < 2 😀</p>');
    expect(minifyHtml('')).toBe('');
  });

  it('drops whitespace inside tables', () => {
    expect(minifyHtml('<table>\n  <tr>\n    <td>1</td>\n    <td>2</td>\n  </tr>\n</table>')).toBe('<table><tr><td>1</td><td>2</td></tr></table>');
  });
});

describe('Minify mode', () => {
  it('minifies JSON keeping numbers exactly', async () => {
    expect(await minifyCode('{\n  "a": 1.0,\n  "b": [1, 2],\n  "id": 12345678901234567890,\n  "s": "é 😀"\n}', 'json')).toEqual({
      ok: true,
      text: '{"a":1.0,"b":[1,2],"id":12345678901234567890,"s":"é 😀"}',
    });
    expect(await minifyCode('{"a":', 'json')).toMatchObject({ ok: false });
  });

  it('reports CSS and HTML syntax errors instead of minifying', async () => {
    expect(await minifyCode('a { color: red', 'css')).toMatchObject({ ok: false });
    expect(await minifyCode('a { color: red }', 'css')).toEqual({ ok: true, text: 'a{color:red}' });
    expect(await minifyCode('<div><span></div>', 'html')).toMatchObject({ ok: false });
    expect(await minifyCode('<ul>\n  <li>a</li>\n</ul>', 'html')).toEqual({ ok: true, text: '<ul> <li>a</li> </ul>' });
  });

  it('refuses languages without a safe minifier', async () => {
    expect(await minifyCode('let a = 1', 'javascript')).toMatchObject({ ok: false });
  });
});

describe('formatter checks', () => {
  const o: FormatOptions = { indent: 2, printWidth: 80, singleQuote: false };

  it('finds unbalanced brackets in Java', () => {
    expect(checkBrackets('class A { void f() { if (x) { } }')).toMatchObject({ ok: false, message: '{ is never closed', line: 1, column: 9 });
    expect(checkBrackets('class A {\n  void f() {\n    g(;\n  }\n}')).toMatchObject({ ok: false, line: 4, column: 3, message: 'Unexpected }: the ( from line 3 is still open' });
    expect(checkBrackets('class A { }\n}')).toMatchObject({ ok: false, line: 2, message: 'Unexpected }: nothing is open here' });
    expect(checkBrackets('class A { String s = "a { b"; char c = \'}\'; /* { */ // {\n String t = """\n { \n"""; }')).toBeNull();
    expect(checkBrackets('class A { String s = "open; }')).toMatchObject({ ok: false, message: 'String is never closed (missing ")' });
    expect(checkBrackets('')).toBeNull();
  });

  it('SQL: dialects, keyword case and readable errors', async () => {
    const fmt = async (code: string, extra: Partial<FormatOptions>) => formatCode(code, 'sql', { ...o, ...extra });
    expect(await fmt('select a from t', { keywordCase: 'lower' })).toEqual({ ok: true, text: 'select\n  a\nfrom\n  t\n' });
    expect(await fmt('Select a From t', { keywordCase: 'preserve' })).toEqual({ ok: true, text: 'Select\n  a\nFrom\n  t\n' });
    expect(await fmt('select a::int from t', { sqlDialect: 'postgresql' })).toEqual({ ok: true, text: 'SELECT\n  a::INT\nFROM\n  t\n' });
    expect(await fmt('select top 5 [name] from users', { sqlDialect: 'tsql' })).toEqual({ ok: true, text: 'SELECT\n  TOP 5 [name]\nFROM\n  users\n' });
    const bad = await fmt('select a::int from t', {});
    expect(bad).toMatchObject({ ok: false, line: 1, column: 9 });
    if (!bad.ok) expect(bad.message).toContain('choose its dialect');
    const eof = await fmt('select a from (select b', {});
    expect(eof).toMatchObject({ ok: false, line: 1 });
    if (!eof.ok) expect(eof.message).toContain('ends too early');
  });

  it('XML: malformed input is an error with its line', async () => {
    expect(await formatCode('<a><b></a>', 'xml', o)).toMatchObject({ ok: false, line: 1, message: expect.stringContaining('doesn’t match') });
    expect(await formatCode('<a>\n<b>x</b></a>', 'xml', { ...o, indent: 4 })).toEqual({ ok: true, text: '<a>\n    <b>x</b>\n</a>\n' });
  });
});

describe('error positions', () => {
  it('turns Ruff byte ranges into lines, counting multi-byte characters', async () => {
    const { byteRangeError } = await import('./beautify');
    expect(byteRangeError(new Error('Expected an expression at byte range 22..23'), 'def f(x):\n  return x +\n')).toEqual({
      ok: false,
      message: 'Expected an expression',
      line: 2,
      column: 13,
    });
    // "é" is two bytes in UTF-8 but one column
    expect(byteRangeError(new Error('Bad at byte range 7..8'), 's = "é"\n)')).toMatchObject({ line: 1, column: 7 });
    expect(byteRangeError(new Error('Bad at byte range 9..10'), 's = "é"\n)')).toMatchObject({ line: 2, column: 1 });
  });
});

describe('never throws on arbitrary input', () => {
  it('minifiers and the XML parser survive random markup-like text', async () => {
    const { formatXml, minifyXml } = await import('./xml');
    const alphabet = ['<', '>', '/', '!', '?', '-', '[', ']', '"', "'", '=', '&', ';', ' ', '\n', 'a', 'b', '{', '}', '(', ')', ':', '*', '\\', '<!--', '-->', '<![CDATA[', ']]>', '<pre>', '</pre>', 'é', '😀'];
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 3000; i++) {
      let s = '';
      const len = rand(60);
      for (let k = 0; k < len; k++) s += alphabet[rand(alphabet.length)];
      expect(() => minifyCss(s), s).not.toThrow();
      expect(() => minifyHtml(s), s).not.toThrow();
      expect(() => formatXml(s, '  '), s).not.toThrow();
      expect(() => minifyXml(s), s).not.toThrow();
      expect(() => checkBrackets(s), s).not.toThrow();
    }
  });
});
