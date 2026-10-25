import { describe, expect, it } from 'vitest';
import { checkUuid, formatUuid, generateUuids, uuidV4, uuidV7, uuidV7Batch, MAX_UUIDS } from './uuid';

const CANON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('uuid v4', () => {
  it('sets the version and variant bits', () => {
    const u = uuidV4(new Uint8Array(16).fill(0xff));
    expect(u).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(uuidV4(new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('generates distinct, well-formed values', () => {
    const list = generateUuids(1000, 4);
    expect(list).toHaveLength(1000);
    expect(new Set(list).size).toBe(1000);
    for (const u of list) {
      expect(u).toMatch(CANON);
      expect(u[14]).toBe('4');
      expect('89ab').toContain(u[19]);
    }
  });
});

describe('uuid v7', () => {
  it('lays out timestamp, version, rand_a and variant per RFC 9562', () => {
    // RFC 9562 appendix A.6 example: 2022-02-22 19:22:22 UTC = 0x017F22E279B0
    const ms = 0x017f22e279b0;
    const u = uuidV7(ms, 0xcc3, new Uint8Array([0x18, 0xc4, 0xdc, 0x0c, 0x0c, 0x07, 0x39, 0x8f]));
    expect(u).toBe('017f22e2-79b0-7cc3-98c4-dc0c0c07398f');
    const hex = u.replace(/-/g, '');
    expect(parseInt(hex.slice(0, 12), 16)).toBe(ms);
    expect(hex[12]).toBe('7');
    expect(parseInt(hex[16]!, 16) >> 2).toBe(0b10);
  });

  it('sorts in creation order, also within one millisecond and across seq overflow', () => {
    const now = Date.UTC(2026, 9, 25, 12);
    const list = uuidV7Batch(1000, now);
    expect([...list].sort()).toEqual(list);
    expect(new Set(list).size).toBe(1000);
    const times = list.map((u) => parseInt(u.replace(/-/g, '').slice(0, 12), 16));
    for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThanOrEqual(times[i - 1]!);
    expect(times[0]).toBe(now);
    // 1000 values from a start below 0x800 can need at most one extra millisecond
    expect(times[times.length - 1]! - now).toBeLessThanOrEqual(1);
  });

  it('later batches have later timestamps', () => {
    const a = uuidV7Batch(1, 1_700_000_000_000)[0]!;
    const b = uuidV7Batch(1, 1_700_000_000_001)[0]!;
    expect(a < b).toBe(true);
  });

  it('decodes its own timestamp in the validator', () => {
    const now = Date.UTC(2026, 0, 2, 3, 4, 5, 6);
    const r = checkUuid(uuidV7Batch(1, now)[0]!);
    expect(r.status === 'valid' && r.version).toBe(7);
    expect(r.status === 'valid' && r.time?.getTime()).toBe(now);
  });
});

describe('formatUuid', () => {
  const u = '017f22e2-79b0-7cc3-98c4-dc0c0c07398f';
  it('applies case, dashes and braces', () => {
    expect(formatUuid(u, { upper: false, dashes: true, braces: false })).toBe(u);
    expect(formatUuid(u, { upper: true, dashes: false, braces: true })).toBe('{017F22E279B07CC398C4DC0C0C07398F}');
  });
});

describe('generateUuids', () => {
  it('clamps the count', () => {
    expect(generateUuids(0, 4)).toHaveLength(1);
    expect(generateUuids(5000, 7)).toHaveLength(MAX_UUIDS);
    expect(generateUuids(Number.NaN, 4)).toHaveLength(1);
  });
});

describe('checkUuid', () => {
  it('handles empty input', () => expect(checkUuid('   ').status).toBe('empty'));
  it('accepts braces, upper case, urn and no dashes', () => {
    for (const s of ['{550E8400-E29B-41D4-A716-446655440000}', 'urn:uuid:550e8400-e29b-41d4-a716-446655440000', '550e8400e29b41d4a716446655440000']) {
      const r = checkUuid(s);
      expect(r.status, s).toBe('valid');
      if (r.status === 'valid') {
        expect(r.version).toBe(4);
        expect(r.canonical).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    }
  });
  it('explains what is wrong', () => {
    expect(checkUuid('550e8400-e29b-41d4-a716-44665544000g')).toMatchObject({ status: 'invalid', message: expect.stringContaining('“g”') });
    expect(checkUuid('550e8400-e29b')).toMatchObject({ status: 'invalid', message: expect.stringContaining('12 hex digits') });
    expect(checkUuid('550e8400e-29b-41d4-a716-446655440000')).toMatchObject({ status: 'invalid', message: expect.stringContaining('8-4-4-4-12') });
    expect(checkUuid('ünïcödé ✓')).toMatchObject({ status: 'invalid' });
  });
  it('knows nil, max, v1 and non-RFC variants', () => {
    expect(checkUuid('00000000-0000-0000-0000-000000000000')).toMatchObject({ status: 'valid', variant: 'nil' });
    expect(checkUuid('ffffffff-ffff-ffff-ffff-ffffffffffff')).toMatchObject({ status: 'valid', variant: 'max' });
    expect(checkUuid('c232ab00-9414-11ec-b3c8-9f6bdeced846')).toMatchObject({ status: 'valid', version: 1 });
    expect(checkUuid('550e8400-e29b-41d4-c716-446655440000')).toMatchObject({ variant: 'Microsoft (reserved)' });
  });
});
