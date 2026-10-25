import { useEffect, useMemo, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FAVICON_FILES, ICO_SIZES, buildIco, faviconHtml, fitBox, halvingSteps, webManifest } from '@/lib/imageMath';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CodeEditor from './CodeEditor';
import { OutputActions, Panel, StatusLine, downloadFile, formatBytes } from './shared';
import ToolBar from './ToolBar';
import { Choice, ImageDrop, blobToDataUrl, canvasOf, ctx2d, decodeImage, drawScaled, encodeCanvas } from './imageShared';
import { useSaved } from './saved';

const MASTER = 512;
const HEX = /^#[0-9a-f]{6}$/i;

interface Source {
  name: string;
  image: CanvasImageSource;
  aspect: number;
}

interface Output {
  name: string;
  size: number;
  blob: Blob;
  url: string;
}

/** Load a PNG, JPG, WebP or SVG. SVG goes through an <img> from a data: URL; scripts never run in images. */
async function loadSource(file: File): Promise<Source> {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    const text = await file.text();
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    try {
      await img.decode();
    } catch {
      throw new Error('This SVG couldn’t be drawn. Check that it opens in a browser and has an xmlns attribute.');
    }
    // An SVG with only a viewBox may report no size; read the shape from the viewBox
    let aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    if ((!img.naturalWidth || !img.naturalHeight) && vb) aspect = Number(vb[1]) / Number(vb[2]) || 1;
    return { name: file.name, image: img, aspect };
  }
  const bmp = await decodeImage(file);
  return { name: file.name, image: bmp, aspect: bmp.width / bmp.height };
}

function roundedRect(ctx: CanvasRenderingContext2D, size: number, radiusPct: number) {
  const r = (size * Math.min(50, Math.max(0, radiusPct))) / 100;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
}

/** The icon at 512 px with background, padding and corners applied. */
function drawMaster(src: Source, opts: { bg: string | null; padding: number; radius: number }): HTMLCanvasElement {
  const canvas = canvasOf(MASTER, MASTER);
  const ctx = ctx2d(canvas);
  if (opts.radius > 0) {
    roundedRect(ctx, MASTER, opts.radius);
    ctx.clip();
  }
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, MASTER, MASTER);
  }
  const box = fitBox(MASTER, opts.padding, src.aspect);
  // Large rasters are halved down first so the master stays smooth
  const img = src.image;
  if (img instanceof ImageBitmap && (img.width > box.w * 2 || img.height > box.h * 2)) {
    const scaled = drawScaled(img, halvingSteps({ w: img.width, h: img.height }, { w: Math.round(box.w), h: Math.round(box.h) }));
    ctx.drawImage(scaled, box.x, box.y, box.w, box.h);
  } else {
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
  }
  return canvas;
}

async function render(master: HTMLCanvasElement, size: number): Promise<Blob> {
  const c = size === MASTER ? master : drawScaled(master, halvingSteps({ w: MASTER, h: MASTER }, { w: size, h: size }));
  return encodeCanvas(c, 'png', 1);
}

