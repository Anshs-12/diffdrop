import { describe, expect, it } from 'vitest';
import { checkXml, formatXml, minifyXml } from './xml';

const err = (src: string) => {
  const r = checkXml(src);
  if (r.ok) throw new Error(`expected an error for ${src}`);
  return r;
};

describe('XML well-formedness', () => {
  it('accepts well-formed documents', () => {
    for (const src of [
      '<a/>',
      '<?xml version="1.0" encoding="UTF-8"?>\n<a b="1" c=\'2\'><b>x &amp; y &#65; &#x41;</b></a>',
      '<!DOCTYPE note [<!ENTITY w "world">]>\n<note>hello &w;</note>',
      '<a><![CDATA[ <not> & a tag ]]><!-- note --><?pi data?></a>\n<!-- after -->',
      '﻿<ns:a xmlns:ns="urn:x"><ns:b/></ns:a>',
      '<名前 属性="値">テキスト 😀</名前>',
    ]) {
      expect(checkXml(src).ok, src).toBe(true);
    }
  });

  it('rejects mismatched and unclosed tags with their line', () => {
    expect(err('<a><b></a>')).toMatchObject({ message: 'Closing tag </a> doesn’t match <b> from line 1', line: 1, column: 7 });
    expect(err('<a>\n  <b>x</b>\n  <c>\n</a>')).toMatchObject({ line: 4, message: expect.stringContaining('<c> from line 3') });
    expect(err('<a>\n<b>')).toMatchObject({ message: '<b> is never closed (expected </b>)', line: 2, column: 1 });
    expect(err('<a></b>')).toMatchObject({ line: 1, column: 4 });
    expect(err('</a>').message).toContain('has no opening tag');
  });

  it('rejects the other common mistakes', () => {
    expect(err('<a>1 < 2</a>').message).toBe('A < in text must be written &lt;');
    expect(err('<a>Tom & Jerry</a>').message).toBe('A bare & must be written &amp;');
    expect(err('<a>&nbsp;</a>').message).toContain('Unknown entity &nbsp;');
    expect(err('<a b="1" b="2"/>').message).toBe('Attribute b appears twice in <a>');
    expect(err('<a b=1/>').message).toBe('The value of b must be in quotes');
    expect(err('<a b/>').message).toContain('needs a value');
    expect(err('<a b="1"c="2"/>').message).toContain('separated by a space');
    expect(err('<a/><b/>')).toMatchObject({ message: expect.stringContaining('Only one root element'), column: 5 });
    expect(err('<a/>junk').message).toBe('Text after the root element');
    expect(err('hello').message).toBe('XML must start with a tag, like <root>');
    expect(err('<a><!-- x -- y --></a>').message).toContain('"--"');
    expect(err('<a><!-- open</a>').message).toContain('never closed');
    expect(err('<a><![CDATA[ x </a>').message).toContain('CDATA');
    expect(err('<a/>\n<?xml version="1.0"?>').message).toContain('must come first');
    expect(err('<a b="<"/>').message).toContain('attribute value');
  });

  it('handles empty, large and deeply nested input without throwing', () => {
    expect(checkXml('').ok).toBe(false);
    expect(checkXml('   ').ok).toBe(false);
    const big = '<list>' + '<item id="1">value &amp; more</item>'.repeat(50_000) + '</list>';
    expect(checkXml(big).ok).toBe(true);
    const deep = '<a>'.repeat(20_000) + '</a>'.repeat(20_000);
    expect(checkXml(deep).ok).toBe(true);
    // Formatting something this deep may run out of stack; that's a message, not a crash
    const f = formatXml(deep, '  ');
    expect(typeof f.ok).toBe('boolean');
  });
});

describe('XML formatting', () => {
  it('indents element-only content and keeps text exactly', () => {
    expect(formatXml('<a><b>1</b></a>', '  ')).toEqual({ ok: true, text: '<a>\n  <b>1</b>\n</a>\n' });
    expect(formatXml('<?xml version="1.0"?><r><a>  x  </a><b\n   k="v"   j=\'w\'/><!-- c --></r>', '    ')).toEqual({
      ok: true,
      text: '<?xml version="1.0"?>\n<r>\n    <a>  x  </a>\n    <b k="v" j=\'w\'/>\n    <!-- c -->\n</r>\n',
    });
    expect(formatXml('<r><c><d/></c></r>', '\t')).toEqual({ ok: true, text: '<r>\n\t<c>\n\t\t<d/>\n\t</c>\n</r>\n' });
  });

  it('leaves mixed content, CDATA and xml:space="preserve" as written', () => {
    expect(formatXml('<r><p>Hello <b>world</b>  again</p></r>', '  ')).toEqual({ ok: true, text: '<r>\n  <p>Hello <b>world</b>  again</p>\n</r>\n' });
    expect(formatXml('<r><code xml:space="preserve">\n  <x/>\n    <y/>\n</code></r>', '  ')).toEqual({
      ok: true,
      text: '<r>\n  <code xml:space="preserve">\n  <x/>\n    <y/>\n</code>\n</r>\n',
    });
    expect(formatXml('<r><s><![CDATA[\n  keep  \n]]></s></r>', '  ')).toEqual({ ok: true, text: '<r>\n  <s><![CDATA[\n  keep  \n]]></s>\n</r>\n' });
  });

  it('reports errors instead of formatting', () => {
    expect(formatXml('<a><b></a>', '  ')).toMatchObject({ ok: false, line: 1 });
  });
});

describe('XML minifying', () => {
  it('removes whitespace between tags and comments, keeps text', () => {
    expect(minifyXml('<?xml version="1.0"?>\n<!-- top -->\n<r>\n  <a  k = "v" >  x  </a>\n  <!-- c -->\n  <b/>\n</r>\n')).toEqual({
      ok: true,
      text: '<?xml version="1.0"?><r><a k="v">  x  </a><b/></r>',
    });
  });

  it('keeps whitespace in mixed content and xml:space="preserve"', () => {
    expect(minifyXml('<r>\n  <p>Hello <b>world</b> again</p>\n</r>')).toEqual({ ok: true, text: '<r><p>Hello <b>world</b> again</p></r>' });
    expect(minifyXml('<r><t xml:space="preserve"> <a/> <b> </b> </t><u> <c/> </u></r>')).toEqual({
      ok: true,
      text: '<r><t xml:space="preserve"> <a/> <b> </b> </t><u><c/></u></r>',
    });
    // xml:space="default" turns preserving off again below it
    expect(minifyXml('<r xml:space="preserve"> <a xml:space="default"> <b/> </a> </r>')).toEqual({
      ok: true,
      text: '<r xml:space="preserve"> <a xml:space="default"><b/></a> </r>',
    });
  });

  it('keeps unicode and reports malformed input', () => {
    expect(minifyXml('<a>\n  <b>héllo 😀</b>\n</a>')).toEqual({ ok: true, text: '<a><b>héllo 😀</b></a>' });
    expect(minifyXml('<a><b></a>')).toMatchObject({ ok: false });
  });
});
