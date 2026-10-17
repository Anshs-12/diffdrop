import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { makeQr, qrSvg, QR_TEMPLATES, type Ecc } from '@/lib/qr';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { StatusLine, downloadFile } from './shared';

type Kind = 'text' | 'wifi' | 'email' | 'phone';

const HEX = /^#[0-9a-f]{6}$/i;
const field =
  'h-9 w-full rounded-lg border bg-background px-3 text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Draw the SVG onto a canvas and save it as PNG. */
async function downloadPng(svg: string, size: number) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  canvas.toBlob((blob) => blob && downloadFile(blob, 'qr-code.png', 'image/png'), 'image/png');
}

export default function QrTool() {
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('https://diffdrop.anshx12.workers.dev/');
  const [wifi, setWifi] = useState({ ssid: '', password: '', security: 'WPA' as 'WPA' | 'WEP' | 'nopass', hidden: false });
  const [email, setEmail] = useState({ to: '', subject: '', body: '' });
  const [phone, setPhone] = useState('');
  const [ecc, setEcc] = useState<Ecc>('M');
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [size, setSize] = useState(512);

  const payload = useMemo(() => {
    if (kind === 'wifi') return wifi.ssid ? QR_TEMPLATES.wifi(wifi.ssid, wifi.password, wifi.security, wifi.hidden) : '';
    if (kind === 'email') return email.to ? QR_TEMPLATES.email(email.to, email.subject, email.body) : '';
    if (kind === 'phone') return phone.trim() ? QR_TEMPLATES.phone(phone) : '';
    return text;
  }, [kind, text, wifi, email, phone]);

  const qr = useMemo(() => (payload ? makeQr(payload, ecc) : null), [payload, ecc]);
  const colors = { fg: HEX.test(fg) ? fg : '#000000', bg: HEX.test(bg) ? bg : '#ffffff' };
  const svg = qr?.ok ? qrSvg(qr.qr, { margin: 4, ...colors }) : '';

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5">
        <ToggleGroup type="single" variant="outline" size="sm" value={kind} onValueChange={(v) => v && setKind(v as Kind)} aria-label="Content">
          <ToggleGroupItem value="text">Link or text</ToggleGroupItem>
          <ToggleGroupItem value="wifi">Wi-Fi</ToggleGroupItem>
          <ToggleGroupItem value="email">Email</ToggleGroupItem>
          <ToggleGroupItem value="phone">Phone</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {!payload && <StatusLine tone="muted">Fill in the details to make a QR code.</StatusLine>}
      {qr && !qr.ok && <StatusLine tone="error">{qr.message}</StatusLine>}
      {qr?.ok && (
        <StatusLine tone="ok">
          {qr.qr.size}×{qr.qr.size} modules · {new TextEncoder().encode(payload).length.toLocaleString()} bytes · error correction {ecc}
        </StatusLine>
      )}

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4 border-b p-4 md:border-r md:border-b-0">
          {kind === 'text' && (
            <Field id="qr-text" label="Link or text">
              <textarea id="qr-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} className={`${field} h-auto py-2 font-mono text-[13px]`} />
            </Field>
          )}
          {kind === 'wifi' && (
            <>
              <Field id="qr-ssid" label="Network name (SSID)">
                <input id="qr-ssid" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} className={field} />
              </Field>
              <Field id="qr-wpass" label="Password">
                <input id="qr-wpass" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} className={field} disabled={wifi.security === 'nopass'} />
              </Field>
              <div className="flex flex-wrap items-center gap-4">
                <ToggleGroup type="single" variant="outline" size="sm" value={wifi.security} onValueChange={(v) => v && setWifi({ ...wifi, security: v as 'WPA' })} aria-label="Security">
                  <ToggleGroupItem value="WPA">WPA/WPA2/WPA3</ToggleGroupItem>
                  <ToggleGroupItem value="WEP">WEP</ToggleGroupItem>
                  <ToggleGroupItem value="nopass">None</ToggleGroupItem>
                </ToggleGroup>
                <div className="flex items-center gap-2">
                  <Switch id="qr-hidden" size="sm" checked={wifi.hidden} onCheckedChange={(v) => setWifi({ ...wifi, hidden: v })} />
                  <Label htmlFor="qr-hidden" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
                    Hidden network
                  </Label>
                </div>
              </div>
            </>
          )}
          {kind === 'email' && (
            <>
              <Field id="qr-to" label="Email address">
                <input id="qr-to" type="email" value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} className={field} />
              </Field>
              <Field id="qr-subject" label="Subject (optional)">
                <input id="qr-subject" value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} className={field} />
              </Field>
              <Field id="qr-body" label="Message (optional)">
                <textarea id="qr-body" value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} rows={3} className={`${field} h-auto py-2`} />
              </Field>
            </>
          )}
          {kind === 'phone' && (
            <Field id="qr-phone" label="Phone number (with country code)">
              <input id="qr-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 010 9999" className={field} />
            </Field>
          )}

          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <ToggleGroup type="single" variant="outline" size="sm" value={ecc} onValueChange={(v) => v && setEcc(v as Ecc)} aria-label="Error correction">
                {(['L', 'M', 'Q', 'H'] as const).map((l) => (
                  <ToggleGroupItem key={l} value={l} title={{ L: '7% recovery', M: '15% recovery', Q: '25% recovery', H: '30% recovery' }[l]}>
                    {l}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <input type="color" value={colors.fg} onChange={(e) => setFg(e.target.value)} aria-label="Foreground color" className="size-8 cursor-pointer rounded border bg-transparent" />
                Code
              </label>
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <input type="color" value={colors.bg} onChange={(e) => setBg(e.target.value)} aria-label="Background color" className="size-8 cursor-pointer rounded border bg-transparent" />
                Background
              </label>
            </div>
            <Label htmlFor="qr-size" className="flex justify-between text-[13px] font-normal text-muted-foreground">
              PNG size <span className="font-mono">{size}px</span>
            </Label>
            <input id="qr-size" type="range" min={128} max={2048} step={64} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-[var(--text)]" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 p-6">
          {svg ? (
            <>
              <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="QR code" className="aspect-square w-full max-w-[300px] rounded-lg border" style={{ imageRendering: 'pixelated' }} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void downloadPng(svg, size)}>
                  <Download /> PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile(svg, 'qr-code.svg', 'image/svg+xml')}>
                  <Download /> SVG
                </Button>
              </div>
            </>
          ) : (
            <div className="grid aspect-square w-full max-w-[300px] place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">QR code</div>
          )}
        </div>
      </div>
    </>
  );
}