/** An example mark drawn on a canvas, so the page needs no network. */
async function sampleLogo(): Promise<File> {
  const c = canvasOf(640, 640);
  const ctx = ctx2d(c);
  const g = ctx.createLinearGradient(0, 0, 640, 640);
  g.addColorStop(0, '#f97316');
  g.addColorStop(1, '#db2777');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(320, 320, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(320, 120);
  ctx.lineTo(500, 470);
  ctx.lineTo(140, 470);
  ctx.closePath();
  ctx.fill();
  const blob = await encodeCanvas(c, 'png', 1);
  return new File([blob], 'example-logo.png', { type: 'image/png' });
}

export default function FaviconTool() {
  const [bgMode, setBgMode] = useSaved<'transparent' | 'color'>('background', 'transparent', (v) => v === 'transparent' || v === 'color');
  const [bgColor, setBgColor] = useSaved('color', '#ffffff', (v) => typeof v === 'string' && HEX.test(v));
  const [padding, setPadding] = useSaved('padding', 0, (v) => typeof v === 'number' && v >= 0 && v <= 30);
  const [radius, setRadius] = useSaved('radius', 0, (v) => typeof v === 'number' && v >= 0 && v <= 50);
  const [appName, setAppName] = useSaved('name', 'My site');
  const [src, setSrc] = useState<Source | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [error, setError] = useState<string | null>(null);

  const open = async (file: File) => {
    try {
      setSrc(await loadSource(file));
      setError(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t read that image');
    }
  };

  useEffect(() => {
    if (!src) {
      setOutputs([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const master = drawMaster(src, { bg: bgMode === 'color' ? bgColor : null, padding, radius });
        const files: Output[] = [];
        const icoPngs: Uint8Array[] = [];
        for (const s of ICO_SIZES) icoPngs.push(new Uint8Array(await (await render(master, s)).arrayBuffer()));
        const ico = new Blob([buildIco(icoPngs) as BlobPart], { type: 'image/x-icon' });
        files.push({ name: 'favicon.ico', size: 48, blob: ico, url: await blobToDataUrl(new Blob([icoPngs[2]! as BlobPart], { type: 'image/png' })) });
        for (const f of FAVICON_FILES) {
          const blob = await render(master, f.size);
          files.push({ name: f.name, size: f.size, blob, url: await blobToDataUrl(blob) });
        }
        if (!cancelled) {
          setOutputs(files);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t make the icons');
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [src, bgMode, bgColor, padding, radius]);

  const html = faviconHtml();
  const manifest = useMemo(() => webManifest({ name: appName, color: bgMode === 'color' ? bgColor : '#ffffff' }), [appName, bgMode, bgColor]);
  const tab = outputs.find((o) => o.name === 'favicon-32x32.png');

  const downloadAll = async () => {
    for (const o of outputs) {
      downloadFile(o.blob, o.name, o.blob.type);
      await new Promise((r) => setTimeout(r, 350));
    }
    downloadFile(manifest, 'site.webmanifest', 'application/manifest+json');
  };

  return (
    <>
      <ToolBar onExample={async () => void open(await sampleLogo())}>
        <Choice
          label="Background"
          value={bgMode}
          onChange={setBgMode}
          options={[
            { value: 'transparent', label: 'Transparent' },
            { value: 'color', label: 'Color' },
          ]}
        />
        {bgMode === 'color' && <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} aria-label="Background color" className="size-8 cursor-pointer rounded border bg-transparent" />}
        <div className="flex items-center gap-2">
          <Label htmlFor="fv-pad" className="text-[13px] font-normal text-muted-foreground">
            Padding
          </Label>
          <input id="fv-pad" type="range" min={0} max={30} value={padding} onChange={(e) => setPadding(Number(e.target.value))} className="w-24 accent-[var(--text)]" />
          <span className="w-8 font-mono text-[12.5px] tabular-nums">{padding}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="fv-rad" className="text-[13px] font-normal text-muted-foreground">
            Corners
          </Label>
          <input id="fv-rad" type="range" min={0} max={50} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-24 accent-[var(--text)]" />
          <span className="w-8 font-mono text-[12.5px] tabular-nums">{radius}%</span>
        </div>
      </ToolBar>
      {error && <StatusLine tone="error">{error}</StatusLine>}
      {!src && (
        <div className="p-4">
          <ImageDrop onFiles={(f) => void open(f[0]!)} accept="image/png,image/jpeg,image/webp,image/svg+xml" hint="PNG, JPG, SVG or WebP · square, 512 px or more works best · stays on your device" />
        </div>
      )}
      {src && (
        <>
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{src.name}</p>
            {bgMode === 'transparent' && <p className="text-[12.5px] text-muted-foreground">iPhones show transparent parts of apple-touch-icon.png as black; pick a background color if that matters.</p>}
            <Button variant="outline" size="sm" onClick={() => void downloadAll()} disabled={!outputs.length}>
              <Download /> Download all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSrc(null)}>
              <Trash2 /> Remove
            </Button>
          </div>
          {tab && (
            <div className="border-b bg-muted px-4 pt-3">
              <div className="inline-flex max-w-full items-center gap-2 rounded-t-lg border border-b-0 bg-background px-3 py-2 text-[13px]">
                <img src={tab.url} alt="" width={16} height={16} className="size-4" />
                <span className="truncate">{appName.trim() || 'My site'}</span>
              </div>
            </div>
          )}
          <ul className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6" aria-label="Icon files">
            {outputs.map((o) => (
              <li key={o.name} className="flex flex-col items-center gap-2 bg-background p-4 text-center" data-file={o.name}>
                <div className="grid h-[136px] w-full place-items-center rounded-lg bg-[repeating-conic-gradient(var(--bg-subtle)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
                  <img src={o.url} alt={o.name} style={{ width: Math.min(o.size, 128), height: Math.min(o.size, 128) }} />
                </div>
                <p className="w-full truncate font-mono text-[12px]" title={o.name}>
                  {o.name}
                </p>
                <p className="font-mono text-[11px] text-faint">
                  {o.name === 'favicon.ico' ? '16, 32, 48 px' : `${o.size} × ${o.size}`} · {formatBytes(o.blob.size)}
                </p>
                <Button variant="outline" size="xs" onClick={() => downloadFile(o.blob, o.name, o.blob.type)} aria-label={`Download ${o.name}`}>
                  <Download /> Download
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="tool-panes border-t">
        <Panel title="html: put in <head>" actions={<OutputActions text={html} fileName="favicon-tags.html" mime="text/html" />}>
          <CodeEditor value={html} readOnly lang="markup" wrap ariaLabel="Link tags" className="tool-editor h-[220px] min-h-[160px]" />
        </Panel>
        <Panel
          title="site.webmanifest"
          actions={
            <>
              <input value={appName} onChange={(e) => setAppName(e.target.value)} aria-label="App name" placeholder="App name" className="mr-1 h-7 w-28 rounded-md border bg-background px-2 text-[12.5px]" />
              <OutputActions text={manifest} fileName="site.webmanifest" mime="application/manifest+json" />
            </>
          }
        >
          <CodeEditor value={manifest} readOnly lang={null} ariaLabel="Web manifest" className="tool-editor h-[220px] min-h-[160px]" />
        </Panel>
      </div>
    </>
  );
}
