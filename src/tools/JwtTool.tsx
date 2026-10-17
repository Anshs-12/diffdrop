import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Clock } from 'lucide-react';
import { CLAIM_NAMES, decodeJwt, keyKindFor, timeClaims, tokenStatus, verifyJwt, type VerifyResult } from '@/lib/jwt';
import { relative } from '@/lib/timestamp';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import CodeEditor from './CodeEditor';
import { OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';

/** An HS256 example signed with the secret "diffdrop-secret" (iat 2026-10-17, exp 2099). */
const EXAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MDcwMDAwMCwiZXhwIjo0MDcwOTA4ODAwfQ.Xu2SOtCgFuK26DbtZiyUlZW8e_wXtcvTJ3MywS175J8';
export const EXAMPLE_SECRET = 'diffdrop-secret';

const pretty = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2) + '\n';
  } catch {
    return text;
  }
};

function formatDate(ms: number): string {
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

export default function JwtTool() {
  const [token, setToken] = useState('');
  const [key, setKey] = useState('');
  const [keyIsBase64, setKeyIsBase64] = useState(false);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const decoded = useMemo(() => (token.trim() ? decodeJwt(token) : null), [token]);
  const jwt = decoded?.ok ? decoded.jwt : null;
  const kind = jwt ? keyKindFor(jwt.header.alg) : null;

  useEffect(() => {
    setVerify(null);
    if (!jwt || !key.trim()) return;
    let current = true;
    void verifyJwt(jwt, key, keyIsBase64).then((r) => current && setVerify(r));
    return () => {
      current = false;
    };
  }, [jwt, key, keyIsBase64]);

  const status = jwt && now != null ? tokenStatus(jwt.payload, now) : null;
  const claims = jwt ? timeClaims(jwt.payload) : [];
  const payloadEntries =
    jwt && jwt.payload && typeof jwt.payload === 'object' && !Array.isArray(jwt.payload) ? Object.entries(jwt.payload as Record<string, unknown>) : [];

  return (
    <>
      <ToolBar onExample={() => (setToken(EXAMPLE), setKey(EXAMPLE_SECRET), setKeyIsBase64(false))} />
      {!decoded && <StatusLine tone="muted">Paste a JWT (eyJ…), with or without "Bearer ".</StatusLine>}
      {decoded && !decoded.ok && <StatusLine tone="error">{decoded.message}</StatusLine>}
      {jwt && (
        <StatusLine
          tone={status?.state === 'expired' || status?.state === 'not-yet' ? 'warn' : 'ok'}
          action={<span className="text-muted-foreground">alg {String(jwt.header.alg ?? '?')}</span>}
        >
          {status?.state === 'expired' && `Expired ${relative(status.ms!, now!)}`}
          {status?.state === 'not-yet' && `Not valid until ${formatDate(status.ms!)} (${relative(status.ms!, now!)})`}
          {status?.state === 'valid' && `Decoded · valid, expires ${relative(status.ms!, now!)}`}
          {status?.state === 'no-expiry' && 'Decoded · no expiry (exp) set'}
          {!status && 'Decoded'}
        </StatusLine>
      )}

      <div className="tool-panes">
        <Panel title="token">
          <CodeEditor
            value={token}
            onChange={setToken}
            lang={null}
            wrap
            placeholder="Paste a JSON Web Token"
            ariaLabel="JWT"
            className="tool-editor jwt-input"
          />
        </Panel>
        <div className="flex min-w-0 flex-col">
          <Panel title="header" actions={<OutputActions text={jwt ? pretty(jwt.headerText) : ''} fileName="header.json" mime="application/json" />}>
            <CodeEditor value={jwt ? pretty(jwt.headerText) : ''} readOnly lang="c" ariaLabel="JWT header" className="jwt-header" />
          </Panel>
          <Panel
            title="payload"
            className="flex-1 border-t"
            actions={<OutputActions text={jwt ? pretty(jwt.payloadText) : ''} fileName="payload.json" mime="application/json" />}
          >
            <CodeEditor value={jwt ? pretty(jwt.payloadText) : ''} readOnly lang="c" ariaLabel="JWT payload" className="jwt-payload" />
          </Panel>
        </div>
      </div>

      {jwt && (
        <div className="grid border-t lg:grid-cols-2">
          <div className="border-b lg:border-r lg:border-b-0">
            <p className="border-b px-4 py-2 font-mono text-[11.5px] text-faint">claims</p>
            <dl className="divide-y text-[13.5px]" aria-label="Claims">
              {payloadEntries.map(([k, v]) => {
                const time = claims.find((c) => c.claim === k);
                return (
                  <div key={k} className="flex gap-3 px-4 py-2">
                    <dt className="w-36 shrink-0">
                      <span className="font-mono">{k}</span>
                      {CLAIM_NAMES[k] && <span className="block text-[12px] text-muted-foreground">{CLAIM_NAMES[k]}</span>}
                    </dt>
                    <dd className="min-w-0 font-mono break-all">
                      {typeof v === 'string' ? v : JSON.stringify(v)}
                      {time && (
                        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                          <Clock className="size-3" aria-hidden="true" />
                          {formatDate(time.ms)}
                          {now != null && ` · ${relative(time.ms, now)}`}
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div>
            <p className="border-b px-4 py-2 font-mono text-[11.5px] text-faint">verify signature</p>
            <div className="space-y-3 p-4">
              {kind == null ? (
                <p className="text-[13.5px] text-muted-foreground">
                  {jwt.header.alg === 'none' ? 'This token is unsigned (alg "none"): anyone could have made it.' : `Verifying ${JSON.stringify(jwt.header.alg)} isn't supported.`}
                </p>
              ) : (
                <>
                  <Label htmlFor="jwt-key" className="text-[13px] font-normal text-muted-foreground">
                    {kind === 'secret' ? `Secret for ${String(jwt.header.alg)}` : `Public key for ${String(jwt.header.alg)} (PEM or JWK)`}
                  </Label>
                  {kind === 'secret' ? (
                    <input
                      id="jwt-key"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                      placeholder="your-256-bit-secret"
                      className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  ) : (
                    <textarea
                      id="jwt-key"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      spellCheck={false}
                      rows={5}
                      placeholder={'-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----'}
                      className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-[12px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  )}
                  {kind === 'secret' && (
                    <div className="flex items-center gap-2">
                      <Switch id="jwt-b64" size="sm" checked={keyIsBase64} onCheckedChange={setKeyIsBase64} />
                      <Label htmlFor="jwt-b64" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
                        Secret is Base64-encoded
                      </Label>
                    </div>
                  )}
                  <div aria-live="polite" aria-label="Signature status" className="min-h-6 text-[13.5px]">
                    {verify &&
                      (verify.ok ? (
                        <span className={cn('inline-flex items-center gap-1.5 font-medium', verify.valid ? 'text-add' : 'text-del')}>
                          {verify.valid ? <CircleCheck className="size-4" /> : <CircleAlert className="size-4" />}
                          {verify.valid ? 'Signature verified' : 'Invalid signature: wrong key, or the token was changed'}
                        </span>
                      ) : (
                        <span className="text-del">{verify.message}</span>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
