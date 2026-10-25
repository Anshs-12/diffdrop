import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileIcon, FolderOpen, Trash2 } from 'lucide-react';
import { bytesToBase64, bytesToText, decodeBase64, encodeText, hexPreview, sniffType } from '@/lib/base64';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { IconButton, OutputActions, Panel, StatusLine, byteLength, formatBytes } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type Mode = 'encode' | 'decode';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const EXAMPLES: Record<Mode, string> = {
  encode: 'Hello, world! Grüße aus Zürich ✓',
  decode: 'eyJ1c2VyIjoiYWRhIiwicm9sZSI6ImFkbWluIiwiZW1vamkiOiLwn5iAIn0=',
};

function downloadBytes(bytes: Uint8Array, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Accepts a file dropped anywhere on its box, like Panel's onFile, but hands
 * over the File itself so binary files are encoded byte for byte.
 */
function FileDrop({ onFile, children }: { onFile: (f: File) => void; children: React.ReactNode }) {
  const [over, setOver] = useState(false);
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  return (
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
        // The file replaces the input; the editor mustn't also insert it
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      {over && (
        <div
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-foreground/40 bg-background/80 text-[13px] font-medium"
          aria-hidden="true"
        >
          Drop the file to open it
        </div>
      )}
      {children}
    </div>
  );
}

export default function Base64Tool() {
  const [mode, setMode] = useSaved<Mode>('mode', 'encode', (v) => v === 'encode' || v === 'decode');
  const [text, setText] = useSaved('text', '');
  const [urlSafe, setUrlSafe] = useSaved('urlSafe', false);
  const [dataUrl, setDataUrl] = useSaved('dataUrl', false);
  /** A binary file being encoded (shown instead of the text editor). */
  const [file, setFile] = useState<{ name: string; type: string; bytes: Uint8Array } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const encoded = useMemo(() => {
    if (mode !== 'encode') return '';
    if (file) {
      const b64 = bytesToBase64(file.bytes, urlSafe && !dataUrl);
      return dataUrl ? `data:${file.type || 'application/octet-stream'};base64,${b64}` : b64;
    }
    return text ? encodeText(text, urlSafe) : '';
  }, [mode, text, file, urlSafe, dataUrl]);

  const decoded = useMemo(() => {
    if (mode !== 'decode' || !text.trim()) return null;
    const r = decodeBase64(text);
    if (!r.ok) return r;
    const asText = bytesToText(r.bytes);
    const type = asText == null ? sniffType(r.bytes) : null;
    return { ok: true as const, bytes: r.bytes, text: asText, type };
  }, [mode, text]);

  const switchMode = (next: Mode) => {
    // Swap: the output becomes the new input, like flipping direction
    const out = mode === 'encode' ? encoded : decoded?.ok && decoded.text != null ? decoded.text : '';
    setMode(next);
    setFile(null);
    setText(file ? '' : out);
  };

  const openFile = async (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      toast.error(`${f.name} is larger than 50 MB`);
      return;
    }
    const bytes = new Uint8Array(await f.arrayBuffer());
    const asText = bytesToText(bytes);
    if (mode === 'decode') {
      setText(asText ?? '');
      if (asText == null) toast.error("That file isn't text, so it can't be Base64; switch to Encode to encode it");
      return;
    }
    // Text files are edited as text; anything else is encoded as bytes
    if (asText != null && !f.type.startsWith('image/')) {
      setFile(null);
      setText(asText);
    } else {
      setFile({ name: f.name, type: f.type || sniffType(bytes)?.mime || '', bytes });
    }
  };

  const status = (() => {
    if (mode === 'encode') {
      if (!encoded) return <StatusLine tone="muted">Type or paste text, open a file, or load the example.</StatusLine>;
      const size = file ? file.bytes.length : byteLength(text);
      return (
        <StatusLine tone="ok">
          Encoded {formatBytes(size)} into {encoded.length.toLocaleString()} characters
        </StatusLine>
      );
    }
    if (!decoded) return <StatusLine tone="muted">Paste Base64 (standard or URL-safe), or load the example.</StatusLine>;
    if (!decoded.ok) {
      return (
        <StatusLine tone="error">
          {decoded.message}
          {decoded.index != null && ` at position ${decoded.index + 1}`}
        </StatusLine>
      );
    }
    return (
      <StatusLine tone="ok">
        Decoded {formatBytes(decoded.bytes.length)}
        {decoded.text != null ? ' of UTF-8 text' : decoded.type ? ` · ${decoded.type.mime} file` : ' of binary data'}
      </StatusLine>
    );
  })();

  const output = (() => {
    if (mode === 'encode') {
      return (
        <Panel
          title="base64"
          meta={encoded ? `${encoded.length.toLocaleString()} chars` : undefined}
          actions={<OutputActions text={encoded} fileName="base64.txt" mime="text/plain" />}
        >
          <CodeEditor value={encoded} readOnly lang={null} wrap ariaLabel="Base64 output" className="tool-editor" />
        </Panel>
      );
    }
    if (decoded?.ok && decoded.text == null) {
      const ext = decoded.type?.ext ?? 'bin';
      const mime = decoded.type?.mime ?? 'application/octet-stream';
      const image = mime.startsWith('image/') && decoded.bytes.length < 5 * 1024 * 1024;
      return (
        <Panel
          title="decoded file"
          meta={formatBytes(decoded.bytes.length)}
          actions={
            <IconButton label={`Download decoded.${ext}`} onClick={() => downloadBytes(decoded.bytes, `decoded.${ext}`, mime)}>
              <Download />
            </IconButton>
          }
        >
          <div className="tool-editor flex flex-col gap-4 overflow-auto p-4">
            {image && (
              <img
                src={`data:${mime};base64,${bytesToBase64(decoded.bytes)}`}
                alt="Decoded image"
                className="max-h-72 max-w-full self-start rounded-lg border bg-[repeating-conic-gradient(var(--bg-subtle)_0_25%,transparent_0_50%)] bg-[length:16px_16px]"
              />
            )}
            <pre className="font-mono text-[12px] leading-5 text-muted-foreground" aria-label="Hex view">
              {hexPreview(decoded.bytes)}
            </pre>
          </div>
        </Panel>
      );
    }
    const out = decoded?.ok ? (decoded.text ?? '') : '';
    return (
      <Panel title="text" actions={<OutputActions text={out} fileName="decoded.txt" mime="text/plain" />}>
        <CodeEditor value={out} readOnly lang={null} wrap ariaLabel="Decoded text" className="tool-editor" />
      </Panel>
    );
  })();

  return (
    <>
      <ToolBar onExample={() => (setFile(null), setText(EXAMPLES[mode]))}>
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && switchMode(v as Mode)} aria-label="Direction">
          <ToggleGroupItem value="encode">Encode</ToggleGroupItem>
          <ToggleGroupItem value="decode">Decode</ToggleGroupItem>
        </ToggleGroup>
        {mode === 'encode' && (
          <div className="flex items-center gap-2">
            <Switch id="url-safe" size="sm" checked={urlSafe} onCheckedChange={setUrlSafe} disabled={dataUrl && !!file} />
            <Label htmlFor="url-safe" className="cursor-pointer text-[13px] font-normal text-muted-foreground" title="Use - and _ instead of + and /, without = padding">
              URL-safe
            </Label>
          </div>
        )}
        {mode === 'encode' && file && (
          <div className="flex items-center gap-2">
            <Switch id="data-url" size="sm" checked={dataUrl} onCheckedChange={setDataUrl} />
            <Label htmlFor="data-url" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
              As data: URL
            </Label>
          </div>
        )}
      </ToolBar>
      {status}
      <div className="tool-panes">
        <FileDrop onFile={(f) => void openFile(f)}>
          <Panel
            title={mode === 'encode' ? 'text' : 'base64'}
            meta={!file && text ? formatBytes(byteLength(text)) : undefined}
            actions={
              <>
                <IconButton label="Open a file" onClick={() => fileRef.current?.click()}>
                  <FolderOpen />
                </IconButton>
                <IconButton label="Clear" onClick={() => (setFile(null), setText(''))} disabled={!text && !file}>
                  <Trash2 />
                </IconButton>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void openFile(f);
                  }}
                />
              </>
            }
          >
            {file ? (
              <div className="tool-editor grid place-items-center p-6 text-center">
                <div>
                  <FileIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 font-medium break-all">{file.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatBytes(file.bytes.length)}
                    {file.type && ` · ${file.type}`}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setFile(null)}>
                    Type text instead
                  </Button>
                </div>
              </div>
            ) : (
              <CodeEditor
                key={mode}
                value={text}
                onChange={setText}
                lang={null}
                wrap
                placeholder={mode === 'encode' ? 'Type or paste text to encode, or open a file' : 'Paste Base64 to decode'}
                ariaLabel={mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}
                className="tool-editor"
              />
            )}
          </Panel>
        </FileDrop>
        {output}
      </div>
    </>
  );
}
