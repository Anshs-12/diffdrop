/** Browser helpers shared by the image tools: file input, decoding, encoding and sample images. */
import { useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { toast } from 'sonner';
import { MIME, type ImageFormat } from '@/lib/imageMath';
import { cn } from '@/lib/utils';

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

/** A row of radio buttons styled like the other tools’ option rows. */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors disabled:opacity-50',
            value === o.value ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A drop zone with a file picker. Only image files under 50 MB get through. */
export function ImageDrop({
  onFiles,
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp',
  hint,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  hint: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const types = accept.split(',').map((t) => t.trim());

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])];
    const ok = files.filter((f) => {
      const typeOk = types.includes(f.type) || (f.type === '' && /\.svg$/i.test(f.name) && types.includes('image/svg+xml'));
      if (!typeOk) toast.error(`${f.name} isn’t a supported image`);
      else if (f.size > MAX_IMAGE_BYTES) toast.error(`${f.name} is larger than 50 MB`);
      return typeOk && f.size <= MAX_IMAGE_BYTES;
    });
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };

  return (
    <div
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors',
        compact ? 'px-4 py-4' : 'px-4 py-10',
        over ? 'border-foreground/50 bg-muted' : 'border-border',
      )}
    >
      <ImageUp className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-[13.5px]">
        Drop {multiple ? 'images' : 'an image'} here, or{' '}
        <button type="button" onClick={() => inputRef.current?.click()} className="font-medium underline underline-offset-4">
          choose {multiple ? 'files' : 'a file'}
        </button>
      </p>
      <p className="font-mono text-[11.5px] text-faint">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        aria-label={multiple ? 'Choose images' : 'Choose an image'}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error('Couldn’t read the file'));
    r.readAsDataURL(blob);
  });
}

export function canvasOf(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser couldn’t create a drawing surface for an image this size');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/** Canvas to file bytes. JPEG has no transparency, so callers fill a background first. */
export function encodeCanvas(canvas: HTMLCanvasElement, format: ImageFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('The browser couldn’t encode this image (it may be too large)'))),
      MIME[format],
      format === 'png' ? undefined : quality,
    );
  });
}

/** Decode an image file, applying its EXIF rotation. */
export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This file couldn’t be read as an image');
  }
}

/** A colorful, photo-like test image drawn on a canvas (no network). */
export function drawSample(w: number, h: number): HTMLCanvasElement {
  const c = canvasOf(w, h);
  const ctx = ctx2d(c);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1e3a8a');
  sky.addColorStop(0.55, '#f97316');
  sky.addColorStop(1, '#fde68a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.5, h * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // Hills
  for (const [color, base, amp] of [['#7c2d12', 0.7, 0.08], ['#431407', 0.82, 0.06]] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * base + Math.sin(x / (w / 7)) * h * amp + Math.sin(x / 37) * 6);
    ctx.lineTo(w, h);
    ctx.fill();
  }
  // Grain, like a real photo, so compression has something to do
  const img = ctx.getImageData(0, 0, w, h);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = ((seed >> 16) % 25) - 12;
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export async function sampleFile(name: string, w: number, h: number, format: ImageFormat, quality = 0.95): Promise<File> {
  const blob = await encodeCanvas(drawSample(w, h), format, quality);
  return new File([blob], name, { type: blob.type });
}

/**
 * Draw `source` through each size in `steps` (from halvingSteps), so big
 * reductions stay smooth. `background` fills the last canvas first (for JPEG).
 */
export function drawScaled(source: CanvasImageSource, steps: { w: number; h: number }[], background?: string): HTMLCanvasElement {
  let current: CanvasImageSource = source;
  let canvas: HTMLCanvasElement | null = null;
  steps.forEach((s, i) => {
    const next = canvasOf(s.w, s.h);
    const ctx = ctx2d(next);
    if (background && i === steps.length - 1) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, s.w, s.h);
    }
    ctx.drawImage(current, 0, 0, s.w, s.h);
    current = next;
    canvas = next;
  });
  if (!canvas) throw new Error('Nothing to draw');
  return canvas;
}
