import { describe, expect, it } from 'vitest';
import { NAMED, decodeEntities, encodeEntities } from './htmlEntities';

const enc = (s: string, style: 'named' | 'numeric' | 'hex' = 'named', nonAscii = false) => encodeEntities(s, { style, nonAscii });
const dec = (s: string) => decodeEntities(s).text;

describe('named table', () => {
  it('has the HTML 4 set plus &apos;', () => {
    expect(NAMED.size).toBe(253);
    expect(NAMED.get('nbsp')).toBe(160);
    expect(NAMED.get('yuml')).toBe(255);
    expect(NAMED.get('Omega')).toBe(937);
    expect(NAMED.get('omega')).toBe(969);
    expect(NAMED.get('sigmaf')).toBe(962);
    expect(NAMED.get('euro')).toBe(8364);
    expect(NAMED.get('diams')).toBe(9830);
  });
});

describe('encodeEntities', () => {
  it('escapes the five special characters', () => {
    expect(enc(`<a href="x?a=1&b='2'">`)).toBe('&lt;a href=&quot;x?a=1&amp;b=&#39;2&#39;&quot;&gt;');
    expect(enc(`<&>"'`, 'numeric')).toBe('&#60;&#38;&#62;&#34;&#39;');
    expect(enc(`<&>"'`, 'hex')).toBe('&#x3C;&#x26;&#x3E;&#x22;&#x27;');
  });
  it('leaves other text alone unless asked', () => {
    expect(enc('café ✓ 😀')).toBe('café ✓ 😀');
    expect(enc('café ✓ 😀', 'named', true)).toBe('caf&eacute; &#10003; &#128512;');
    expect(enc('café 😀', 'hex', true)).toBe('caf&#xE9; &#x1F600;');
  });
  it('handles empty and large input', () => {
    expect(enc('')).toBe('');
    const big = '<b>&</b>'.repeat(50_000);
    expect(dec(enc(big))).toBe(big);
  });
});

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities', () => {
    expect(dec('&lt;p&gt;Fish &amp; chips &copy; 2026&hellip;&lt;/p&gt;')).toBe('<p>Fish & chips © 2026…</p>');
    expect(dec('&#60;&#x3C;&#X3c;&#128512;&#x1f600;')).toBe('<<<😀😀');
    expect(dec('&#39;&apos;&quot;')).toBe(`''"`);
  });
  it('accepts numeric entities without a semicolon, like browsers', () => {
    expect(dec('&#60b')).toBe('<b');
  });
  it('keeps unknown or unterminated names and reports them', () => {
    const r = decodeEntities('&foo; &amp &amp;');
    expect(r.text).toBe('&foo; &amp &');
    expect(r.unknown).toEqual(['&foo;']);
  });
  it('replaces invalid code points and maps the C1 range like browsers', () => {
    expect(dec('&#0;&#xD800;&#x110000;&#99999999999;')).toBe('�'.repeat(4));
    expect(dec('&#128;&#x92;')).toBe('€’');
  });
  it('never turns markup into anything but text', () => {
    expect(dec('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('<script>alert(1)</script>');
  });
  it('round-trips unicode', () => {
    const s = 'Grüße, Ζεύς & 日本語 <3 "quotes" 😀';
    for (const style of ['named', 'numeric', 'hex'] as const) expect(dec(enc(s, style, true))).toBe(s);
  });
});
