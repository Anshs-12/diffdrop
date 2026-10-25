/** Decoding and verifying JSON Web Tokens (JWS compact form), entirely in the browser. */

import { bytesToText, decodeBase64 } from './base64';

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: unknown;
  /** Raw text of each part, for display. */
  headerText: string;
  payloadText: string;
  signature: Uint8Array;
  /** "header.payload", the bytes the signature covers. */
  signingInput: string;
}

export type JwtResult = { ok: true; jwt: DecodedJwt } | { ok: false; message: string; part?: 'header' | 'payload' | 'signature' };

function decodePart(part: string, name: 'header' | 'payload'): { ok: true; text: string; value: unknown } | { ok: false; message: string } {
  if (!/^[A-Za-z0-9_-]*$/.test(part)) return { ok: false, message: `The ${name} isn't Base64url (it has characters like + / = or spaces)` };
  const bytes = decodeBase64(part);
  if (!bytes.ok) return { ok: false, message: `The ${name} isn't valid Base64url: ${bytes.message}` };
  const text = bytesToText(bytes.bytes);
  if (text == null) return { ok: false, message: `The ${name} isn't UTF-8 text` };
  try {
    return { ok: true, text, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, message: `The ${name} isn't JSON` };
  }
}

export function decodeJwt(input: string): JwtResult {
  const token = input.trim().replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, message: 'Paste a token' };
  const parts = token.split('.');
  if (parts.length === 5) return { ok: false, message: 'This is an encrypted token (JWE); only signed tokens (JWS) can be decoded without the key' };
  if (parts.length !== 3) return { ok: false, message: `A JWT has 3 parts separated by dots; this has ${parts.length}` };
  const header = decodePart(parts[0]!, 'header');
  if (!header.ok) return { ok: false, message: header.message, part: 'header' };
  if (!header.value || typeof header.value !== 'object' || Array.isArray(header.value)) {
    return { ok: false, message: 'The header must be a JSON object', part: 'header' };
  }
  const payload = decodePart(parts[1]!, 'payload');
  if (!payload.ok) return { ok: false, message: payload.message, part: 'payload' };
  const sig = decodeBase64(parts[2]!);
  if (!sig.ok || !/^[A-Za-z0-9_-]*$/.test(parts[2]!)) return { ok: false, message: "The signature isn't valid Base64url", part: 'signature' };
  return {
    ok: true,
    jwt: {
      header: header.value as Record<string, unknown>,
      payload: payload.value,
      headerText: header.text,
      payloadText: payload.text,
      signature: sig.bytes,
      signingInput: `${parts[0]}.${parts[1]}`,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Time claims
// ─────────────────────────────────────────────────────────────

export interface TimeClaim {
  claim: 'exp' | 'nbf' | 'iat';
  label: string;
  ms: number;
}

const CLAIM_LABELS = { exp: 'Expires', nbf: 'Not before', iat: 'Issued at' } as const;

export function timeClaims(payload: unknown): TimeClaim[] {
  if (!payload || typeof payload !== 'object') return [];
  const out: TimeClaim[] = [];
  for (const claim of ['iat', 'nbf', 'exp'] as const) {
    const v = (payload as Record<string, unknown>)[claim];
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ claim, label: CLAIM_LABELS[claim], ms: v * 1000 });
  }
  return out;
}

/** Whether the token is usable now, judging by exp and nbf. */
export function tokenStatus(payload: unknown, now: number): { state: 'valid' | 'expired' | 'not-yet' | 'no-expiry'; ms?: number } {
  const claims = timeClaims(payload);
  const nbf = claims.find((c) => c.claim === 'nbf');
  const exp = claims.find((c) => c.claim === 'exp');
  if (nbf && now < nbf.ms) return { state: 'not-yet', ms: nbf.ms };
  if (exp && now >= exp.ms) return { state: 'expired', ms: exp.ms };
  if (exp) return { state: 'valid', ms: exp.ms };
  return { state: 'no-expiry' };
}

/** Well-known claim names, for labels in the payload view. */
export const CLAIM_NAMES: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration time',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'JWT ID',
  alg: 'Signing algorithm',
  typ: 'Token type',
  kid: 'Key ID',
  cty: 'Content type',
  scope: 'Scopes',
  azp: 'Authorized party',
  nonce: 'Nonce',
  email: 'Email',
  name: 'Name',
};

