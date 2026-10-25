import { describe, expect, it } from 'vitest';
import { DEFAULT_PX_REM, convertText, convertValue, formatNumber, type PxRemOptions } from './pxRem';

const o = (p: Partial<PxRemOptions> = {}): PxRemOptions => ({ ...DEFAULT_PX_REM, ...p });

describe('formatNumber', () => {
  it('rounds and drops trailing zeros', () => {
    expect(formatNumber(0.875, 4)).toBe('0.875');
    expect(formatNumber(1 / 3, 4)).toBe('0.3333');
    expect(formatNumber(1 / 3, null)).toBe('0.3333333333333333');
    expect(formatNumber(2, 4)).toBe('2');
    expect(formatNumber(-0.00001, 2)).toBe('0');
    expect(formatNumber(1e-7, null)).toBe('0.0000001');
  });
});

describe('convertValue', () => {
  it('converts px to rem and back', () => {
    expect(convertValue('24', o())).toEqual({ ok: true, value: '1.5rem', from: '24px' });
    expect(convertValue(' 14px ', o())).toMatchObject({ value: '0.875rem' });
    expect(convertValue('1.5rem', o({ direction: 'rem-px' }))).toMatchObject({ value: '24px' });
    expect(convertValue('.5', o({ direction: 'rem-px' }))).toMatchObject({ value: '8px' });
    expect(convertValue('-8px;', o())).toMatchObject({ value: '-0.5rem' });
  });
  it('uses the root size and precision', () => {
    expect(convertValue('15', o({ base: 10 }))).toMatchObject({ value: '1.5rem' });
    expect(convertValue('13', o({ precision: 2 }))).toMatchObject({ value: '0.81rem' });
    expect(convertValue('13', o({ precision: null }))).toMatchObject({ value: '0.8125rem' });
    expect(convertValue('10', o({ base: 18, precision: 3 }))).toMatchObject({ value: '0.556rem' });
  });
  it('explains bad input', () => {
    expect(convertValue('', o())).toEqual({ ok: null });
    expect(convertValue('abc', o())).toMatchObject({ ok: false, error: expect.stringContaining('isn’t a number') });
    expect(convertValue('2rem', o())).toMatchObject({ ok: false, error: expect.stringContaining('already in rem') });
    expect(convertValue('16', o({ base: 0 }))).toMatchObject({ ok: false, error: expect.stringContaining('above 0') });
    expect(convertValue('16', o({ base: NaN }))).toMatchObject({ ok: false });
  });
});

describe('convertText', () => {
  it('converts one value per line', () => {
    expect(convertText('12\n16px\n\n 24 \n1.5rem', o()).output).toBe('0.75rem\n1rem\n\n 1.5rem\n1.5rem');
    expect(convertText('1\n0.875rem', o({ direction: 'rem-px' })).output).toBe('16px\n14px');
  });

  it('converts only px values inside CSS', () => {
    const css = `.card {
  padding: 16px 24px;
  margin: 0 -8px;
  border: 1px solid #ddd; /* 1px hairline */
  background: url("icon-16px.png") no-repeat;
  font: 600 14px/1.5 "Inter 16px", sans-serif;
  width: calc(100% - 32px);
  line-height: 1.5;
  transform: translateX(2.5px);
}`;
    const r = convertText(css, o());
    expect(r.output).toBe(`.card {
  padding: 1rem 1.5rem;
  margin: 0 -0.5rem;
  border: 0.0625rem solid #ddd; /* 1px hairline */
  background: url("icon-16px.png") no-repeat;
  font: 600 0.875rem/1.5 "Inter 16px", sans-serif;
  width: calc(100% - 2rem);
  line-height: 1.5;
  transform: translateX(0.1563rem);
}`);
    expect(r.count).toBe(7);
    expect(convertText(css, o({ keepOnePx: true })).output).toContain('border: 1px solid');
  });

  it('converts rem in CSS the other way and leaves em alone', () => {
    expect(convertText('h1 { font-size: 2.25rem; margin: 1em 0 .5rem; }', o({ direction: 'rem-px' })).output).toBe('h1 { font-size: 36px; margin: 1em 0 8px; }');
  });

  it('handles comments across lines and unclosed strings', () => {
    expect(convertText('/* a\n10px */ b: 10px', o({ base: 10 })).output).toBe('/* a\n10px */ b: 1rem');
    expect(convertText('a: "10px\nb: 10px', o({ base: 10 })).output).toBe('a: "10px\nb: 1rem');
  });

  it('keeps unicode text and empty input', () => {
    expect(convertText('', o())).toEqual({ output: '', count: 0 });
    expect(convertText('.titre::before { content: "→ 8px"; gap: 8px } /* épais */', o()).output).toBe('.titre::before { content: "→ 8px"; gap: 0.5rem } /* épais */');
  });

  it('is fast on large input', () => {
    const big = 'a { margin: 4px 8px; } '.repeat(50_000) + '/*'.repeat(20_000) + '"'.repeat(20_000);
    const t = performance.now();
    const r = convertText(big, o());
    expect(r.count).toBe(100_000);
    expect(performance.now() - t).toBeLessThan(2000);
  });

  it('matches the page’s worked example', async () => {
    const { default: content } = await import('../tools/content/px-to-rem');
    expect(convertText(content.example!.input, o()).output).toBe(content.example!.output);
  });
});
