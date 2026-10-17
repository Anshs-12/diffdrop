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
      cryptoKey = await crypto.subtle.importKey('jwk', jwk, importParams, false, ['verify']);
    } else {
      const der = pemBytes(key);
      if (!der) return { ok: false, message: 'The key must be PEM ("-----BEGIN PUBLIC KEY-----") or a JWK' };
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
    return { ok: false, message: `The key couldn't be used: ${msg}` };
  }
}
