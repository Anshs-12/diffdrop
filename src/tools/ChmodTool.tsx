import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import {
  PERMS,
  PRESETS,
  WHO,
  explain,
  modeFromNumber,
  modeToNumber,
  parseOctal,
  parseSymbolic,
  shellQuote,
  toChmodSymbolic,
  toOctal,
  toSymbolic,
  type Mode,
  type Perm,
  type Who,
} from '@/lib/chmod';
import { cn } from '@/lib/utils';
import { IconButton, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const inputClass =
  'h-9 min-w-0 rounded-lg border bg-background px-3 font-mono text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[invalid=true]:border-del';

const WHO_LABEL: Record<Who, string> = { owner: 'Owner (u)', group: 'Group (g)', others: 'Others (o)' };
const PERM_LABEL: Record<Perm, string> = { read: 'Read', write: 'Write', execute: 'Execute' };
const SPECIAL: { key: 'setuid' | 'setgid' | 'sticky'; label: string; hint: string }[] = [
  { key: 'setuid', label: 'Setuid', hint: '4000' },
  { key: 'setgid', label: 'Setgid', hint: '2000' },
  { key: 'sticky', label: 'Sticky', hint: '1000' },
];

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="size-[18px] cursor-pointer accent-[var(--text)]"
    />
  );
}

function CommandRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-20 shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 font-mono text-[14px] break-all" data-command={label}>
        {value}
      </code>
      <IconButton label={`Copy ${label} command`} onClick={() => copyText(value)}>
        <Copy />
      </IconButton>
    </div>
  );
}

export default function ChmodTool() {
  const [n, setN] = useSaved<number>('mode', 0o644, (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0o7777);
  const [file, setFile] = useSaved('file', 'file');
  const mode = useMemo(() => modeFromNumber(n), [n]);
  const [octalText, setOctalText] = useState(() => toOctal(mode));
  const [symText, setSymText] = useState(() => toSymbolic(mode));
  const octal = parseOctal(octalText);
  const sym = parseSymbolic(symText);

  // Keep the text boxes in step when the mode changes elsewhere, without rewriting what's being typed
  useEffect(() => {
    const o = parseOctal(octalText);
    if (!o.ok || modeToNumber(o.mode) !== n) setOctalText(toOctal(mode));
    const s = parseSymbolic(symText);
    if (!s.ok || modeToNumber(s.mode) !== n) setSymText(toSymbolic(mode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const update = (patch: (m: Mode) => Mode) => setN(modeToNumber(patch(structuredClone(mode))));
  const name = shellQuote(file.trim());
  const commands = { octal: `chmod ${toOctal(mode)} ${name}`, symbolic: `chmod ${toChmodSymbolic(mode)} ${name}` };
  const lines = explain(mode);
  const warning = lines.find((l) => l.startsWith('Warning'));

  return (
    <>
      <ToolBar onExample={() => { setN(0o755); setFile('deploy.sh'); }}>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Octal
          <input
            value={octalText}
            onChange={(e) => {
              setOctalText(e.target.value);
              const r = parseOctal(e.target.value);
              if (r.ok) setN(modeToNumber(r.mode));
            }}
            aria-label="Octal mode"
            aria-invalid={!octal.ok}
            spellCheck={false}
            autoComplete="off"
            inputMode="numeric"
            className={cn(inputClass, 'w-24')}
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Symbolic
          <input
            value={symText}
            onChange={(e) => {
              setSymText(e.target.value);
              const r = parseSymbolic(e.target.value);
              if (r.ok) setN(modeToNumber(r.mode));
            }}
            aria-label="Symbolic mode"
            aria-invalid={!sym.ok}
            spellCheck={false}
            autoComplete="off"
            className={cn(inputClass, 'w-36')}
          />
        </label>
      </ToolBar>
      <div className="flex flex-wrap gap-1.5 border-b px-3 py-2.5" aria-label="Presets">
        {PRESETS.map((p) => {
          const active = toOctal(mode) === p.octal;
          return (
            <button
              key={p.octal}
              type="button"
              aria-pressed={active}
              onClick={() => setN(parseInt(p.octal, 8))}
              className={cn(
                'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
                active ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {p.octal} <span className="opacity-70">{p.label}</span>
            </button>
          );
        })}
      </div>
      {!octal.ok && <StatusLine tone="error">{octal.error}</StatusLine>}
      {!sym.ok && <StatusLine tone="error">{sym.error}</StatusLine>}
      {octal.ok && sym.ok && warning && <StatusLine tone="warn">{toOctal(mode).endsWith('777') ? '777 lets every user on the system change, replace or delete the contents of this file. Use it only if you really mean that.' : 'Others can write to this file: anyone on the system can change it.'}</StatusLine>}

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="border-b p-4 md:border-r md:border-b-0">
          <table className="w-full text-[13.5px]" aria-label="Permissions">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1.5 font-normal" />
                {PERMS.map((p) => (
                  <th key={p} className="py-1.5 text-center font-normal">
                    {PERM_LABEL[p]}
                  </th>
                ))}
                <th className="py-1.5 text-right font-mono font-normal">#</th>
              </tr>
            </thead>
            <tbody>
              {WHO.map((who) => {
                const t = mode[who];
                return (
                  <tr key={who} className="border-t">
                    <th scope="row" className="py-2.5 text-left font-normal">
                      {WHO_LABEL[who]}
                    </th>
                    {PERMS.map((p) => (
                      <td key={p} className="py-2.5 text-center">
                        <Check checked={t[p]} label={`${WHO_LABEL[who]} ${p}`} onChange={(v) => update((m) => ({ ...m, [who]: { ...m[who], [p]: v } }))} />
                      </td>
                    ))}
                    <td className="py-2.5 text-right font-mono text-muted-foreground">{(t.read ? 4 : 0) + (t.write ? 2 : 0) + (t.execute ? 1 : 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3">
            {SPECIAL.map((s) => (
              <label key={s.key} className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                <Check checked={mode[s.key]} label={s.label} onChange={(v) => update((m) => ({ ...m, [s.key]: v }))} />
                {s.label} <span className="font-mono text-[11.5px] text-faint">{s.hint}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 flex items-baseline gap-4">
            <output className="font-mono text-[28px] font-semibold tabular-nums" aria-label="Octal result">
              {toOctal(mode)}
            </output>
            <output className="font-mono text-[18px] text-muted-foreground" aria-label="Symbolic result">
              {toSymbolic(mode)}
            </output>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3 border-b px-4 py-2.5">
            <label htmlFor="chmod-file" className="w-20 shrink-0 text-[13px] text-muted-foreground">
              File name
            </label>
            <input id="chmod-file" value={file} onChange={(e) => setFile(e.target.value)} spellCheck={false} autoComplete="off" className={cn(inputClass, 'h-8 flex-1')} />
          </div>
          <div className="divide-y border-b">
            <CommandRow label="Octal" value={commands.octal} />
            <CommandRow label="Symbolic" value={commands.symbolic} />
          </div>
          <div className="px-4 py-3">
            <p className="mb-2 font-mono text-[11.5px] text-faint">what this allows</p>
            <ul className="space-y-1.5 text-[13.5px] leading-relaxed" aria-label="Explanation">
              {lines.filter((l) => l !== warning).map((l) => (
                <li key={l} className={cn(l.startsWith('On a directory') && 'text-muted-foreground')}>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
