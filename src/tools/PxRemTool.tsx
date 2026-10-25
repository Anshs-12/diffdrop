import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { DEFAULT_PX_REM, REFERENCE_PX, convertText, convertValue, formatNumber, isValidBase, type PxRemDirection, type PxRemOptions } from '@/lib/pxRem';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import OptionSwitch from './OptionSwitch';
import { IconButton, InputActions, OutputActions, Panel, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type Mode = 'single' | 'batch';
type Precision = '2' | '3' | '4' | 'full';
const PRECISIONS: Precision[] = ['2', '3', '4', 'full'];

const EXAMPLE_CSS = `.card {
  padding: 12px 20px;
  margin: 0 auto 32px;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
}

h2 {
  font-size: 28px;
  letter-spacing: -0.5px;
}`;

const field =
  'h-9 rounded-lg border bg-background px-3 font-mono text-[14px] tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-del';

export default function PxRemTool() {
  const [mode, setMode] = useSaved<Mode>('mode', 'single', (v) => v === 'single' || v === 'batch');
  const [direction, setDirection] = useSaved<PxRemDirection>('dir', 'px-rem', (v) => v === 'px-rem' || v === 'rem-px');
  const [base, setBase] = useSaved('base', 16, isValidBase);
  const [precision, setPrecision] = useSaved<Precision>('precision', '4', (v) => PRECISIONS.includes(v as Precision));
  const [keepOnePx, setKeepOnePx] = useSaved('keep1', false, (v) => typeof v === 'boolean');
  const [value, setValue] = useSaved('value', '24');
  const [text, setText] = useSaved('input', '');
  const [baseText, setBaseText] = useState(String(base));
  useEffect(() => setBaseText((t) => (Number(t) === base ? t : String(base))), [base]);

  const baseOk = isValidBase(Number(baseText)) && baseText.trim() !== '';
  const opts = useMemo<PxRemOptions>(
    () => ({ ...DEFAULT_PX_REM, direction, base, precision: precision === 'full' ? null : Number(precision), keepOnePx }),
    [direction, base, precision, keepOnePx],
  );
  const single = convertValue(value, opts);
  const batch = useMemo(() => convertText(text, opts), [text, opts]);
  const from = direction === 'px-rem' ? 'px' : 'rem';
  const to = direction === 'px-rem' ? 'rem' : 'px';

  const flip = () => {
    if (single.ok) setValue(single.value.replace(/(px|rem)$/, ''));
    setDirection(direction === 'px-rem' ? 'rem-px' : 'px-rem');
  };

  return (
    <>
      <ToolBar
        onExample={() => {
          setMode('batch');
          setDirection('px-rem');
          setText(EXAMPLE_CSS);
        }}
      >
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as Mode)} aria-label="Mode">
          <ToggleGroupItem value="single">Single</ToggleGroupItem>
          <ToggleGroupItem value="batch">Batch</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" variant="outline" size="sm" value={direction} onValueChange={(v) => v && setDirection(v as PxRemDirection)} aria-label="Direction">
          <ToggleGroupItem value="px-rem" className="font-mono">
            px → rem
          </ToggleGroupItem>
          <ToggleGroupItem value="rem-px" className="font-mono">
            rem → px
          </ToggleGroupItem>
        </ToggleGroup>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Root
          <input
            value={baseText}
            inputMode="decimal"
            onChange={(e) => {
              setBaseText(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value.trim() && isValidBase(n)) setBase(n);
            }}
            aria-label="Root font size in px"
            aria-invalid={!baseOk}
            className="h-8 w-16 rounded-md border bg-background px-2 font-mono text-[13px] text-foreground aria-invalid:border-del"
          />
          px
        </label>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span id="pxrem-precision">Decimals</span>
          <ToggleGroup type="single" variant="outline" size="sm" value={precision} onValueChange={(v) => v && setPrecision(v as Precision)} aria-labelledby="pxrem-precision">
            {PRECISIONS.map((p) => (
              <ToggleGroupItem key={p} value={p} aria-label={p === 'full' ? 'Full precision' : `${p} decimals`} className="font-mono">
                {p === 'full' ? 'all' : p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {mode === 'batch' && direction === 'px-rem' && (
          <OptionSwitch id="pxrem-keep1" label="Keep 1px" checked={keepOnePx} onChange={setKeepOnePx} title="Leave 1px and -1px alone in CSS, for hairline borders" />
        )}
      </ToolBar>

      {!baseOk ? (
        <StatusLine tone="error">The root font size must be a number above 0 (up to 1000); still using {base}px</StatusLine>
      ) : mode === 'single' ? (
        single.ok === false ? (
          <StatusLine tone="error">{single.error}</StatusLine>
        ) : (
          <StatusLine tone="muted">
            1rem = {formatNumber(base, null)}px at this root size
          </StatusLine>
        )
      ) : batch.error ? (
        <StatusLine tone="error">{batch.error}</StatusLine>
      ) : !text ? (
        <StatusLine tone="muted">Paste values, one per line, or CSS. Only the {from} values change.</StatusLine>
      ) : (
        <StatusLine tone="ok">
          {batch.count.toLocaleString()} value{batch.count === 1 ? '' : 's'} converted to {to}
        </StatusLine>
      )}

      {mode === 'single' ? (
        <section className="border-b p-4" aria-label="Convert one value">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="pxrem-value" className="text-[13px] text-muted-foreground">
                Value in {from}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="pxrem-value"
                  value={value}
                  inputMode="decimal"
                  autoComplete="off"
                  onChange={(e) => setValue(e.target.value)}
                  aria-invalid={single.ok === false}
                  className={`${field} w-40`}
                />
                <span className="font-mono text-[13px] text-faint">{from}</span>
              </div>
            </div>
            <IconButton label="Swap direction" onClick={flip}>
              <ArrowLeftRight />
            </IconButton>
            <div className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-xl border px-4 py-3 sm:w-auto sm:max-w-sm sm:flex-1" aria-live="polite">
              {single.ok ? (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[28px] leading-none font-semibold tabular-nums" aria-label="Result">
                      {single.value}
                    </p>
                    <p className="mt-1.5 font-mono text-[12.5px] text-muted-foreground">
                      {single.from} at {formatNumber(base, null)}px root
                    </p>
                  </div>
                  <OutputActions text={single.value} fileName="converted.txt" mime="text/plain" />
                </>
              ) : (
                <p className="text-[13px] text-faint">Type a number, like 24 or {direction === 'px-rem' ? '24px' : '1.5rem'}.</p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="tool-panes">
          <Panel title={`${from} values or css`} onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.css,.scss,.less,.txt" />}>
            <CodeEditor value={text} onChange={setText} lang="c" placeholder={`One value per line, or paste CSS`} ariaLabel="Values to convert" className="tool-editor" />
          </Panel>
          <Panel title={`${to} values`} actions={<OutputActions text={batch.output} fileName={/[{:;]/.test(text) ? 'converted.css' : 'converted.txt'} mime={/[{:;]/.test(text) ? 'text/css' : 'text/plain'} />}>
            <CodeEditor value={batch.output} readOnly lang="c" ariaLabel="Converted values" className="tool-editor" />
          </Panel>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full max-w-xl text-[13px]" aria-label="Reference table">
          <caption className="px-4 pt-3 pb-1 text-left font-mono text-[12.5px] text-muted-foreground">common sizes at {formatNumber(base, null)}px root</caption>
          <thead>
            <tr className="border-b text-left font-mono text-[11.5px] text-faint">
              <th className="px-4 py-2 font-normal">px</th>
              <th className="px-4 py-2 font-normal">rem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {REFERENCE_PX.map((px) => {
              const rem = `${formatNumber(px / base, opts.precision)}rem`;
              return (
                <tr key={px}>
                  <td className="px-4 py-1.5 font-mono tabular-nums">{px}px</td>
                  <td className="px-4 py-1.5 font-mono tabular-nums">
                    <button type="button" className="hover:underline" onClick={() => copyText(rem, `Copied ${rem}`)} title="Copy">
                      {rem}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
