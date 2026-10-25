import { describe, expect, it } from 'vitest';
import { addressClass, calculate, classifyRange, formatIp, parseInput, parseIp, prefixForCount, prefixFromMask, split, summaryText, toBinary, MAX_SPLIT_ROWS } from './subnet';

const calc = (input: string, mask = '') => {
  const r = parseInput(input, mask);
  if (!r.ok) throw new Error(r.error);
  return calculate(r.value.ip, r.value.prefix);
};
const err = (input: string, mask = '') => {
  const r = parseInput(input, mask);
  return r.ok ? null : r.error;
};

describe('parseIp', () => {
  it('reads addresses', () => {
    expect(parseIp('192.168.1.10')).toEqual({ ok: true, value: 0xc0a8010a });
    expect(parseIp(' 0.0.0.0 ')).toEqual({ ok: true, value: 0 });
    expect(parseIp('255.255.255.255')).toEqual({ ok: true, value: 0xffffffff });
  });
  it.each(['256.1.1.1', '1.2.3', '1.2.3.4.5', '1..2.3', 'a.b.c.d', '01.2.3.4', '1.2.3.-4', '', '::1', '١.٢.٣.٤', '1.2.3.4 '.repeat(1000)])('rejects %j', (s) => {
    expect(parseIp(s).ok).toBe(false);
  });
  it('says why 256 fails', () => {
    expect(err('256.1.1.1/24')).toMatch(/256 is out of range/);
  });
  it('mentions IPv6', () => {
    expect(err('2001:db8::1/64')).toMatch(/IPv4 only/);
  });
});

describe('masks', () => {
  it.each([
    ['255.255.255.0', 24],
    ['255.255.255.255', 32],
    ['0.0.0.0', 0],
    ['255.255.254.0', 23],
    ['255.255.255.252', 30],
    ['128.0.0.0', 1],
  ])('%s is /%i', (m, p) => expect(prefixFromMask(m)).toEqual({ ok: true, value: p }));
  it.each(['255.0.255.0', '255.255.255.1', '0.255.255.255', '255.255.253.0'])('rejects %s', (m) => {
    const r = prefixFromMask(m);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/isn’t a valid subnet mask/);
  });
});

describe('parseInput', () => {
  it('accepts CIDR, IP + mask, and a bare IP', () => {
    expect(parseInput('192.168.1.10/24')).toEqual({ ok: true, value: { ip: 0xc0a8010a, prefix: 24 } });
    expect(parseInput('192.168.1.10/255.255.255.0')).toEqual({ ok: true, value: { ip: 0xc0a8010a, prefix: 24 } });
    expect(parseInput('192.168.1.10 255.255.255.0')).toEqual({ ok: true, value: { ip: 0xc0a8010a, prefix: 24 } });
    expect(parseInput('192.168.1.10', '255.255.0.0')).toEqual({ ok: true, value: { ip: 0xc0a8010a, prefix: 16 } });
    expect(parseInput('192.168.1.10', '/20')).toEqual({ ok: true, value: { ip: 0xc0a8010a, prefix: 20 } });
    expect(parseInput('10.0.0.1')).toEqual({ ok: true, value: { ip: 0x0a000001, prefix: 32 } });
  });
  it('rejects bad prefixes and masks', () => {
    expect(err('10.0.0.0/33')).toMatch(/\/33 is out of range/);
    expect(err('10.0.0.0/')).toMatch(/isn’t a prefix length/);
    expect(err('10.0.0.0/abc')).toMatch(/isn’t a prefix length/);
    expect(err('10.0.0.0/-1')).toMatch(/isn’t a prefix length/);
    expect(err('10.0.0.0', '255.0.255.0')).toMatch(/valid subnet mask/);
    expect(err('')).toMatch(/Enter an address/);
    expect(err('1.1.1.1 2.2.2.2 3.3.3.3')).toMatch(/one address/);
  });
});

