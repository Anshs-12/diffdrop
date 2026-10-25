import { useMemo } from 'react';
import { parseColor, toHex, type Rgba } from '@/lib/color';
import { EXPORT_FORMATS, PALETTE_IDS, exportPalette, palettes, toOklch, type ExportFormat, type PaletteId } from '@/lib/palette';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import CodeEditor from './CodeEditor';
import { OutputActions, Panel, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { Choice } from './imageShared';
import { useSaved } from './saved';

const field =
  'h-9 rounded-lg border bg-background px-3 font-mono text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** Black or white, whichever reads better on the swatch. */
function inkFor(c: Rgba): string {
  return toOklch(c).l > 0.62 ? '#141413' : '#ffffff';
}

function Swatch({ color, label, base }: { color: Rgba; label: string; base?: boolean }) {
  const hex = toHex(color);
  return (
    <button
      type="button"
      onClick={() => copyText(hex, `Copied ${hex}`)}
      title={`Copy ${hex}`}
      aria-label={`Copy ${hex}`}
      data-hex={hex}
      className="group flex min-w-0 flex-1 flex-col items-stretch text-left"
    >
      <span
        className="flex h-14 items-end justify-between rounded-md border px-1.5 pb-1 font-mono text-[10.5px] transition-transform group-hover:-translate-y-0.5"
        style={{ background: hex, color: inkFor(color) }}
      >
        <span>{label}</span>
        {base && <span aria-label="your color">●</span>}
      </span>
      <span className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{hex}</span>
    </button>
  );
}

export default function PaletteTool() {
  const [input, setInput] = useSaved('color', '#3b82f6');
  const [name, setName] = useSaved('name', 'brand');
  const [which, setWhich] = useSaved<PaletteId>('palette', 'scale', (v) => PALETTE_IDS.includes(v as PaletteId));
  const [format, setFormat] = useSaved<ExportFormat>('format', 'css', (v) => EXPORT_FORMATS.some((f) => f.id === v));

  const color = useMemo(() => parseColor(input), [input]);
  const all = useMemo(() => (color ? palettes({ ...color, a: 1 }) : []), [color]);
  const baseHex = color ? toHex({ ...color, a: 1 }) : '';
  const chosen = all.find((p) => p.id === which) ?? all[0];
  const output = chosen ? exportPalette(chosen, format, name) : '';
  const gray = color ? toOklch(color).c < 0.02 : false;

  return (
    <>
      <ToolBar onExample={() => setInput('#e8590c')}>
        <input
          type="color"
          value={baseHex || '#000000'}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Pick a base color"
          className="size-9 cursor-pointer rounded-md border bg-transparent"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Base color"
          spellCheck={false}
          autoComplete="off"
          placeholder="#3b82f6, rgb(), hsl(), oklch() or a name"
          className={cn(field, 'min-w-0 flex-[1_1_220px]')}
        />
      </ToolBar>
      {!color && <StatusLine tone="error">That isn’t a color. Try #3b82f6, rgb(59 130 246), hsl(217 91% 60%) or a name like coral.</StatusLine>}
      {color && (
        <StatusLine tone="muted">
          {gray
            ? 'This color has almost no hue, so the hue-based palettes come out as grays. Click any swatch to copy it.'
            : `Built in OKLCH from ${baseHex}${color.a < 1 ? ' (transparency ignored)' : ''}. Click any swatch to copy its hex.`}
        </StatusLine>
      )}
      {color && (
        <>
          <div className="space-y-5 p-4" aria-label="Palettes">
            {all.map((p) => (
              <section key={p.id} aria-label={p.name}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                  <h2 className="font-mono text-[12.5px] text-muted-foreground">{p.name.toLowerCase()}</h2>
                  <p className="text-[12.5px] text-faint">{p.note}</p>
                </div>
                <div className={cn('grid gap-1.5', p.id === 'scale' ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-11' : 'grid-cols-[repeat(auto-fit,minmax(64px,1fr))] sm:max-w-[640px]')}>
                  {p.colors.map((c, i) => (
                    <Swatch key={i} color={c} label={p.id === 'scale' ? p.keys[i]! : ''} base={toHex(c) === baseHex} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="border-t">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5">
              <label className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">Export</span>
                <select
                  value={which}
                  onChange={(e) => setWhich(e.target.value as PaletteId)}
                  aria-label="Palette to export"
                  className="h-8 rounded-md border bg-background px-2 font-mono text-[12.5px]"
                >
                  {all.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <Choice label="Export format" value={format} onChange={setFormat} options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label }))} />
              <div className="flex items-center gap-2">
                <Label htmlFor="pal-name" className="text-[13px] font-normal text-muted-foreground">
                  Name
                </Label>
                <input id="pal-name" value={name} onChange={(e) => setName(e.target.value)} spellCheck={false} className={cn(field, 'h-8 w-32 text-[13px]')} />
              </div>
            </div>
            <Panel
              title={EXPORT_FORMATS.find((f) => f.id === format)!.label.toLowerCase()}
              actions={
                <OutputActions
                  text={output}
                  fileName={format === 'hex' ? 'palette.txt' : format === 'tailwind3' ? 'tailwind.colors.js' : 'palette.css'}
                  mime={format === 'tailwind3' ? 'text/javascript' : format === 'hex' ? 'text/plain' : 'text/css'}
                />
              }
            >
              <CodeEditor value={output} readOnly lang={format === 'tailwind3' ? 'c' : null} ariaLabel="Exported palette" className="tool-editor h-[300px] min-h-[180px]" />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
