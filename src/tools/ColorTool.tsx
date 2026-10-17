import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { contrast, formats, harmonies, parseColor, tintsAndShades, toHex, wcagLevel, type Rgba } from '@/lib/color';
import { cn } from '@/lib/utils';
import { IconButton, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

function Swatch({ color, onPick, label }: { color: Rgba; onPick: (hex: string) => void; label?: string }) {
  const hex = toHex(color);
  return (
    <button
      type="button"
      onClick={() => onPick(hex)}
      title={`Use ${hex}`}
      aria-label={`Use ${hex}`}
      className="group flex min-w-0 flex-1 flex-col items-stretch text-left"
    >
      <span className="h-12 rounded-md border transition-transform group-hover:-translate-y-0.5" style={{ background: hex }} />
      <span className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{label ?? hex}</span>
    </button>
  );
}

function ContrastCard({ color, against, name }: { color: Rgba; against: Rgba; name: string }) {
  const ratio = contrast(color, against);
  const level = wcagLevel(ratio);
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3" style={{ background: toHex(against), color: toHex(color) }}>
      <span className="text-[18px] font-semibold">Aa</span>
      <span className="text-[13px]">on {name}</span>
      <span className={cn('ml-auto rounded-md px-2 py-0.5 font-mono text-[12px]', level === 'Fail' ? 'bg-del-bg text-del' : 'bg-add-bg text-add')}>
        {ratio.toFixed(2)}:1 {level}
      </span>
    </div>
  );
}

export default function ColorTool() {
  const [input, setInput] = useState('#3b82f6');
  const color = useMemo(() => parseColor(input), [input]);

  return (
    <>
      <ToolBar onExample={() => setInput('oklch(70% 0.15 160)')}>
        <input
          type="color"
          value={color ? toHex({ ...color, a: 1 }) : '#000000'}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Pick a color"
          className="size-9 cursor-pointer rounded-md border bg-transparent"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Color"
          spellCheck={false}
          autoComplete="off"
          placeholder="#3b82f6, rgb(59 130 246), hsl(217 91% 60%), coral"
          className="h-9 min-w-0 flex-[1_1_260px] rounded-lg border bg-background px-3 font-mono text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </ToolBar>
      {!color && <StatusLine tone="error">That isn't a color. Try #ff7f50, rgb(255 127 80), hsl(16 100% 66%), oklch(…) or a name like coral.</StatusLine>}
      {color && (
        <>
          <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-3 border-b p-4 md:border-r md:border-b-0">
              <div className="h-36 rounded-xl border bg-[repeating-conic-gradient(var(--bg-subtle)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
                <div className="h-full rounded-xl" style={{ background: toHex(color) }} aria-label="Color preview" />
              </div>
              <ContrastCard color={color} against={WHITE} name="white" />
              <ContrastCard color={color} against={BLACK} name="black" />
            </div>
            <dl className="divide-y" aria-label="Formats">
              {formats(color).map((f) => (
                <div key={f.label} className="flex items-center gap-3 px-4 py-2.5">
                  <dt className="w-16 shrink-0 text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0 flex-1 font-mono text-[14px] break-all" data-format={f.label}>
                    {f.value}
                  </dd>
                  <IconButton label={`Copy ${f.label}`} onClick={() => copyText(f.value)}>
                    <Copy />
                  </IconButton>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-5 border-t p-4">
            <div>
              <p className="mb-2 font-mono text-[11.5px] text-faint">tints and shades</p>
              <div className="flex gap-1.5" aria-label="Tints and shades">
                {tintsAndShades(color).map((c, i) => (
                  <Swatch key={i} color={c} onPick={setInput} />
                ))}
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {harmonies(color).map((h) => (
                <div key={h.name}>
                  <p className="mb-2 font-mono text-[11.5px] text-faint">{h.name.toLowerCase()}</p>
                  <div className="flex gap-1.5">
                    {h.colors.map((c, i) => (
                      <Swatch key={i} color={c} onPick={setInput} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