// ─────────────────────────────────────────────────────────────
// Signature verification (WebCrypto)
// ─────────────────────────────────────────────────────────────

export type KeyKind = 'secret' | 'public';

/** What kind of key an algorithm needs, or null when it isn't supported. */
export function keyKindFor(alg: unknown): KeyKind | null {
  if (typeof alg !== 'string') return null;
  if (/^HS(256|384|512)$/.test(alg)) return 'secret';
  if (/^(RS|PS|ES)(256|384|512)$/.test(alg) || alg === 'EdDSA') return 'public';
  return null;
}

type Algo = { importParams: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams; verifyParams: AlgorithmIdentifier | RsaPssParams | EcdsaParams };

function algorithm(alg: string): Algo {
  const bits = alg.slice(2);
  const hash = `SHA-${bits}`;
  if (alg.startsWith('HS')) return { importParams: { name: 'HMAC', hash }, verifyParams: { name: 'HMAC' } };
  if (alg.startsWith('RS')) return { importParams: { name: 'RSASSA-PKCS1-v1_5', hash }, verifyParams: { name: 'RSASSA-PKCS1-v1_5' } };
  if (alg.startsWith('PS')) return { importParams: { name: 'RSA-PSS', hash }, verifyParams: { name: 'RSA-PSS', saltLength: Number(bits) / 8 } };
  if (alg.startsWith('ES')) {
    const curve = { '256': 'P-256', '384': 'P-384', '512': 'P-521' }[bits]!;
    return { importParams: { name: 'ECDSA', namedCurve: curve }, verifyParams: { name: 'ECDSA', hash } };
  }
  return { importParams: { name: 'Ed25519' }, verifyParams: { name: 'Ed25519' } };
}

/** Bytes of a PEM block (BEGIN PUBLIC KEY …), or null if the text isn't PEM. */
function pemBytes(pem: string): Uint8Array | null {
  const m = /-----BEGIN ([A-Z ]+)-----([\s\S]+?)-----END \1-----/.exec(pem);
  if (!m) return null;
  if (m[1] !== 'PUBLIC KEY') throw new Error(`Use a public key ("BEGIN PUBLIC KEY"), not "${m[1]}"`);
  const decoded = decodeBase64(m[2]!);
  return decoded.ok ? decoded.bytes : null;
}

