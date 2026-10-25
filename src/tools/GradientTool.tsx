import { useMemo } from 'react';
import { Copy, Download, Plus, X } from 'lucide-react';
import { gradientCss, type GradientKind, type GradientStop } from '@/lib/color';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { IconButton, copyText, downloadFile } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const PRESETS: { name: string; kind: GradientKind; angle: number; stops: GradientStop[] }[] = [
  { name: 'Sunset', kind: 'linear', angle: 135, stops: [{ color: '#f97316', at: 0 }, { color: '#ec4899', at: 50 }, { color: '#8b5cf6', at: 100 }] },
  { name: 'Ocean', kind: 'linear', angle: 180, stops: [{ color: '#0ea5e9', at: 0 }, { color: '#1e3a8a', at: 100 }] },
  { name: 'Mint', kind: 'linear', angle: 90, stops: [{ color: '#d9f99d', at: 0 }, { color: '#34d399', at: 100 }] },
  { name: 'Glow', kind: 'radial', angle: 0, stops: [{ color: '#fde68a', at: 0 }, { color: '#f59e0b', at: 45 }, { color: '#7c2d12', at: 100 }] },
  { name: 'Wheel', kind: 'conic', angle: 0, stops: [{ color: '#ef4444', at: 0 }, { color: '#eab308', at: 33 }, { color: '#22c55e', at: 66 }, { color: '#ef4444', at: 100 }] },
];

const KINDS: GradientKind[] = ['linear', 'radial', 'conic'];
const HEX = /^#[0-9a-f]{6}$/i;
const validStops = (v: unknown) =>
  Array.isArray(v) &&
  v.length >= 2 &&
  v.length <= 10 &&
  v.every((s) => s && typeof s === 'object' && HEX.test((s as GradientStop).color) && Number.isFinite((s as GradientStop).at) && (s as GradientStop).at >= 0 && (s as GradientStop).at <= 100);

/** "Load example": a softer three-stop linear gradient. */
const EXAMPLE = { kind: 'linear' as const, angle: 120, stops: [{ color: '#a5f3fc', at: 0 }, { color: '#818cf8', at: 55 }, { color: '#f0abfc', at: 100 }] };

export default function GradientTool() {
  const [kind, setKind] = useSaved<GradientKind>('kind', 'linear', (v) => KINDS.includes(v as GradientKind));
  const [angle, setAngle] = useSaved('angle', 135, (v) => Number.isFinite(v) && (v as number) >= 0 && (v as number) <= 360);
  const [stops, setStops] = useSaved<GradientStop[]>('stops', PRESETS[0]!.stops, validStops);

  const css = useMemo(() => gradientCss(kind, angle, stops), [kind, angle, stops]);
  const declaration = `background: ${css};`;
  const stylesheet = `.gradient {\n  ${declaration}\n}\n`;
  const update = (i: number, patch: Partial<GradientStop>) => setStops(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <>
      <ToolBar onExample={() => (setKind(EXAMPLE.kind), setAngle(EXAMPLE.angle), setStops(EXAMPLE.stops))}>
        <ToggleGroup type="single" variant="outline" size="sm" value={kind} onValueChange={(v) => v && setKind(v as GradientKind)} aria-label="Gradient type">
          <ToggleGroupItem value="linear">Linear</ToggleGroupItem>
          <ToggleGroupItem value="radial">Radial</ToggleGroupItem>
          <ToggleGroupItem value="conic">Conic</ToggleGroupItem>
        </ToggleGroup>
        {kind !== 'radial' && (
          <div className="flex items-center gap-2">
            <Label htmlFor="grad-angle" className="text-[13px] font-normal text-muted-foreground">
              Angle
            </Label>
            <input id="grad-angle" type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-32 accent-[var(--text)]" />
            <span className="w-10 font-mono text-[13px]">{angle}°</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              title={p.name}
              aria-label={`Preset ${p.name}`}
              onClick={() => (setKind(p.kind), setAngle(p.angle), setStops(p.stops))}
              className="size-7 rounded-md border"
              style={{ background: gradientCss(p.kind, p.angle, p.stops) }}
            />
          ))}
        </div>
      </ToolBar>

      <div className="h-56 border-b sm:h-72" style={{ background: css }} aria-label="Gradient preview" role="img" />

      <div className="grid md:grid-cols-2">
        <div className="space-y-2 border-b p-4 md:border-r md:border-b-0">
          <p className="font-mono text-[11.5px] text-faint">color stops</p>
          {stops.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={s.color} onChange={(e) => update(i, { color: e.target.value })} aria-label={`Stop ${i + 1} color`} className="size-8 cursor-pointer rounded border bg-transparent" />
              <span className="w-16 font-mono text-[12.5px]">{s.color}</span>
              <input type="range" min={0} max={100} value={s.at} onChange={(e) => update(i, { at: Number(e.target.value) })} aria-label={`Stop ${i + 1} position`} className="flex-1 accent-[var(--text)]" />
              <span className="w-10 text-right font-mono text-[12.5px]">{s.at}%</span>
              <IconButton label={`Remove stop ${i + 1}`} onClick={() => setStops(stops.filter((_, j) => j !== i))} disabled={stops.length <= 2}>
                <X />
              </IconButton>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setStops([...stops, { color: '#ffffff', at: 100 }])} disabled={stops.length >= 10}>
            <Plus /> Add stop
          </Button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11.5px] text-faint">css</p>
            <div className="flex items-center gap-0.5">
              <IconButton label="Copy CSS" onClick={() => copyText(declaration, 'CSS copied')}>
                <Copy />
              </IconButton>
              <IconButton label="Download gradient.css" onClick={() => downloadFile(stylesheet, 'gradient.css', 'text/css;charset=utf-8')}>
                <Download />
              </IconButton>
            </div>
          </div>
          <pre className="mt-2 rounded-lg border bg-background p-3 font-mono text-[13px] break-all whitespace-pre-wrap" aria-label="Gradient CSS">
            {declaration}
          </pre>
        </div>
      </div>
    </>
  );
}
