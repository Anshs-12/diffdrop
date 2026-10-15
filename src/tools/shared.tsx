import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CircleAlert, CircleCheck, Copy, Download, FolderOpen, Trash2 } from 'lucide-react';
import { checkJson, type JsonCheck } from '@/lib/json';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Inputs above this size are parsed after a short pause instead of on every keystroke. */
const LARGE_INPUT = 200_000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type Parsed =
  | { status: 'empty' }
  | { status: 'valid'; value: unknown }
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
      return { status: 'valid', value: JSON.parse(settled) as unknown };
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

function IconButton({
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
export function InputActions({ onLoad, onClear, canClear }: { onLoad: (text: string) => void; onClear: () => void; canClear: boolean }) {
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
        accept=".json,application/json,text/plain"
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

/** Copy and download buttons for an output. */
export function OutputActions({ text, fileName, mime }: { text: string; fileName: string; mime: string }) {
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
          const url = URL.createObjectURL(new Blob([text], { type: mime }));
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
