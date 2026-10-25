import { useMemo } from 'react';
import { ArrowLeftRight, Check, Copy, X } from 'lucide-react';
import { toHex } from '@/lib/color';
import { checkPair, formatRatio, results, suggestText } from '@/lib/contrastCheck';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IconButton, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const field =
  'h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 font-mono text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function ColorField({ id, label, value, onChange, picker }: { id: string; label: string; value: string; onChange: (v: string) => void; picker: string }) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input type="color" value={picker} onChange={(e) => onChange(e.target.value)} aria-label={`Pick the ${label.toLowerCase()}`} className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent" />
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" className={field} />
      </div>
    </div>
  );
}

export default function ContrastTool() {
  const [fg, setFg] = useSaved('text', '#4c4b45');
  const [bg, setBg] = useSaved('background', '#ffffff');
  const pair = useMemo(() => checkPair(fg, bg), [fg, bg]);
  const checks = pair.ok ? results(pair.ratio) : [];
  const suggestions = useMemo(() => {
    if (!pair.ok) return [];
    return [
      { level: 'AA', s: suggestText(pair.fg, pair.bg, 4.5) },
      { level: 'AAA', s: suggestText(pair.fg, pair.bg, 7) },
    ];
  }, [pair]);

  const fgHex = pair.ok ? toHex(pair.fg) : '#000000';
  const bgHex = pair.ok ? toHex(pair.bg) : '#ffffff';

  return (
    <>
      <ToolBar
        onExample={() => {
          setFg('#777777');
          setBg('#ffffff');
        }}
      />
      <div className="flex flex-wrap items-end gap-3 border-b px-4 py-3">
        <ColorField id="ct-fg" label="Text color" value={fg} onChange={setFg} picker={fgHex} />
        <Button
          variant="outline"
          size="icon"
          aria-label="Swap text and background"
          title="Swap"
          onClick={() => {
            setFg(bg);
            setBg(fg);
          }}
        >
          <ArrowLeftRight />
        </Button>
        <ColorField id="ct-bg" label="Background color" value={bg} onChange={setBg} picker={bgHex} />
      </div>
      {!pair.ok && (
        <StatusLine tone="error">
          {pair.which === 'both' ? 'Neither color' : pair.which === 'text' ? 'The text color' : 'The background color'} isn’t a color. Try #1e293b, rgb(30 41 59) or hsl(217 33% 17%).
        </StatusLine>
      )}
      {pair.ok && (
        <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="border-b p-4 md:border-r md:border-b-0">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11.5px] text-faint">contrast ratio</p>
              <IconButton
                label="Copy result"
                onClick={() =>
                  copyText(
                    [`${fgHex} on ${bgHex}: ${formatRatio(pair.ratio)}:1`, ...checks.map((c) => `${c.label} (${c.min}:1): ${c.pass ? 'pass' : 'fail'}`)].join('\n') + '\n',
                  )
                }
              >
                <Copy />
              </IconButton>
            </div>
            <p className="mt-1 text-[44px] leading-none font-semibold tabular-nums" aria-label="Contrast ratio" data-ratio={formatRatio(pair.ratio)}>
              {formatRatio(pair.ratio)}
              <span className="text-[24px] text-muted-foreground">:1</span>
            </p>
            {pair.translucent && <p className="mt-2 text-[12.5px] text-muted-foreground">Transparency is flattened first: the text over the background, the background over white.</p>}
            <ul className="mt-4 divide-y rounded-xl border" aria-label="WCAG results">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-[13.5px]" data-check={c.id} data-pass={c.pass}>
                  <span className="flex-1">{c.label}</span>
                  <span className="font-mono text-[12px] text-faint">{c.min}:1</span>
                  <span className={cn('inline-flex w-16 items-center justify-center gap-1 rounded-md px-2 py-0.5 font-mono text-[12px]', c.pass ? 'bg-add-bg text-add' : 'bg-del-bg text-del')}>
                    {c.pass ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                    {c.pass ? 'Pass' : 'Fail'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 p-4">
            <div className="space-y-3 rounded-xl border p-5" style={{ background: bgHex, color: fgHex }} aria-label="Preview">
              <p className="text-[16px] leading-relaxed">Normal text at 16 px. The quick brown fox jumps over the lazy dog, then reads the fine print.</p>
              <p className="text-[24px] leading-snug">Large text at 24 px</p>
              <p className="text-[18.66px] font-bold">Large bold text at 14 pt</p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="inline-flex h-9 items-center rounded-md border-2 px-3 text-[14px]" style={{ borderColor: fgHex }}>
                  Input border
                </span>
                <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Icon sample">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 3 3 5-6" />
                </svg>
              </div>
            </div>
            {pair.ratio < 7 ? (
              <div className="space-y-2" aria-label="Suggestions">
                <p className="font-mono text-[11.5px] text-faint">nearest passing text color (same hue, lightness changed)</p>
                {suggestions.map(({ level, s }) =>
                  s ? (
                    <div key={level} className="flex flex-wrap items-center gap-3 rounded-xl border p-2.5" data-suggest={level}>
                      <span className="grid h-9 w-14 place-items-center rounded-md border text-[15px] font-semibold" style={{ background: bgHex, color: s.hex }}>
                        Aa
                      </span>
                      <span className="font-mono text-[13.5px]">{s.hex}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">
                        {formatRatio(s.ratio)}:1 · {level}
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        <IconButton label={`Copy ${s.hex}`} onClick={() => copyText(s.hex)}>
                          <Copy />
                        </IconButton>
                        <Button variant="outline" size="xs" onClick={() => setFg(s.hex)}>
                          Use
                        </Button>
                      </span>
                    </div>
                  ) : pair.ratio < (level === 'AA' ? 4.5 : 7) ? (
                    <p key={level} className="text-[13px] text-muted-foreground">
                      No text color reaches {level} on this background; change the background instead.
                    </p>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">This pair passes every level.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
