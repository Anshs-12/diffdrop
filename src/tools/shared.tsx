import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CircleAlert, CircleCheck, Copy, Download, FolderOpen, Trash2, TriangleAlert } from 'lucide-react';
import { checkJson, type JsonCheck } from '@/lib/json';
import { parseJson, scanJson, type JsonScan } from '@/lib/jsonValue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Inputs above this size are parsed after a short pause instead of on every keystroke. */
const LARGE_INPUT = 200_000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type Parsed =
  | { status: 'empty' }
  | { status: 'valid'; value: unknown; scan: JsonScan }
  | { status: 'invalid'; check: Extract<JsonCheck, { status: 'invalid' }> };

/** JSON text plus its parsed value (or the error), re-parsed as the text changes. */
export function useJsonInput(initial = '') {
  const [text, setText] = useState(initial);
  const [settled, setSettled] = useState(initial);

  useEffect(() => {
    if (text.length < LARGE_INPUT) {
      setSettled(text);
      return;
    }
    const t = setTimeout(() => setSettled(text), 250);
    return () => clearTimeout(t);
  }, [text]);

  const parsed = useMemo<Parsed>(() => {
    if (!settled.trim()) return { status: 'empty' };
    try {
      const value = parseJson(settled);
      return { status: 'valid', value, scan: scanJson(settled) };
    } catch {
      const check = checkJson(settled);
      return check.status === 'invalid'
        ? { status: 'invalid', check }
        : { status: 'invalid', check: { status: 'invalid', message: 'Invalid JSON', line: null, column: null } };
    }
  }, [settled]);

  return { text, setText, parsed };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** A labelled box holding an editor, with actions in its header. */
export function Panel({
  title,
  meta,
  actions,
  children,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <div className="flex h-11 items-center gap-2 border-b px-3">
        <span className="font-mono text-[12.5px] text-muted-foreground">{title}</span>
        {meta && <span className="font-mono text-[11.5px] text-faint tabular-nums">{meta}</span>}
        <div className="ml-auto flex items-center gap-0.5">{actions}</div>
      </div>
      {children}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Open (or clear) the input; files are read locally. */
export function InputActions({
  onLoad,
  onClear,
  canClear,
  accept = '.json,application/json,text/plain',
}: {
  onLoad: (text: string) => void;
  onClear: () => void;
  canClear: boolean;
  /** File types offered in the picker. */
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <IconButton label="Open a file" onClick={() => inputRef.current?.click()}>
        <FolderOpen />
      </IconButton>
      <IconButton label="Clear" onClick={onClear} disabled={!canClear}>
        <Trash2 />
      </IconButton>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > MAX_FILE_BYTES) {
            toast.error(`${file.name} is larger than 50 MB`);
            return;
          }
          onLoad(await file.text());
        }}
      />
    </>
  );
}

/** Copy and download buttons for an output. `bom` starts the downloaded file with a UTF-8 byte order mark (for Excel). */
export function OutputActions({ text, fileName, mime, bom = false }: { text: string; fileName: string; mime: string; bom?: boolean }) {
  return (
    <>
      <IconButton
        label="Copy"
        disabled={!text}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
          } catch {
            toast.error('Clipboard unavailable');
          }
        }}
      >
        <Copy />
      </IconButton>
      <IconButton
        label={`Download ${fileName}`}
        disabled={!text}
        onClick={() => {
          const url = URL.createObjectURL(new Blob(bom ? ['\uFEFF', text] : [text], { type: `${mime};charset=utf-8` }));
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 0);
        }}
      >
        <Download />
      </IconButton>
    </>
  );
}

/** A one-line status under a tool's options: neutral, success or error, with an optional action. */
export function StatusLine({
  tone,
  children,
  action,
  label = 'Status',
}: {
  tone: 'muted' | 'ok' | 'error' | 'warn';
  children: React.ReactNode;
  action?: React.ReactNode;
  label?: string;
}) {
  const Icon = tone === 'ok' ? CircleCheck : tone === 'error' ? CircleAlert : tone === 'warn' ? TriangleAlert : null;
  const color = { muted: 'text-faint', ok: 'text-add', error: 'text-del', warn: 'text-amber-700 dark:text-amber-400' }[tone];
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 font-mono text-[12.5px]" aria-live="polite" aria-label={label}>
      <span className={cn('inline-flex items-center gap-1.5', color)}>
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
        {children}
      </span>
      {action}
    </div>
  );
}

/** Things about valid JSON that the tools can't keep as written. */
function warnings(scan: JsonScan): string[] {
  const out: string[] = [];
  if (scan.duplicateCount) {
    const d = scan.duplicates[0]!;
    const more = scan.duplicateCount > 1 ? ` (and ${scan.duplicateCount - 1} more)` : '';
    out.push(`Duplicate key ${JSON.stringify(d.key)} at line ${d.line}, column ${d.column}${more}: only the last value is kept`);
  }
  if (scan.reorderedKeys) out.push('Number-like keys ("1", "42") are listed first in their object; browsers always order them that way');
  return out;
}

/** One-line status under the toolbar: valid / empty / the error with its position. */
export function JsonStatusLine({
  parsed,
  onJump,
  validNote,
}: {
  parsed: Parsed;
  onJump?: (line: number, column: number) => void;
  validNote?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 font-mono text-[12.5px]" aria-live="polite" aria-label="JSON status">
      {parsed.status === 'empty' && <span className="text-faint">Paste JSON, open a file, or load the example.</span>}
      {parsed.status === 'valid' && (
        <>
          <span className="inline-flex items-center gap-1.5 text-add">
            <CircleCheck className="size-3.5" aria-hidden="true" /> Valid JSON
          </span>
          {validNote && <span className="text-muted-foreground">{validNote}</span>}
          {warnings(parsed.scan).map((w) => (
            <span key={w} className="inline-flex basis-full items-start gap-1.5 text-amber-700 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {w}
            </span>
          ))}
        </>
      )}
      {parsed.status === 'invalid' && (
        <>
          <span className="inline-flex items-center gap-1.5 text-del">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            {parsed.check.message}
            {parsed.check.line != null && ` at line ${parsed.check.line}, column ${parsed.check.column}`}
          </span>
          {onJump && parsed.check.line != null && (
            <Button variant="outline" size="xs" onClick={() => onJump(parsed.check.line!, parsed.check.column ?? 1)}>
              Go to error
            </Button>
          )}
        </>
      )}
    </div>
  );
}
