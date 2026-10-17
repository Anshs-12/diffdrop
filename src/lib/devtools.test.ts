import { describe, expect, it } from 'vitest';
import { bytesToBase64, bytesToText, decodeBase64, encodeText, hexPreview, sniffType } from './base64';
import { calendarInfo, guessUnit, isoWithOffset, parseTime, relative, toUnits, zoneOffset } from './timestamp';
import { decodeJwt, keyKindFor, timeClaims, tokenStatus, verifyJwt } from './jwt';
import { parseUrl, urlDecode, urlEncode } from './urlCodec';
import { compileRegex, runRegex } from './regex';
import { rng } from '@/test/random';

describe('base64', () => {
  it('encodes UTF-8 text like other tools', () => {
    expect(encodeText('hello')).toBe('aGVsbG8=');
    expect(encodeText('héllo wörld ✓ 😀')).toBe('aMOpbGxvIHfDtnJsZCDinJMg8J+YgA==');
    expect(encodeText('a?b>c', true)).toBe('YT9iPmM');
    expect(encodeText('')).toBe('');
  });

  it('decodes both alphabets, missing padding, whitespace and data URLs', () => {
    const text = (s: string) => {
      const r = decodeBase64(s);
      return r.ok ? bytesToText(r.bytes) : r.message;
    };
    expect(text('aGVsbG8=')).toBe('hello');
    expect(text('aGVsbG8')).toBe('hello');
    expect(text('aGVs\nbG8=\n')).toBe('hello');
    expect(text('YT9iPmM')).toBe('a?b>c');
    expect(text('YT9iPmM=')).toBe('a?b>c');
    expect(text('data:text/plain;base64,aGk=')).toBe('hi');
  });

  it('says what is wrong with invalid input, and where', () => {
    expect(decodeBase64('aGV$bG8=')).toMatchObject({ ok: false, index: 3, message: '"$" isn\'t a Base64 character' });
    expect(decodeBase64('aGVsb')).toMatchObject({ ok: false });
    expect(decodeBase64('aGk=x')).toMatchObject({ ok: false, index: 4 });
    expect(decodeBase64('aGk===')).toMatchObject({ ok: false });
  });

  it('round-trips random bytes in both alphabets', () => {
    const rand = rng(51);
    for (let k = 0; k < 500; k++) {
      const bytes = Uint8Array.from({ length: Math.floor(rand() * 70) }, () => Math.floor(rand() * 256));
      for (const urlSafe of [false, true]) {
        const r = decodeBase64(bytesToBase64(bytes, urlSafe));
        expect(r.ok && [...r.bytes]).toEqual([...bytes]);
      }
    }
  });

  it('spots binary data and common file types', () => {
    expect(bytesToText(Uint8Array.from([0xff, 0xfe, 0x00]))).toBeNull();
    expect(sniffType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toEqual({ mime: 'image/png', ext: 'png' });
    expect(sniffType(Uint8Array.from([1, 2, 3]))).toBeNull();
    expect(hexPreview(Uint8Array.from([0x41, 0x00]))).toBe('00000000  41 00' + ' '.repeat(44) + 'A.');
  });
});

describe('timestamp', () => {
  it('guesses the unit from the size', () => {
    expect(guessUnit(1_760_000_000)).toBe('s');
    expect(guessUnit(1_760_000_000_000)).toBe('ms');
    expect(guessUnit(1_760_000_000_000_000)).toBe('us');
    expect(guessUnit(1.76e18)).toBe('ns');
    expect(guessUnit(-86400)).toBe('s');
  });

  it('reads timestamps and dates', () => {
    expect(parseTime('1760700000')).toEqual({ ok: true, ms: 1760700000000, unit: 's', kind: 'timestamp' });
    expect(parseTime('1760700000123')).toMatchObject({ ms: 1760700000123, unit: 'ms' });
    expect(parseTime('1760700000', 'ms')).toMatchObject({ ms: 1760700000, unit: 'ms' });
    expect(parseTime('2026-10-17T12:00:00Z')).toMatchObject({ ms: Date.UTC(2026, 9, 17, 12), kind: 'date' });
    expect(parseTime('2026-10-17 12:00:00Z')).toMatchObject({ ms: Date.UTC(2026, 9, 17, 12) });
    expect(parseTime('Sat, 17 Oct 2026 12:00:00 GMT')).toMatchObject({ ms: Date.UTC(2026, 9, 17, 12) });
    expect(parseTime('nonsense')).toMatchObject({ ok: false });
    // 1e26 ns is about 3 billion years: past what a date can hold
    expect(parseTime('100000000000000000000000000')).toMatchObject({ ok: false });
  });

  it('writes the moment in every unit exactly', () => {
    expect(toUnits(1760700000123)).toEqual({ s: '1760700000', ms: '1760700000123', us: '1760700000123000', ns: '1760700000123000000' });
  });

  it('formats ISO 8601 with offsets and finds zone offsets', () => {
    const ms = Date.UTC(2026, 9, 17, 12, 30, 5);
    expect(isoWithOffset(ms, 0)).toBe('2026-10-17T12:30:05Z');
    expect(isoWithOffset(ms, 330)).toBe('2026-10-17T18:00:05+05:30');
    expect(isoWithOffset(ms + 7, -240)).toBe('2026-10-17T08:30:05.007-04:00');
    expect(zoneOffset(ms, 'Asia/Kolkata')).toBe(330);
    expect(zoneOffset(ms, 'America/New_York')).toBe(-240);
    expect(zoneOffset(Date.UTC(2026, 0, 1), 'America/New_York')).toBe(-300);
  });

  it('describes relative time and calendar facts', () => {
    const now = Date.UTC(2026, 9, 17);
    expect(relative(now - 3 * 3600_000, now)).toBe('3 hours ago');
    expect(relative(now + 2 * 86400_000, now)).toBe('in 2 days');
    expect(calendarInfo(Date.UTC(2026, 0, 1))).toEqual({ week: 1, dayOfYear: 1, leapYear: false });
    expect(calendarInfo(Date.UTC(2024, 11, 31))).toEqual({ week: 1, dayOfYear: 366, leapYear: true });
  });
});

const b64url = (s: string | Uint8Array) => bytesToBase64(typeof s === 'string' ? new TextEncoder().encode(s) : s, true);

async function sign(alg: string, header: object, payload: object, key: CryptoKey, params: AlgorithmIdentifier | RsaPssParams | EcdsaParams) {
  const input = `${b64url(JSON.stringify({ alg, ...header }))}.${b64url(JSON.stringify(payload))}`;
  const sig = new Uint8Array(await crypto.subtle.sign(params, key, new TextEncoder().encode(input)));
  return `${input}.${b64url(sig)}`;
}

function pem(der: ArrayBuffer): string {
  return `-----BEGIN PUBLIC KEY-----\n${bytesToBase64(new Uint8Array(der)).replace(/.{64}/g, '$&\n')}\n-----END PUBLIC KEY-----`;
}

describe('jwt', () => {
  // The example token from RFC 7519 / jwt.io (HS256, secret "your-256-bit-secret")
  const JWT_IO =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('decodes header and payload', () => {
    const r = decodeJwt(`Bearer ${JWT_IO}`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.jwt.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(r.jwt.payload).toEqual({ sub: '1234567890', name: 'John Doe', iat: 1516239022 });
    expect(timeClaims(r.jwt.payload)).toEqual([{ claim: 'iat', label: 'Issued at', ms: 1516239022000 }]);
  });

  it('explains malformed tokens', () => {
    expect(decodeJwt('abc')).toMatchObject({ ok: false, message: 'A JWT has 3 parts separated by dots; this has 1' });
    expect(decodeJwt('a.b.c.d.e')).toMatchObject({ ok: false, message: expect.stringContaining('encrypted') });
    expect(decodeJwt(`${b64url('not json')}.e30.`)).toMatchObject({ ok: false, part: 'header' });
    expect(decodeJwt('eyJhbGciOiJub25lIn0.e30.')).toMatchObject({ ok: true });
  });

  it('reports whether the token is current', () => {
    const now = 1_760_000_000_000;
    expect(tokenStatus({ exp: now / 1000 - 1 }, now).state).toBe('expired');
    expect(tokenStatus({ exp: now / 1000 + 60 }, now).state).toBe('valid');
    expect(tokenStatus({ nbf: now / 1000 + 60, exp: now / 1000 + 120 }, now).state).toBe('not-yet');
    expect(tokenStatus({}, now).state).toBe('no-expiry');
  });

  it('verifies HS256 with the right secret and rejects the wrong one', async () => {
    const r = decodeJwt(JWT_IO);
    if (!r.ok) throw new Error('decode failed');
    expect(await verifyJwt(r.jwt, 'your-256-bit-secret')).toEqual({ ok: true, valid: true });
    expect(await verifyJwt(r.jwt, 'wrong')).toEqual({ ok: true, valid: false });
    expect(await verifyJwt(r.jwt, bytesToBase64(new TextEncoder().encode('your-256-bit-secret')), true)).toEqual({ ok: true, valid: true });
  });

  it('verifies RS256, PS256 and ES256 with PEM and JWK public keys', async () => {
    const cases = [
      { alg: 'RS256', gen: { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, sign: { name: 'RSASSA-PKCS1-v1_5' } },
      { alg: 'PS256', gen: { name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, sign: { name: 'RSA-PSS', saltLength: 32 } },
      { alg: 'ES256', gen: { name: 'ECDSA', namedCurve: 'P-256' }, sign: { name: 'ECDSA', hash: 'SHA-256' } },
    ];
    for (const c of cases) {
      const pair = (await crypto.subtle.generateKey(c.gen as RsaHashedKeyGenParams, true, ['sign', 'verify'])) as CryptoKeyPair;
      const token = await sign(c.alg, { typ: 'JWT' }, { sub: 'x' }, pair.privateKey, c.sign);
      const r = decodeJwt(token);
      if (!r.ok) throw new Error(r.message);
      const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
      expect(await verifyJwt(r.jwt, pem(spki)), c.alg).toEqual({ ok: true, valid: true });
      const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
      expect(await verifyJwt(r.jwt, JSON.stringify(jwk)), c.alg).toEqual({ ok: true, valid: true });
      // Tampered payload fails
      const [h, , s] = token.split('.');
      const forged = decodeJwt(`${h}.${b64url('{"sub":"admin"}')}.${s}`);
      if (!forged.ok) throw new Error('decode failed');
      expect(await verifyJwt(forged.jwt, pem(spki)), c.alg).toEqual({ ok: true, valid: false });
    }
  });

  it('refuses alg none, unknown algorithms and private keys', async () => {
    const none = decodeJwt('eyJhbGciOiJub25lIn0.e30.');
    if (!none.ok) throw new Error('decode failed');
    expect(await verifyJwt(none.jwt, 'x')).toMatchObject({ ok: false, message: expect.stringContaining('unsigned') });
    expect(keyKindFor('HS512')).toBe('secret');
    expect(keyKindFor('ES384')).toBe('public');
    expect(keyKindFor('XX1')).toBeNull();
    const rs = decodeJwt(`${b64url('{"alg":"RS256"}')}.e30.AAAA`);
    if (!rs.ok) throw new Error('decode failed');
    expect(await verifyJwt(rs.jwt, '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----')).toMatchObject({
      ok: false,
      message: expect.stringContaining('public key'),
    });
  });
});

describe('url encoding', () => {
  it('encodes in the three common styles', () => {
    const s = "a b&c=d/é?!'()*";
    expect(urlEncode(s, 'component')).toBe("a%20b%26c%3Dd%2F%C3%A9%3F!'()*");
    expect(urlEncode(s, 'form')).toBe('a+b%26c%3Dd%2F%C3%A9%3F%21%27%28%29%2A');
    expect(urlEncode('https://x.io/a b?q=é#h', 'uri')).toBe('https://x.io/a%20b?q=%C3%A9#h');
  });

  it('decodes and round-trips', () => {
    const rand = rng(53);
    const chars = 'aZ09 -_.~!*\'();:@&=+$,/?#[]%é日😀\n';
    for (let k = 0; k < 500; k++) {
      const s = Array.from({ length: Math.floor(rand() * 20) }, () => [...chars][Math.floor(rand() * [...chars].length)]).join('');
      for (const mode of ['component', 'form'] as const) expect(urlDecode(urlEncode(s, mode), mode)).toEqual({ ok: true, text: s });
    }
    expect(urlDecode('a+b', 'form')).toEqual({ ok: true, text: 'a b' });
    expect(urlDecode('a+b', 'component')).toEqual({ ok: true, text: 'a+b' });
  });

  it('points at malformed escapes', () => {
    expect(urlDecode('ok%2', 'component')).toMatchObject({ ok: false, index: 2 });
    expect(urlDecode('100% sure', 'component')).toMatchObject({ ok: false, index: 3 });
    expect(urlDecode('a%C3%28', 'component')).toMatchObject({ ok: false, index: 1, message: "%C3%28 isn't valid UTF-8 text" });
  });

  it('breaks a URL into parts and decoded parameters', () => {
    const u = parseUrl('https://user:pw@example.com:8080/a%20b/c?q=hello+world&tag=1&tag=2#top');
    expect(u).toMatchObject({ protocol: 'https:', username: 'user', hostname: 'example.com', port: '8080', pathname: '/a b/c', hash: '#top' });
    expect(u!.params).toEqual([
      ['q', 'hello world'],
      ['tag', '1'],
      ['tag', '2'],
    ]);
    expect(parseUrl('not a url')).toBeNull();
  });
});

describe('regex', () => {
  it('finds every match with numbered and named groups', () => {
    const r = runRegex({ pattern: '(?<user>\\w+)@(\\w+)\\.com', flags: 'g', text: 'ada@x.com, bob@y.com', replacement: '$2:$<user>' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.matches.map((m) => m.value)).toEqual(['ada@x.com', 'bob@y.com']);
    expect(r.matches[1]!.groups).toEqual([
      { index: 1, name: 'user', value: 'bob', start: 11, end: 14 },
      { index: 2, name: null, value: 'y', start: 15, end: 16 },
    ]);
    expect(r.replaced).toBe('x:ada, y:bob');
  });

  it('finds only the first match without g, and handles empty matches', () => {
    const one = runRegex({ pattern: '\\d', flags: '', text: 'a1b2', replacement: null });
    expect(one.ok && one.matches.map((m) => m.value)).toEqual(['1']);
    const empty = runRegex({ pattern: 'x*', flags: 'g', text: 'axb', replacement: null });
    expect(empty.ok && empty.matches.map((m) => [m.start, m.value])).toEqual([
      [0, ''],
      [1, 'x'],
      [2, ''],
      [3, ''],
    ]);
    const emoji = runRegex({ pattern: '', flags: 'gu', text: '😀a', replacement: null });
    expect(emoji.ok && emoji.matches.map((m) => m.start)).toEqual([0, 2, 3]);
  });

  it('counts group numbers correctly around classes, escapes and lookarounds', () => {
    const r = runRegex({ pattern: '[(](?:x)(?<a>y)\\((?=z)(z)', flags: '', text: '(xy(z', replacement: null });
    expect(r.ok && r.matches[0]!.groups.map((g) => [g.index, g.name, g.value])).toEqual([
      [1, 'a', 'y'],
      [2, null, 'z'],
    ]);
  });

  it('reports syntax errors plainly', () => {
    expect(compileRegex('(a', '')).toMatchObject({ ok: false, message: expect.stringMatching(/unterminated group/i) });
    expect(compileRegex('a', 'gg')).toMatchObject({ ok: false });
  });
});
