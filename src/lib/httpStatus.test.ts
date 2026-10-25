import { describe, expect, it } from 'vitest';
import { STATUS_CODES, UNOFFICIAL_CODES, codeLine, filterCodes } from './httpStatus';

describe('data', () => {
  it('has unique codes in order, each with text', () => {
    const all = [...STATUS_CODES, ...UNOFFICIAL_CODES];
    expect(new Set(all.map((c) => c.code)).size).toBe(all.length);
    for (const list of [STATUS_CODES, UNOFFICIAL_CODES]) {
      const codes = list.map((c) => c.code);
      expect(codes).toEqual([...codes].sort((a, b) => a - b));
    }
    for (const c of STATUS_CODES) {
      expect(c.code).toBeGreaterThanOrEqual(100);
      expect(c.code).toBeLessThan(600);
      expect(c.name && c.meaning && c.use && c.spec).toBeTruthy();
      expect(c.unofficial).toBeUndefined();
    }
    for (const c of UNOFFICIAL_CODES) expect(c.unofficial).toBeTruthy();
  });
  it('includes the expected codes', () => {
    const codes = new Set(STATUS_CODES.map((c) => c.code));
    for (const c of [100, 101, 103, 200, 201, 204, 206, 301, 302, 303, 304, 307, 308, 400, 401, 403, 404, 405, 409, 410, 418, 422, 425, 426, 428, 429, 431, 451, 500, 502, 503, 504, 511]) {
      expect(codes.has(c)).toBe(true);
    }
    // Not registered codes stay out of the standard list
    for (const c of [419, 420, 440, 444, 449, 450, 494, 498, 499, 509, 520, 530, 599]) expect(codes.has(c)).toBe(false);
  });
  it('marks exactly the RFC 9110 heuristically cacheable codes', () => {
    expect(STATUS_CODES.filter((c) => c.cacheable).map((c) => c.code)).toEqual([200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501]);
  });
  it('418 is described as a joke', () => {
    expect(STATUS_CODES.find((c) => c.code === 418)!.meaning).toMatch(/April Fools/);
  });
});

describe('filterCodes', () => {
  it('filters by class', () => {
    expect(filterCodes(STATUS_CODES, '1', '').every((c) => c.code < 200)).toBe(true);
    expect(filterCodes(STATUS_CODES, 'all', '').length).toBe(STATUS_CODES.length);
  });
  it('searches by number and number prefix', () => {
    expect(filterCodes(STATUS_CODES, 'all', '404').map((c) => c.code)).toEqual([404]);
    expect(filterCodes(STATUS_CODES, 'all', '41').map((c) => c.code)).toEqual([410, 411, 412, 413, 414, 415, 416, 417, 418]);
    expect(filterCodes(STATUS_CODES, 'all', '5xx').every((c) => c.code >= 500)).toBe(true);
    expect(filterCodes(STATUS_CODES, '2', '404')).toEqual([]);
  });
  it('searches text, all words, any case', () => {
    expect(filterCodes(STATUS_CODES, 'all', 'TEAPOT').map((c) => c.code)).toEqual([418]);
    expect(filterCodes(STATUS_CODES, 'all', 'rate limiting').map((c) => c.code)).toEqual([429]);
    expect(filterCodes(STATUS_CODES, 'all', 'redirect permanent').map((c) => c.code)).toContain(308);
    expect(filterCodes(UNOFFICIAL_CODES, 'all', 'cloudflare').length).toBe(7);
    expect(filterCodes(STATUS_CODES, 'all', 'zzzz')).toEqual([]);
    expect(filterCodes(STATUS_CODES, 'all', '日本')).toEqual([]);
    expect(filterCodes(STATUS_CODES, 'all', 'x'.repeat(10000))).toEqual([]);
  });
  it('formats a code line', () => {
    expect(codeLine(STATUS_CODES.find((c) => c.code === 404)!)).toBe('404 Not Found');
  });
});