describe('calculate', () => {
  it('a /24', () => {
    const s = calc('192.168.1.10/24');
    expect(s).toMatchObject({
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      mask: '255.255.255.0',
      wildcard: '0.0.0.255',
      firstHost: '192.168.1.1',
      lastHost: '192.168.1.254',
      total: 256,
      usable: 254,
      addressClass: 'C',
      cidr: '192.168.1.0/24',
      hostNote: null,
    });
    expect(s.range.kind).toBe('private');
    expect(s.binary.ip).toBe('11000000.10101000.00000001.00001010');
    expect(s.binary.mask).toBe('11111111.11111111.11111111.00000000');
  });
  it('a /20 not on a byte boundary', () => {
    expect(calc('172.20.37.9/20')).toMatchObject({ network: '172.20.32.0', broadcast: '172.20.47.255', firstHost: '172.20.32.1', lastHost: '172.20.47.254', usable: 4094, wildcard: '0.0.15.255' });
  });
  it('a /30', () => {
    expect(calc('10.0.0.5/30')).toMatchObject({ network: '10.0.0.4', broadcast: '10.0.0.7', firstHost: '10.0.0.5', lastHost: '10.0.0.6', usable: 2, total: 4 });
  });
  it('a /31 has two usable addresses (RFC 3021)', () => {
    const s = calc('10.0.0.1/31');
    expect(s).toMatchObject({ network: '10.0.0.0', broadcast: '–', firstHost: '10.0.0.0', lastHost: '10.0.0.1', usable: 2, total: 2 });
    expect(s.hostNote).toMatch(/RFC 3021/);
  });
  it('a /32 is one address', () => {
    const s = calc('8.8.8.8/32');
    expect(s).toMatchObject({ network: '8.8.8.8', broadcast: '–', firstHost: '8.8.8.8', lastHost: '8.8.8.8', usable: 1, total: 1, wildcard: '0.0.0.0' });
    expect(s.range.kind).toBe('public');
  });
  it('a /0 covers everything', () => {
    expect(calc('1.2.3.4/0')).toMatchObject({ network: '0.0.0.0', broadcast: '255.255.255.255', total: 4294967296, usable: 4294967294, mask: '0.0.0.0', wildcard: '255.255.255.255' });
  });
  it('high addresses stay unsigned', () => {
    expect(calc('255.255.255.254/24')).toMatchObject({ network: '255.255.255.0', broadcast: '255.255.255.255' });
  });
});

describe('ranges and classes', () => {
  it.each([
    ['10.1.2.3', 'Private (RFC 1918)'],
    ['172.16.0.1', 'Private (RFC 1918)'],
    ['172.31.255.255', 'Private (RFC 1918)'],
    ['172.32.0.1', 'Public'],
    ['192.168.0.1', 'Private (RFC 1918)'],
    ['127.0.0.1', 'Loopback'],
    ['169.254.10.1', 'Link-local (RFC 3927)'],
    ['100.64.0.1', 'Carrier-grade NAT (RFC 6598)'],
    ['100.127.255.255', 'Carrier-grade NAT (RFC 6598)'],
    ['100.128.0.1', 'Public'],
    ['192.0.2.1', 'Documentation (TEST-NET-1)'],
    ['198.51.100.7', 'Documentation (TEST-NET-2)'],
    ['203.0.113.9', 'Documentation (TEST-NET-3)'],
    ['224.0.0.251', 'Multicast'],
    ['239.255.255.250', 'Multicast'],
    ['255.255.255.255', 'Limited broadcast'],
    ['250.1.1.1', 'Reserved (former class E)'],
    ['0.0.0.0', 'This network'],
    ['8.8.8.8', 'Public'],
  ])('%s is %s', (ip, label) => expect(classifyRange((parseIp(ip) as { value: number }).value).label).toBe(label));
  it('classes', () => {
    const cls = (s: string) => addressClass((parseIp(s) as { value: number }).value);
    expect([cls('10.0.0.1'), cls('128.0.0.1'), cls('192.0.0.1'), cls('224.0.0.1'), cls('240.0.0.1')]).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('split', () => {
  it('splits a /24 into four /26', () => {
    const r = split(0xc0a80100, 24, 26);
    expect(r.ok && r.value.count).toBe(4);
    expect(r.ok && r.value.rows.map((x) => x.cidr)).toEqual(['192.168.1.0/26', '192.168.1.64/26', '192.168.1.128/26', '192.168.1.192/26']);
    expect(r.ok && r.value.rows[1]).toMatchObject({ firstHost: '192.168.1.65', lastHost: '192.168.1.126', broadcast: '192.168.1.127', usable: 62 });
  });
  it('caps the rows', () => {
    const r = split(0x0a000000, 8, 24);
    expect(r.ok && r.value.count).toBe(65536);
    expect(r.ok && r.value.rows.length).toBe(MAX_SPLIT_ROWS);
  });
  it('rejects a shorter prefix', () => {
    expect(split(0, 24, 20).ok).toBe(false);
    expect(split(0, 24, 33).ok).toBe(false);
  });
  it('picks a prefix for N subnets', () => {
    expect(prefixForCount(24, 4)).toEqual({ ok: true, value: 26 });
    expect(prefixForCount(24, 5)).toEqual({ ok: true, value: 27 });
    expect(prefixForCount(24, 1)).toEqual({ ok: true, value: 24 });
    expect(prefixForCount(30, 8).ok).toBe(false);
    expect(prefixForCount(24, 0).ok).toBe(false);
  });
});

it('formats and summarises', () => {
  expect(formatIp(0xffffffff)).toBe('255.255.255.255');
  expect(toBinary(0)).toBe('00000000.00000000.00000000.00000000');
  expect(summaryText(calc('192.168.1.10/24'))).toContain('Usable hosts:     254');
});

it('the worked example matches the real output', async () => {
  const { default: content } = await import('../tools/content/subnet-calculator');
  expect(summaryText(calc(content.example!.input))).toBe(content.example!.output);
});
