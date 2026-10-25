import { useEffect, useRef, useState } from 'react';
import { Download, Link2, Link2Off, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatOf, halvingSteps, lockedSide, outputName, targetSize, type ImageFormat } from '@/lib/imageMath';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { StatusLine, downloadFile, formatBytes } from './shared';
import ToolBar from './ToolBar';
import { Choice, ImageDrop, blobToDataUrl, decodeImage, drawScaled, encodeCanvas, sampleFile } from './imageShared';
import { useSaved } from './saved';

type FormatChoice = 'auto' | ImageFormat;
const FORMATS: { value: FormatChoice; label: string }[] = [
  { value: 'auto', label: 'Same as original' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
];

const field =
  'h-9 w-full min-w-0 rounded-lg border bg-background px-3 font-mono text-[14px] tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

interface Source {
  file: File;
  url: string;
  w: number;
  h: number;
}

export default function ImageResizeTool() {
  const [unit, setUnit] = useSaved<'px' | 'percent'>('unit', 'px', (v) => v === 'px' || v === 'percent');
  const [percent, setPercent] = useSaved('percent', '50');
  const [lock, setLock] = useSaved('lock', true);
  const [format, setFormat] = useSaved<FormatChoice>('format', 'auto', (v) => FORMATS.some((f) => f.value === v));
  const [quality, setQuality] = useSaved('quality', 85, (v) => typeof v === 'number' && v >= 1 && v <= 100);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [src, setSrc] = useState<Source | null>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const [out, setOut] = useState<{ blob: Blob; url: string; w: number; h: number; format: ImageFormat } | { error: string } | null>(null);
  const [working, setWorking] = useState(false);

  const open = async (file: File) => {
    try {
      const bmp = await decodeImage(file);
      bitmap.current?.close();
      bitmap.current = bmp;
      setSrc({ file, url: await blobToDataUrl(file), w: bmp.width, h: bmp.height });
      setWidth(String(Math.round(bmp.width / 2)));
      setHeight(String(Math.round(bmp.height / 2)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t read that image');
    }
  };

  const want: ImageFormat = format === 'auto' ? (src ? formatOf(src.file.type) ?? 'png' : 'png') : format;
  const size = src ? targetSize(src, { unit, width: Number(width), height: Number(height), percent: Number(percent) }) : null;
  const key = size?.ok ? `${size.w}x${size.h}` : '';

  useEffect(() => {
    if (!src || !size?.ok || !bitmap.current) {
      setOut(size && !size.ok ? { error: size.message } : null);
      return;
    }
    let cancelled = false;
    setWorking(true);
    const t = setTimeout(async () => {
      try {
        const canvas = drawScaled(bitmap.current!, halvingSteps(src, size), want === 'jpeg' ? '#ffffff' : undefined);
        const blob = await encodeCanvas(canvas, want, quality / 100);
        const url = await blobToDataUrl(blob);
        if (!cancelled) setOut({ blob, url, w: size.w, h: size.h, format: formatOf(blob.type) ?? want });
      } catch (e) {
        if (!cancelled) setOut({ error: e instanceof Error ? e.message : 'Couldn’t resize this image' });
      } finally {
        if (!cancelled) setWorking(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, key, want, quality]);

  const onWidth = (v: string) => {
    setWidth(v);
    if (lock && src) setHeight(String(lockedSide(src, 'width', Number(v)) || ''));
  };
  const onHeight = (v: string) => {
    setHeight(v);
    if (lock && src) setWidth(String(lockedSide(src, 'height', Number(v)) || ''));
  };

  const result = out && 'blob' in out ? out : null;

  return (
    <>
      <ToolBar
        onExample={async () => {
          try {
            await open(await sampleFile('sunset-example.png', 2400, 1600, 'png'));
          } catch {
            toast.error('Couldn’t draw the example image');
          }
        }}
      >
        <Choice
          label="Size in"
          value={unit}
          onChange={setUnit}
          options={[
            { value: 'px', label: 'Pixels' },
            { value: 'percent', label: 'Percent' },
          ]}
        />
        <Choice label="Output format" value={format} onChange={setFormat} options={FORMATS} />
        <div className="flex items-center gap-2">
          <Label htmlFor="ir-quality" className="text-[13px] font-normal text-muted-foreground">
            Quality
          </Label>
          <input
            id="ir-quality"
            type="range"
            min={1}
            max={100}
            value={quality}
            disabled={want === 'png'}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-24 accent-[var(--text)] disabled:opacity-40"
          />
          <span className="w-9 font-mono text-[12.5px] tabular-nums">{quality}%</span>
        </div>
      </ToolBar>
      {!src && (
        <div className="p-4">
          <ImageDrop onFiles={(f) => void open(f[0]!)} hint="JPG, PNG or WebP · stays on your device" />
        </div>
      )}
      {src && (
        <>
          {out && 'error' in out ? (
            <StatusLine tone="error">{out.error}</StatusLine>
          ) : (
            <StatusLine tone="muted">
              {src.w} × {src.h} → {size?.ok ? `${size.w} × ${size.h}` : '…'}
              {result && ` · ${formatBytes(src.file.size)} → ${formatBytes(result.blob.size)}`}
              {working && ' · resizing…'}
            </StatusLine>
          )}
          <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-4 border-b p-4 md:border-r md:border-b-0">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[14px] font-medium" title={src.file.name}>
                  {src.file.name}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    bitmap.current?.close();
                    bitmap.current = null;
                    setSrc(null);
                    setOut(null);
                  }}
                >
                  <Trash2 /> Remove
                </Button>
              </div>
              {unit === 'px' ? (
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor="ir-w" className="text-[13px] font-normal text-muted-foreground">
                      Width (px)
                    </Label>
                    <input id="ir-w" inputMode="numeric" value={width} onChange={(e) => onWidth(e.target.value)} className={field} />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-pressed={lock}
                    aria-label={lock ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                    title={lock ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                    onClick={() => {
                      const next = !lock;
                      setLock(next);
                      if (next) setHeight(String(lockedSide(src, 'width', Number(width)) || ''));
                    }}
                    className={cn(lock && 'border-foreground')}
                  >
                    {lock ? <Link2 /> : <Link2Off />}
                  </Button>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor="ir-h" className="text-[13px] font-normal text-muted-foreground">
                      Height (px)
                    </Label>
                    <input id="ir-h" inputMode="numeric" value={height} onChange={(e) => onHeight(e.target.value)} className={field} />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="ir-pct" className="text-[13px] font-normal text-muted-foreground">
                    Scale (%)
                  </Label>
                  <input id="ir-pct" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} className={field} />
                  <p className="text-[12.5px] text-faint">Percent keeps the original shape.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {[25, 50, 75, 200].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      if (unit === 'percent') setPercent(String(p));
                      else {
                        setWidth(String(Math.round((src.w * p) / 100)));
                        setHeight(String(Math.round((src.h * p) / 100)));
                      }
                    }}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
              <figure>
                <img src={src.url} alt="Original" className="h-40 w-full rounded-lg border bg-muted object-contain" />
                <figcaption className="mt-1 font-mono text-[11.5px] text-faint">
                  original · {src.w} × {src.h} · {formatBytes(src.file.size)}
                </figcaption>
              </figure>
            </div>
            <div className="flex flex-col gap-3 p-4">
              {result ? (
                <>
                  <img src={result.url} alt="Resized" className={cn('max-h-[420px] w-full rounded-lg border bg-muted object-contain', working && 'opacity-60')} />
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-mono text-[13px]" aria-label="Resized image">
                      {result.w} × {result.h} · {formatBytes(result.blob.size)} · {result.format.toUpperCase()}
                    </p>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => downloadFile(result.blob, outputName(src.file.name, result.format, `-${result.w}x${result.h}`), result.blob.type)}>
                      <Download /> Download
                    </Button>
                  </div>
                  {want === 'webp' && result.format !== 'webp' && <p className="text-[13px] text-muted-foreground">This browser can’t write WebP, so it was saved as PNG.</p>}
                  {size?.ok && (size.w > src.w || size.h > src.h) && <p className="text-[13px] text-muted-foreground">Enlarging can’t add detail, so the result will look softer than the original.</p>}
                </>
              ) : (
                <div className="grid h-60 place-items-center rounded-lg border border-dashed text-[13px] text-muted-foreground">{working ? 'Resizing…' : 'Set a size'}</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
