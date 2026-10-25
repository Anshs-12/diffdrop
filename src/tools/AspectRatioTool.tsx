import { useMemo } from 'react';
import { Copy } from 'lucide-react';
import { PRESETS, commonSizes, parseRatio, parseSide, simplify, solve } from '@/lib/aspectRatio';
import { cn } from '@/lib/utils';
import { IconButton, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const field =
  'h-9 w-full min-w-0 rounded-lg border bg-background px-3 font-mono text-[14px] tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-del';

function NumField({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </label>
      <input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} autoComplete="off" className={field} />
      {error && <p className="text-[12px] text-del">{error}</p>}
    </div>
  );
}

const trim = (n: number) => String(Math.round(n * 100) / 100);

export default function AspectRatioTool() {
  const [w, setW] = useSaved('width', '1920');
  const [h, setH] = useSaved('height', '1080');
  const [ratioText, setRatioText] = useSaved('ratio', '16:9');
  const [known, setKnown] = useSaved<'width' | 'height'>('known', 'width', (v) => v === 'width' || v === 'height');
  const [side, setSide] = useSaved('side', '1280');

  const pw = parseSide(w);
  const ph = parseSide(h);
  const simple = typeof pw === 'number' && typeof ph === 'number' ? simplify(pw, ph) : null;
  const ratio = parseRatio(ratioText);
  const sideValue = parseSide(side);
  const solved = ratio && typeof sideValue === 'number' ? solve(ratio, known, sideValue) : null;
  const sizes = useMemo(() => (ratio ? commonSizes(ratio) : []), [ratio?.[0], ratio?.[1]]);

  const setSize = (nw: string, nh: string) => {
    setW(nw);
    setH(nh);
    const a = parseSide(nw);
    const b = parseSide(nh);
    if (typeof a === 'number' && typeof b === 'number') {
      const s = simplify(a, b);
      if (s.ok) setRatioText(`${s.w}:${s.h}`);
    }
  };

  const errorText = (v: number | string) => (typeof v === 'string' && v !== 'empty' ? v : undefined);
  const solvedOther = solved ? String(solved.rounded) : '';
  const resultLine = simple?.ok ? `${simple.w}:${simple.h}` : '';

  return (
    <>
      <ToolBar
        onExample={() => {
          setSize('2560', '1440');
          setKnown('width');
          setSide('1280');
        }}
      />
      <div className="grid md:grid-cols-2">
        <section className="space-y-3 border-b p-4 md:border-r" aria-label="Ratio from a size">
          <h2 className="font-mono text-[12.5px] text-muted-foreground">ratio from width and height</h2>
          <div className="flex gap-3">
            <NumField id="ar-w" label="Width" value={w} onChange={(v) => setSize(v, h)} error={errorText(pw)} />
            <NumField id="ar-h" label="Height" value={h} onChange={(v) => setSize(w, v)} error={errorText(ph)} />
          </div>
          <div className="flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3" aria-live="polite">
            {simple?.ok ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[28px] leading-none font-semibold tabular-nums" aria-label="Simplified ratio">
                    {resultLine}
                  </p>
                  <p className="mt-1.5 font-mono text-[12.5px] text-muted-foreground">
                    {simple.decimal.toFixed(4)}:1{simple.near && <> · close to {simple.near}</>}
                  </p>
                </div>
                <IconButton label="Copy ratio" onClick={() => copyText(resultLine)}>
                  <Copy />
                </IconButton>
              </>
            ) : (
              <p className="text-[13px] text-faint">Enter a width and a height.</p>
            )}
          </div>
        </section>
        <section className="space-y-3 border-b p-4" aria-label="Missing side">
          <h2 className="font-mono text-[12.5px] text-muted-foreground">missing side from a ratio</h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={!!ratio && `${ratio[0]}:${ratio[1]}` === p}
                onClick={() => setRatioText(p)}
                className={cn(
                  'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
                  ratio && `${ratio[0]}:${ratio[1]}` === p ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <NumField id="ar-ratio" label="Ratio (16:9, 1.85:1 or 2.39)" value={ratioText} onChange={setRatioText} error={ratio || !ratioText.trim() ? undefined : 'Write a ratio like 16:9'} />
          <div className="flex gap-3">
            <NumField
              id="ar-sw"
              label="Width"
              value={known === 'width' ? side : solvedOther}
              onChange={(v) => {
                setKnown('width');
                setSide(v);
              }}
              error={known === 'width' ? errorText(sideValue) : undefined}
            />
            <NumField
              id="ar-sh"
              label="Height"
              value={known === 'height' ? side : solvedOther}
              onChange={(v) => {
                setKnown('height');
                setSide(v);
              }}
              error={known === 'height' ? errorText(sideValue) : undefined}
            />
          </div>
          {solved && Math.abs(solved.exact - solved.rounded) > 1e-9 && (
            <p className="font-mono text-[12.5px] text-muted-foreground">Exact: {trim(solved.exact)} px, rounded to {solved.rounded}.</p>
          )}
        </section>
      </div>
      {ratio && (
        <div className="grid md:grid-cols-2">
          <div className="grid place-items-center border-b p-6 md:border-r md:border-b-0">
            <div
              className="grid max-h-[220px] w-full max-w-[320px] place-items-center rounded-lg border-2 border-foreground/70 bg-muted font-mono text-[13px] text-muted-foreground"
              style={{ aspectRatio: `${ratio[0]} / ${ratio[1]}`, width: ratio[0] / ratio[1] < 1.45 ? `${(220 * ratio[0]) / ratio[1]}px` : undefined }}
              aria-label={`Preview of ${ratio[0]}:${ratio[1]}`}
            >
              {ratio[0]}:{ratio[1]}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" aria-label="Common sizes">
              <thead>
                <tr className="border-b text-left font-mono text-[11.5px] text-faint">
                  <th className="px-4 py-2 font-normal">size</th>
                  <th className="px-4 py-2 font-normal">name</th>
                  <th className="px-4 py-2 font-normal">fit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sizes.map((s) => (
                  <tr key={`${s.w}x${s.h}`}>
                    <td className="px-4 py-2 font-mono tabular-nums">
                      {s.w} × {s.h}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{s.label}</td>
                    <td className="px-4 py-2 font-mono text-[12px] text-muted-foreground">{s.exact ? 'exact' : `≈ ${simplifyLabel(s.w, s.h)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function simplifyLabel(w: number, h: number): string {
  const s = simplify(w, h);
  return s.ok ? `${s.w}:${s.h}` : '';
}
