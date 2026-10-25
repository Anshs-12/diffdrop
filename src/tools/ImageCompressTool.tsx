import { useEffect, useRef, useState } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatOf, outputName, savings, MAX_PIXELS, type ImageFormat } from '@/lib/imageMath';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { IconButton, StatusLine, downloadFile, formatBytes } from './shared';
import ToolBar from './ToolBar';
import { Choice, ImageDrop, blobToDataUrl, canvasOf, ctx2d, decodeImage, encodeCanvas, sampleFile } from './imageShared';
import { useSaved } from './saved';

type FormatChoice = 'auto' | ImageFormat;
const FORMATS: { value: FormatChoice; label: string }[] = [
  { value: 'auto', label: 'Same as original' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
  { value: 'png', label: 'PNG' },
];

interface Item {
  id: number;
  file: File;
  originalUrl: string;
  width: number;
  height: number;
  /** Output for the current options, or why there isn’t one. */
  result: { blob: Blob; url: string; format: ImageFormat; fellBack: boolean } | null;
  error: string | null;
  working: boolean;
  /** The user’s choice to keep the original; null follows the default (keep it when it’s smaller). */
  keep: boolean | null;
}

let nextId = 1;

export default function ImageCompressTool() {
  const [format, setFormat] = useSaved<FormatChoice>('format', 'auto', (v) => FORMATS.some((f) => f.value === v));
  const [quality, setQuality] = useSaved('quality', 75, (v) => typeof v === 'number' && v >= 1 && v <= 100);
  const [items, setItems] = useState<Item[]>([]);
  const bitmaps = useRef(new Map<number, ImageBitmap>());

  const update = (id: number, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const add = async (files: File[]) => {
    for (const file of files) {
      const id = nextId++;
      try {
        const bmp = await decodeImage(file);
        if (bmp.width * bmp.height > MAX_PIXELS) {
          bmp.close();
          throw new Error(`${file.name} is ${Math.round((bmp.width * bmp.height) / 1e6)} megapixels; browsers can’t re-encode images over about 16`);
        }
        bitmaps.current.set(id, bmp);
        const originalUrl = await blobToDataUrl(file);
        setItems((list) => [...list, { id, file, originalUrl, width: bmp.width, height: bmp.height, result: null, error: null, working: true, keep: null }]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${file.name} couldn’t be read`);
      }
    }
  };

  // Re-encode whenever the options or the list of files change
  const ids = items.map((i) => i.id).join(',');
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      for (const it of items) {
        if (cancelled) return;
        const bmp = bitmaps.current.get(it.id);
        if (!bmp) continue;
        const want: ImageFormat = format === 'auto' ? (formatOf(it.file.type) ?? 'png') : format;
        update(it.id, { working: true });
        try {
          const canvas = canvasOf(bmp.width, bmp.height);
          const ctx = ctx2d(canvas);
          if (want === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(bmp, 0, 0);
          const blob = await encodeCanvas(canvas, want, quality / 100);
          const got = formatOf(blob.type) ?? want;
          const url = await blobToDataUrl(blob);
          if (cancelled) return;
          update(it.id, { result: { blob, url, format: got, fellBack: got !== want }, error: null, working: false });
        } catch (e) {
          if (cancelled) return;
          update(it.id, { result: null, error: e instanceof Error ? e.message : 'Couldn’t encode this image', working: false });
        }
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, format, quality]);

  const remove = (id: number) => {
    bitmaps.current.get(id)?.close();
    bitmaps.current.delete(id);
    setItems((list) => list.filter((i) => i.id !== id));
  };
  const clear = () => {
    for (const b of bitmaps.current.values()) b.close();
    bitmaps.current.clear();
    setItems([]);
  };

  const keeps = (it: Item) => (it.keep ?? (it.result ? it.result.blob.size >= it.file.size : false));
  const download = (it: Item) => {
    if (keeps(it) || !it.result) downloadFile(it.file, it.file.name, it.file.type);
    else downloadFile(it.result.blob, outputName(it.file.name, it.result.format), it.result.blob.type);
  };
  const downloadAll = async () => {
    for (const it of items) {
      download(it);
      // Browsers may block a burst of downloads; space them out
      await new Promise((r) => setTimeout(r, 350));
    }
  };

  const done = items.filter((i) => i.result);
  const before = done.reduce((n, i) => n + i.file.size, 0);
  const after = done.reduce((n, i) => n + (keeps(i) ? i.file.size : i.result!.blob.size), 0);
  const anyPng = items.some((i) => (format === 'auto' ? formatOf(i.file.type) ?? 'png' : format) === 'png');
  const fellBack = items.some((i) => i.result?.fellBack);
  const lossy = format !== 'png' && !(format === 'auto' && items.length > 0 && items.every((i) => formatOf(i.file.type) === 'png'));

  return (
    <>
      <ToolBar
        onExample={async () => {
          try {
            await add([await sampleFile('sunset-example.jpg', 1600, 1000, 'jpeg', 0.95)]);
          } catch {
            toast.error('Couldn’t draw the example image');
          }
        }}
      >
        <Choice label="Output format" value={format} onChange={setFormat} options={FORMATS} />
        <div className="flex items-center gap-2">
          <Label htmlFor="ic-quality" className="text-[13px] font-normal text-muted-foreground">
            Quality
          </Label>
          <input
            id="ic-quality"
            type="range"
            min={1}
            max={100}
            value={quality}
            disabled={!lossy}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-28 accent-[var(--text)] disabled:opacity-40"
          />
          <span className="w-9 font-mono text-[12.5px] tabular-nums">{quality}%</span>
        </div>
      </ToolBar>
      {anyPng && (
        <StatusLine tone="warn">PNG is lossless: saving it again keeps every pixel, so it rarely gets much smaller. WebP or JPEG will be far smaller.</StatusLine>
      )}
      {fellBack && <StatusLine tone="warn">This browser can’t write WebP, so those files were saved as PNG.</StatusLine>}
      {format === 'jpeg' && <StatusLine tone="muted">JPEG has no transparency; transparent areas become white.</StatusLine>}
      <div className="p-4">
        <ImageDrop multiple onFiles={(f) => void add(f)} hint="JPG, PNG or WebP · several at once · stays on your device" compact={items.length > 0} />
      </div>
      {items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 border-y px-4 py-2 font-mono text-[12.5px]" aria-label="Total">
            <span>
              {items.length} {items.length === 1 ? 'image' : 'images'}
            </span>
            {done.length > 0 && (
              <span className="text-muted-foreground">
                {formatBytes(before)} → {formatBytes(after)} · {savings(before, after).label}
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void downloadAll()} disabled={!done.length}>
                <Download /> Download all
              </Button>
              <Button variant="ghost" size="sm" onClick={clear}>
                <Trash2 /> Clear
              </Button>
            </div>
          </div>
          <ul className="divide-y" aria-label="Images">
            {items.map((it) => {
              const s = it.result ? savings(it.file.size, it.result.blob.size) : null;
              return (
                <li key={it.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]" data-testid="compressed-item">
                  <figure className="min-w-0">
                    <img src={it.originalUrl} alt={`Original ${it.file.name}`} className="h-40 w-full rounded-lg border bg-muted object-contain" />
                    <figcaption className="mt-1 font-mono text-[11.5px] text-faint">before · {formatBytes(it.file.size)}</figcaption>
                  </figure>
                  <figure className="min-w-0">
                    {it.result ? (
                      <img src={it.result.url} alt={`Compressed ${it.file.name}`} className={cn('h-40 w-full rounded-lg border bg-muted object-contain', it.working && 'opacity-60')} />
                    ) : (
                      <div className="grid h-40 place-items-center rounded-lg border border-dashed text-[13px] text-muted-foreground">{it.error ? 'Failed' : 'Compressing…'}</div>
                    )}
                    <figcaption className="mt-1 font-mono text-[11.5px] text-faint">after{it.result && ` · ${formatBytes(it.result.blob.size)}`}</figcaption>
                  </figure>
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 truncate text-[14px] font-medium" title={it.file.name}>
                        {it.file.name}
                      </p>
                      <IconButton label={`Remove ${it.file.name}`} onClick={() => remove(it.id)}>
                        <X />
                      </IconButton>
                    </div>
                    <p className="font-mono text-[12.5px] text-muted-foreground">
                      {it.width} × {it.height}
                    </p>
                    {it.error && <p className="text-[13px] text-del">{it.error}</p>}
                    {it.result && s && (
                      <>
                        <p className="font-mono text-[13px]" aria-label="Size change">
                          {formatBytes(it.file.size)} → {formatBytes(it.result.blob.size)} ·{' '}
                          <span className={s.bigger ? 'text-del' : 'text-add'} data-percent={s.percent.toFixed(1)}>
                            {s.label}
                          </span>
                        </p>
                        {s.bigger && (
                          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <input type="checkbox" checked={keeps(it)} onChange={(e) => update(it.id, { keep: e.target.checked })} />
                            The new file is bigger; download the original instead
                          </label>
                        )}
                        <Button variant="outline" size="sm" onClick={() => download(it)}>
                          <Download /> {keeps(it) ? 'Download original' : `Download ${it.result.format.toUpperCase()}`}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
