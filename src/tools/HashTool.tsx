import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { Copy, FileIcon, FolderOpen, Trash2, TriangleAlert } from 'lucide-react';
import { HASH_ALGOS, MAX_HASH_FILE, WEAK_ALGOS, findMatch, formatHash, hashBytes, hmacBytes, normalizeExpected, type HashAlgo, type HashFormat } from '@/lib/hash';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { IconButton, StatusLine, byteLength, copyText, formatBytes } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const EXAMPLE = 'The quick brown fox jumps over the lazy dog';
const FORMATS: HashFormat[] = ['hex', 'HEX', 'base64'];
const FORMAT_LABELS: Record<HashFormat, string> = {
  hex: 'hex',
  HEX: 'HEX',
  base64: 'Base64',
};

type Source = { kind: 'text' } | { kind: 'file'; name: string; size: number; bytes: Uint8Array };
type Hashes = Partial<Record<HashAlgo, Uint8Array>>;

export default function HashTool() {
  const [text, setText] = useSaved('text', '');
  const [format, setFormat] = useSaved<HashFormat>('format', 'hex', (v) => FORMATS.includes(v as HashFormat));
  const [useHmac, setUseHmac] = useSaved('hmac', false);
  const [expected, setExpected] = useSaved('expected', '');
  // The HMAC key is a secret: kept in memory only
  const [key, setKey] = useState('');
  const [source, setSource] = useState<Source>({ kind: 'text' });
  const [hashes, setHashes] = useState<Hashes>({});
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const data = useMemo(() => (source.kind === 'file' ? source.bytes : new TextEncoder().encode(text)), [source, text]);
  const hmac = useHmac && source.kind === 'text' ? key : null;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      const out: Hashes = {};
      try {
        const k = hmac != null ? new TextEncoder().encode(hmac) : null;
        for (const algo of HASH_ALGOS) {
          if (k) {
            if (algo !== 'MD5') out[algo] = await hmacBytes(algo, k, data);
          } else out[algo] = await hashBytes(algo, data);
          if (cancelled) return;
        }
        setHashes(out);
      } catch {
        if (!cancelled) toast.error('Hashing failed in this browser');
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    // Typing in a big text: wait for a pause
    const t = setTimeout(run, data.length > 1_000_000 && source.kind === 'text' ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [data, hmac, source.kind]);

  const openFile = async (f: File) => {
    if (f.size > MAX_HASH_FILE) {
      toast.error(`${f.name} is larger than ${formatBytes(MAX_HASH_FILE)}`);
      return;
    }
    setBusy(true);
    const bytes = new Uint8Array(await f.arrayBuffer());
    setSource({ kind: 'file', name: f.name, size: f.size, bytes });
  };

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  const showing = hmac != null ? HASH_ALGOS.filter((a) => a !== 'MD5') : HASH_ALGOS;
  const match = expected.trim() ? findMatch(expected, hashes) : null;
  const expectedOk = !expected.trim() || normalizeExpected(expected) != null;

  return (
    <>
      <ToolBar
        onExample={() => {
          setSource({ kind: 'text' });
          setText(EXAMPLE);
          setExpected('d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
        }}
      >
        <ToggleGroup type="single" variant="outline" size="sm" value={format} onValueChange={(v) => v && setFormat(v as HashFormat)} aria-label="Output format">
          {FORMATS.map((f) => (
            <ToggleGroupItem key={f} value={f}>
              {FORMAT_LABELS[f]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="hash-hmac" size="sm" checked={useHmac} onCheckedChange={setUseHmac} disabled={source.kind === 'file'} />
          <Label htmlFor="hash-hmac" className="cursor-pointer text-[13px] font-normal text-muted-foreground" title="Keyed hash (HMAC-SHA) of text">
            HMAC
          </Label>
        </div>
        {useHmac && source.kind === 'text' && (
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Secret key"
            aria-label="HMAC key"
            spellCheck={false}
            autoComplete="off"
            className="h-8 w-44 font-mono text-[13px]"
          />
        )}
      </ToolBar>
      <div className="tool-panes">
        <div
          className="relative flex min-w-0 flex-col"
          onDragOverCapture={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
          }}
          onDropCapture={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void openFile(f);
          }}
        >
          {over && (
            <div
              className="pointer-events-none absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-foreground/40 bg-background/80 text-[13px] font-medium"
              aria-hidden="true"
            >
              Drop the file to hash it
            </div>
          )}
          <div className="flex h-11 items-center gap-2 border-b px-3">
            <span className="font-mono text-[12.5px] text-muted-foreground">{source.kind === 'file' ? 'file' : 'text (UTF-8)'}</span>
            <span className="font-mono text-[11.5px] text-faint tabular-nums">{source.kind === 'file' ? formatBytes(source.size) : text && formatBytes(byteLength(text))}</span>
            <div className="ml-auto flex items-center gap-0.5">
              <IconButton label="Hash a file" onClick={() => fileRef.current?.click()}>
                <FolderOpen />
              </IconButton>
              <IconButton label="Clear" onClick={() => (setSource({ kind: 'text' }), setText(''))} disabled={!text && source.kind === 'text'}>
                <Trash2 />
              </IconButton>
              <input
                ref={fileRef}
                type="file"
                hidden
                aria-label="File to hash"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void openFile(f);
                }}
              />
            </div>
          </div>
          {source.kind === 'file' ? (
            <div className="tool-editor grid place-items-center p-6 text-center">
              <div>
                <FileIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 font-medium break-all">{source.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatBytes(source.size)} · read on this device, not uploaded</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setSource({ kind: 'text' })}>
                  Hash text instead
                </Button>
              </div>
            </div>
          ) : (
            <CodeEditor
              value={text}
              onChange={setText}
              lang={null}
              wrap
              placeholder="Type or paste text, or drop a file of any type (up to 200 MB)"
              ariaLabel="Text to hash"
              className="tool-editor"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex h-11 items-center gap-2 border-b px-3">
            <span className="font-mono text-[12.5px] text-muted-foreground">{hmac != null ? 'hmac' : 'hashes'}</span>
            {busy && <span className="font-mono text-[11.5px] text-faint">working…</span>}
          </div>
          <ul className="divide-y" aria-label="Hashes">
            {showing.map((algo) => {
              const h = hashes[algo];
              const value = h ? formatHash(h, format) : '';
              const label = hmac != null ? `HMAC-${algo}` : algo;
              return (
                <li key={algo} className={cn('px-3 py-2.5', match === algo && 'bg-add-bg')}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12.5px] font-medium">{label}</span>
                    {WEAK_ALGOS.has(algo) && hmac == null && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-amber-700 dark:text-amber-400">
                        <TriangleAlert className="size-3" aria-hidden="true" /> not secure for passwords or signatures
                      </span>
                    )}
                    <div className="ml-auto">
                      <IconButton label={`Copy ${label}`} onClick={() => copyText(value, `${label} copied`)} disabled={!value}>
                        <Copy />
                      </IconButton>
                    </div>
                  </div>
                  <output className="mt-1 block font-mono text-[12.5px] break-all text-muted-foreground" aria-label={label}>
                    {value}
                  </output>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto border-t p-3">
            <Label htmlFor="hash-expected" className="mb-2 block font-mono text-[12.5px] font-normal text-muted-foreground">
              compare with expected hash
            </Label>
            <Input
              id="hash-expected"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="Paste a checksum (hex or Base64)"
              spellCheck={false}
              className="font-mono text-[13px]"
            />
          </div>
          {expected.trim() && (
            <StatusLine tone={!expectedOk ? 'error' : match ? 'ok' : 'error'} label="Hash comparison">
              {!expectedOk
                ? 'That doesn’t look like an MD5 or SHA hash (hex or Base64)'
                : match
                  ? `Match: ${hmac != null ? `HMAC-${match}` : match}`
                  : 'No match with any hash above'}
            </StatusLine>
          )}
        </div>
      </div>
    </>
  );
}