/** What kind of key an algorithm needs, e.g. "an RSA key" or "an EC key on the P-256 curve". */
function keyNeeded(alg: string): { type: 'RSA' | 'EC' | 'Ed25519'; curve?: string; text: string } {
  if (/^(RS|PS)/.test(alg)) return { type: 'RSA', text: 'an RSA key' };
  if (alg.startsWith('ES')) {
    const curve = { '256': 'P-256', '384': 'P-384', '512': 'P-521' }[alg.slice(2)]!;
    return { type: 'EC', curve, text: `an EC key on the ${curve} curve` };
  }
  return { type: 'Ed25519', text: 'an Ed25519 key' };
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** DER-encoded algorithm and curve identifiers found in a public key (SPKI). */
const KEY_OIDS: [string, { type: string; curve?: string }][] = [
  ['06092a864886f70d010101', { type: 'RSA' }],
  ['06092a864886f70d01010a', { type: 'RSA' }],
  ['06082a8648ce3d030107', { type: 'EC', curve: 'P-256' }],
  ['06052b81040022', { type: 'EC', curve: 'P-384' }],
  ['06052b81040023', { type: 'EC', curve: 'P-521' }],
  ['06052b8104000a', { type: 'EC', curve: 'secp256k1' }],
  ['06032b6570', { type: 'Ed25519' }],
  ['06032b6571', { type: 'Ed448' }],
];

/** The type (and curve) of a PEM public key, or null if it isn't recognized. */
function spkiKind(der: Uint8Array): { type: string; curve?: string } | null {
  const h = hex(der.slice(0, 40));
  let found: { type: string; curve?: string } | null = null;
  for (const [oid, kind] of KEY_OIDS) {
    if (!h.includes(oid)) continue;
    // An EC key lists its curve after the EC identifier; keep the more specific match
    if (!found || kind.curve) found = kind;
  }
  return found;
}

/** The type (and curve) of a JWK. */
function jwkKind(jwk: JsonWebKey): { type: string; curve?: string } | null {
  if (jwk.kty === 'RSA') return { type: 'RSA' };
  if (jwk.kty === 'EC') return { type: 'EC', curve: jwk.crv };
  if (jwk.kty === 'OKP') return { type: jwk.crv ?? 'OKP' };
  if (jwk.kty === 'oct') return { type: 'secret (oct)' };
  return null;
}

const describe = (k: { type: string; curve?: string }) => (k.type === 'EC' ? `an EC key${k.curve ? ` on the ${k.curve} curve` : ''}` : `${/^[AEIOU]/.test(k.type) ? 'an' : 'a'} ${k.type} key`);

/** Explains a key that can't verify this algorithm, or null if the key type fits. */
function keyMismatch(alg: string, actual: { type: string; curve?: string } | null): string | null {
  if (!actual) return null;
  const need = keyNeeded(alg);
  if (actual.type === need.type && (!need.curve || !actual.curve || actual.curve === need.curve)) return null;
  return `This token is signed with ${alg}, which needs ${need.text}, but the key you pasted is ${describe(actual)}. Use the public key that matches the token's "alg".`;
}

export type VerifyResult = { ok: true; valid: boolean } | { ok: false; message: string };

/**
 * Check the signature with a shared secret (HS*) or a public key (PEM or JWK)
 * for RS*, PS*, ES* and EdDSA. `secretIsBase64` reads the secret as Base64.
 */
export async function verifyJwt(jwt: DecodedJwt, key: string, secretIsBase64 = false): Promise<VerifyResult> {
  const alg = jwt.header.alg;
  const kind = keyKindFor(alg);
  if (alg === 'none') return { ok: false, message: 'This token is unsigned (alg "none"), so there is nothing to verify' };
  if (!kind) return { ok: false, message: `Algorithm ${JSON.stringify(alg)} isn't supported` };
  if (!key.trim()) return { ok: false, message: kind === 'secret' ? 'Enter the secret' : 'Paste the public key (PEM or JWK)' };
  const { importParams, verifyParams } = algorithm(alg as string);
  try {
    let cryptoKey: CryptoKey;
    if (kind === 'secret') {
      let bytes: Uint8Array;
      if (secretIsBase64) {
        const d = decodeBase64(key.trim());
        if (!d.ok) return { ok: false, message: `The secret isn't valid Base64: ${d.message}` };
        bytes = d.bytes;
      } else {
        bytes = new TextEncoder().encode(key);
      }
      cryptoKey = await crypto.subtle.importKey('raw', bytes as BufferSource, importParams, false, ['verify']);
    } else if (key.trim().startsWith('{')) {
      const jwk = JSON.parse(key) as JsonWebKey;
      const mismatch = keyMismatch(alg as string, jwkKind(jwk));
      if (mismatch) return { ok: false, message: mismatch };
      cryptoKey = await crypto.subtle.importKey('jwk', jwk, importParams, false, ['verify']);
    } else {
      const der = pemBytes(key);
      if (!der) return { ok: false, message: 'The key must be PEM ("-----BEGIN PUBLIC KEY-----") or a JWK' };
      const mismatch = keyMismatch(alg as string, spkiKind(der));
      if (mismatch) return { ok: false, message: mismatch };
      cryptoKey = await crypto.subtle.importKey('spki', der as BufferSource, importParams, false, ['verify']);
    }
    const valid = await crypto.subtle.verify(
      verifyParams,
      cryptoKey,
      jwt.signature as BufferSource,
      new TextEncoder().encode(jwt.signingInput) as BufferSource,
    );
    return { ok: true, valid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (alg === 'EdDSA' && /not supported|Unrecognized/i.test(msg)) return { ok: false, message: "This browser can't verify EdDSA (Ed25519) signatures yet" };
    const detail = msg && !/operation-specific reason/i.test(msg) ? ` (${msg})` : '';
    return { ok: false, message: `The key couldn't be used with ${alg}${detail}. ${alg} needs ${kind === 'secret' ? 'a shared secret' : `${keyNeeded(alg as string).text}, as PEM ("-----BEGIN PUBLIC KEY-----") or JWK`}.` };
  }
}
