import { describe, expect, it } from 'vitest';
import { findMatch, formatHash, hashBytes, hmacBytes, md5, normalizeExpected, toHex } from './hash';

const enc = (s: string) => new TextEncoder().encode(s);
const md5Hex = (s: string) => toHex(md5(enc(s)));

describe('md5 (RFC 1321 test suite)', () => {
  const vectors: [string, string][] = [
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'd174ab98d277d9f5a5611c2c9f419d9f'],
    ['12345678901234567890123456789012345678901234567890123456789012345678901234567890', '57edf4a22be3c955ac49da2e2107b67a'],
  ];
  for (const [input, want] of vectors) it(JSON.stringify(input), () => expect(md5Hex(input)).toBe(want));

  it('pads correctly at the 55/56/64-byte boundaries', () => {
    // Reference values from coreutils md5sum
    expect(md5Hex('a'.repeat(55))).toBe('ef1772b6dff9a122358552954ad0df65');
    expect(md5Hex('a'.repeat(56))).toBe('3b0c8ac703f828b04c6c197006d17218');
    expect(md5Hex('a'.repeat(64))).toBe('014842d480b571495a4a0363793f7367');
  });

  it('hashes UTF-8 text', () => {
    expect(md5Hex('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6');
    expect(md5Hex('héllo wörld ✓ 😀')).toBe(md5Hex('héllo wörld ✓ \u{1F600}'));
  });

  it('handles a large input', () => {
    // One million "a"s (a classic vector)
    expect(toHex(md5(new Uint8Array(1_000_000).fill(0x61)))).toBe('7707d6ae4e027c70eea2a935c2296f21');
  });
});

describe('sha via Web Crypto', () => {
  it('matches the FIPS 180 vectors for "abc" and ""', async () => {
    const abc = enc('abc');
    expect(toHex(await hashBytes('SHA-1', abc))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(toHex(await hashBytes('SHA-256', abc))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(toHex(await hashBytes('SHA-384', abc))).toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    );
    expect(toHex(await hashBytes('SHA-512', abc))).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    );
    expect(toHex(await hashBytes('SHA-256', enc('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(toHex(await hashBytes('SHA-1', enc('')))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(toHex(await hashBytes('MD5', enc('abc')))).toBe('900150983cd24fb0d6963f7d28e17f72');
  });

  it('computes HMAC (RFC 4231 test case 2)', async () => {
    const mac = await hmacBytes('SHA-256', enc('Jefe'), enc('what do ya want for nothing?'));
    expect(toHex(mac)).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });
});

describe('formatting and comparing', () => {
  const bytes = md5(enc('abc'));
  it('formats hex, upper hex and Base64', () => {
    expect(formatHash(bytes, 'hex')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(formatHash(bytes, 'HEX')).toBe('900150983CD24FB0D6963F7D28E17F72');
    expect(formatHash(bytes, 'base64')).toBe('kAFQmDzST7DWlj99KOF/cg==');
  });

  it('normalizes expected values', () => {
    expect(normalizeExpected('')).toBeNull();
    expect(normalizeExpected('  900150983CD24FB0D6963F7D28E17F72 ')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(normalizeExpected('900150983cd24fb0d6963f7d28e17f72  file.txt')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(normalizeExpected('md5:900150983cd24fb0d6963f7d28e17f72')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(normalizeExpected('kAFQmDzST7DWlj99KOF/cg==')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(normalizeExpected('not a hash!')).toBeNull();
  });

  it('finds which hash matches', async () => {
    const sha = await hashBytes('SHA-256', enc('abc'));
    const all = { MD5: bytes, 'SHA-256': sha };
    expect(findMatch('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD', all)).toBe('SHA-256');
    expect(findMatch('900150983cd24fb0d6963f7d28e17f72', all)).toBe('MD5');
    expect(findMatch('0'.repeat(64), all)).toBeNull();
  });
});
