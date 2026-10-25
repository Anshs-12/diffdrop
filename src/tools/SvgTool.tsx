import { useEffect, useMemo, useState } from 'react';
import { describeReport, optimizeSvg } from '@/lib/svgOptimize';
import { savings } from '@/lib/imageMath';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine, byteLength, formatBytes } from './shared';
import ToolBar from './ToolBar';
import { Choice } from './imageShared';
import { useSaved } from './saved';

const EXAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape (http://www.inkscape.org/) -->
<svg
   width="64"
   height="64"
   viewBox="0 0 64 64"
   version="1.1"
   id="svg5"
   xml:space="preserve"
   inkscape:version="1.3 (0e150ed6c4, 2023-07-21)"
   sodipodi:docname="badge.svg"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview
     id="namedview7"
     pagecolor="#ffffff"
     inkscape:zoom="8.0000001"
     inkscape:current-layer="layer1" /><defs
     id="defs2" /><title>Check badge</title><metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description /></rdf:RDF>
  </metadata><g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1"
     opacity="1"><circle
       style="fill:#16a34a"
       cx="32.000000"
       cy="32.000000"
       r="28.499998"
       id="path1" /><path
       d="M 18.666667,33.333333 L 27.333333,42.000000 L 45.333333,22.666667"
       fill="none"
       stroke="#ffffff"
       stroke-width="5.0000002"
       stroke-linecap="round"
       stroke-linejoin="round"
       fill-opacity="1"
       id="path2"
       onclick="alert('hi')" /><g
       id="g3" /></g></svg>
`;

const DECIMALS = [
  { value: '-1', label: 'Off' },
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

const dataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function Preview({ svg, label }: { svg: string; label: string }) {
  return (
    <figure className="min-w-0 flex-1">
      <div className="grid h-40 place-items-center rounded-lg border bg-[repeating-conic-gradient(var(--bg-subtle)_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-3">
        {/* Shown as an image: scripts in an SVG never run inside <img> */}
        {svg && <img src={dataUrl(svg)} alt={`${label} preview`} className="max-h-full max-w-full object-contain" />}
      </div>
      <figcaption className="mt-1 font-mono text-[11.5px] text-faint">{label}</figcaption>
    </figure>
  );
}

export default function SvgTool() {
  const [text, setText] = useSaved('input', '');
  const [decimals, setDecimals] = useSaved('decimals', '2', (v) => DECIMALS.some((d) => d.value === v));
  const [removeTitle, setRemoveTitle] = useSaved('removeTitle', false);
  const [settled, setSettled] = useState(text);

  useEffect(() => {
    if (text.length < 200_000) {
      setSettled(text);
      return;
    }
    const t = setTimeout(() => setSettled(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  const result = useMemo(() => {
    try {
      return optimizeSvg(settled, { decimals: Number(decimals), removeTitle });
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : 'Couldn’t read this SVG' };
    }
  }, [settled, decimals, removeTitle]);

  const output = result.ok ? result.output : '';
  const before = byteLength(settled);
  const after = byteLength(output);
  const s = savings(before, after);
  const notes = result.ok ? describeReport(result.report) : [];

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)}>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Decimals</span>
          <Choice label="Decimals" value={decimals} onChange={setDecimals} options={DECIMALS} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="svg-title" size="sm" checked={removeTitle} onCheckedChange={setRemoveTitle} />
          <Label htmlFor="svg-title" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
            Remove &lt;title&gt; and &lt;desc&gt;
          </Label>
        </div>
      </ToolBar>
      {!result.ok && result.message === 'empty' && <StatusLine tone="muted">Paste SVG markup, open a .svg file, or load the example.</StatusLine>}
      {!result.ok && result.message !== 'empty' && <StatusLine tone="error">{result.message}</StatusLine>}
      {result.ok && (
        <StatusLine tone="ok" label="SVG status">
          {formatBytes(before)} → {formatBytes(after)} · {s.label}
        </StatusLine>
      )}
      {notes.length > 0 && (
        <div className="space-y-0.5 border-b px-4 py-2 text-[12.5px] text-muted-foreground" aria-label="What changed">
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}
      <div className="tool-panes">
        <Panel title="svg" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept=".svg,image/svg+xml,text/plain" />}>
          <CodeEditor value={text} onChange={setText} lang="markup" wrap placeholder="Paste SVG markup" ariaLabel="SVG input" className="tool-editor" />
        </Panel>
        <Panel title="optimized" meta={result.ok ? formatBytes(after) : undefined} actions={<OutputActions text={output} fileName="optimized.svg" mime="image/svg+xml" />}>
          <CodeEditor value={output} readOnly lang="markup" wrap ariaLabel="Optimized SVG" className="tool-editor" />
        </Panel>
      </div>
      {result.ok && (
        <div className="flex flex-col gap-4 border-t p-4 sm:flex-row" aria-label="Previews">
          <Preview svg={settled} label={`before · ${formatBytes(before)}`} />
          <Preview svg={output} label={`after · ${formatBytes(after)}`} />
        </div>
      )}
    </>
  );
}
