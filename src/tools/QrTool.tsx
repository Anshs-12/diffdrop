import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Download } from 'lucide-react';
import { makeQr, qrSvg, QR_TEMPLATES, type Ecc } from '@/lib/qr';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SITE_URL } from '@/site';
import { IconButton, StatusLine, downloadFile } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

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

/** Draw the SVG onto a canvas at `size` pixels and return it as PNG. */
async function renderPng(svg: string, size: number): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG failed'))), 'image/png'));
}

async function downloadPng(svg: string, size: number) {
  downloadFile(await renderPng(svg, size), 'qr-code.png', 'image/png');
}

/** Put the code on the clipboard as a PNG image, to paste into a document or chat. */
async function copyPng(svg: string, size: number) {
  try {
    // The promise goes straight into ClipboardItem so Safari keeps the click's permission
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderPng(svg, size) })]);
    toast.success('Image copied');
  } catch {
    toast.error('This browser can’t copy images; download the PNG instead');
  }
}

const KINDS: Kind[] = ['text', 'wifi', 'email', 'phone'];
const SECURITY = ['WPA', 'WEP', 'nopass'];
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const validNetwork = (v: unknown) => isObject(v) && typeof v.ssid === 'string' && SECURITY.includes(v.security as string) && typeof v.hidden === 'boolean';
const validEmail = (v: unknown) => isObject(v) && typeof v.to === 'string' && typeof v.subject === 'string' && typeof v.body === 'string';
const validHex = (v: unknown) => HEX.test(v as string);

/** "Load example": a guest Wi-Fi code, the kind people print for a café table. */
const EXAMPLE_WIFI = { ssid: 'Cafe Guest', password: 'coffee-and-cake', security: 'WPA' as const, hidden: false };

export default function QrTool() {
  const [kind, setKind] = useSaved<Kind>('kind', 'text', (v) => KINDS.includes(v as Kind));
  const [text, setText] = useSaved('text', `${SITE_URL}/`);
  // The Wi-Fi password stays out of storage and share links; the rest of the network is kept
  const [network, setNetwork] = useSaved('wifi', { ssid: '', security: 'WPA' as 'WPA' | 'WEP' | 'nopass', hidden: false }, validNetwork);
  const [wifiPassword, setWifiPassword] = useState('');
  const wifi = { ...network, password: wifiPassword };
  const setWifi = ({ password, ...rest }: typeof wifi) => (setNetwork(rest), setWifiPassword(password));
  const [email, setEmail] = useSaved('email', { to: '', subject: '', body: '' }, validEmail);
  const [phone, setPhone] = useSaved('phone', '');
  const [ecc, setEcc] = useSaved<Ecc>('ecc', 'M', (v) => ['L', 'M', 'Q', 'H'].includes(v as string));
  const [fg, setFg] = useSaved('fg', '#000000', validHex);
  const [bg, setBg] = useSaved('bg', '#ffffff', validHex);
  const [size, setSize] = useSaved('size', 512, (v) => Number.isInteger(v) && (v as number) >= 128 && (v as number) <= 2048);

  const payload = useMemo(() => {
    if (kind === 'wifi') return network.ssid ? QR_TEMPLATES.wifi(network.ssid, wifiPassword, network.security, network.hidden) : '';
    if (kind === 'email') return email.to ? QR_TEMPLATES.email(email.to, email.subject, email.body) : '';
    if (kind === 'phone') return phone.trim() ? QR_TEMPLATES.phone(phone) : '';
    return text;
  }, [kind, text, network, wifiPassword, email, phone]);

  const qr = useMemo(() => (payload ? makeQr(payload, ecc) : null), [payload, ecc]);
  const colors = { fg: HEX.test(fg) ? fg : '#000000', bg: HEX.test(bg) ? bg : '#ffffff' };
  const svg = qr?.ok ? qrSvg(qr.qr, { margin: 4, ...colors }) : '';

  return (
    <>
      <ToolBar onExample={() => (setKind('wifi'), setWifi(EXAMPLE_WIFI))}>
        <ToggleGroup type="single" variant="outline" size="sm" value={kind} onValueChange={(v) => v && setKind(v as Kind)} aria-label="Content">
          <ToggleGroupItem value="text">Link or text</ToggleGroupItem>
          <ToggleGroupItem value="wifi">Wi-Fi</ToggleGroupItem>
          <ToggleGroupItem value="email">Email</ToggleGroupItem>
          <ToggleGroupItem value="phone">Phone</ToggleGroupItem>
        </ToggleGroup>
      </ToolBar>
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
              <div className="flex items-center gap-2">
                <IconButton label="Copy image" onClick={() => void copyPng(svg, size)}>
                  <Copy />
                </IconButton>
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
