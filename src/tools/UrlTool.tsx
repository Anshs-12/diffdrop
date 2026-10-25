import { useMemo, useRef } from 'react';
import { parseUrl, urlDecode, urlEncode, type UrlMode } from '@/lib/urlCodec';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type Direction = 'encode' | 'decode';

const EXAMPLES: Record<Direction, string> = {
  encode: 'name=Ada Lovelace & co/ü?ref=#top',
  decode: 'https://example.com/search?q=caf%C3%A9%20%26%20cr%C3%A8me&lang=fr&tags=a%2Cb#results',
};

const MODES: { value: UrlMode; label: string; title: string }[] = [
  { value: 'component', label: 'Component', title: 'encodeURIComponent: for one query value or path segment' },
  { value: 'uri', label: 'Full URL', title: 'encodeURI: keeps : / ? # & = so a whole URL stays a URL' },
  { value: 'form', label: 'Form', title: 'application/x-www-form-urlencoded: spaces become +' },
];

/** Line and column (1-based) of an offset, for jumping to an error. */
function position(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index).split('\n');
  return { line: before.length, column: before[before.length - 1]!.length + 1 };
}

export default function UrlTool() {
  const [direction, setDirection] = useSaved<Direction>('direction', 'encode', (v) => v === 'encode' || v === 'decode');
  const [mode, setMode] = useSaved<UrlMode>('mode', 'component', (v) => MODES.some((m) => m.value === v));
  const [text, setText] = useSaved('text', '');
  const inputRef = useRef<CodeEditorHandle>(null);

  const result = useMemo(() => {
    if (!text) return null;
    if (direction === 'encode') return { ok: true as const, text: urlEncode(text, mode) };
    return urlDecode(text, mode);
  }, [text, direction, mode]);

  const output = result?.ok ? result.text : '';
  // Show the parts of whichever side is a full URL
  const parsed = useMemo(() => parseUrl(direction === 'decode' ? text : output) ?? parseUrl(direction === 'decode' ? output : text), [direction, text, output]);
  const errorPos = result && !result.ok ? position(text, result.index) : null;

  const flip = (next: Direction) => {
    setDirection(next);
    if (output) setText(output);
  };

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLES[direction])}>
        <ToggleGroup type="single" variant="outline" size="sm" value={direction} onValueChange={(v) => v && flip(v as Direction)} aria-label="Direction">
          <ToggleGroupItem value="encode">Encode</ToggleGroupItem>
          <ToggleGroupItem value="decode">Decode</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as UrlMode)} aria-label="Encoding style">
          {MODES.map((m) => (
            <ToggleGroupItem key={m.value} value={m.value} title={m.title}>
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ToolBar>

      {!result && <StatusLine tone="muted">Paste text or a URL, or load the example.</StatusLine>}
      {result?.ok && (
        <StatusLine tone="ok">
          {direction === 'encode' ? 'Encoded' : 'Decoded'}
          {output === text && ' · nothing needed changing'}
        </StatusLine>
      )}
      {result && !result.ok && errorPos && (
        <StatusLine tone="error">
          {result.message} at line {errorPos.line}, column {errorPos.column}
        </StatusLine>
      )}

      <div className="tool-panes">
        <Panel title={direction === 'encode' ? 'text' : 'encoded'} onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.url" />}>
          <CodeEditor
            key={direction}
            ref={inputRef}
            value={text}
            onChange={setText}
            lang={null}
            wrap
            errorLine={errorPos?.line ?? null}
            placeholder={direction === 'encode' ? 'Text or a URL to encode' : 'Percent-encoded text or a URL to decode'}
            ariaLabel={direction === 'encode' ? 'Text to encode' : 'Text to decode'}
            className="tool-editor url-editor"
          />
        </Panel>
        <Panel title={direction === 'encode' ? 'encoded' : 'decoded'} actions={<OutputActions text={output} fileName="url.txt" mime="text/plain" />}>
          <CodeEditor value={output} readOnly lang={null} wrap ariaLabel={direction === 'encode' ? 'Encoded text' : 'Decoded text'} className="tool-editor url-editor" />
        </Panel>
      </div>

      {parsed && (
        <div className="grid border-t lg:grid-cols-2">
          <div className="border-b lg:border-r lg:border-b-0">
            <p className="border-b px-4 py-2 font-mono text-[11.5px] text-faint">url parts</p>
            <dl className="divide-y text-[13.5px]" aria-label="URL parts">
              {(
                [
                  ['Protocol', parsed.protocol],
                  ['Username', parsed.username],
                  ['Password', parsed.password && '••••••'],
                  ['Host', parsed.hostname],
                  ['Port', parsed.port],
                  ['Path', parsed.pathname],
                  ['Query', parsed.search],
                  ['Fragment', parsed.hash],
                  ['Origin', parsed.origin],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-3 px-4 py-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 font-mono break-all">{v}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <div>
            <p className="border-b px-4 py-2 font-mono text-[11.5px] text-faint">query parameters ({parsed.params.length})</p>
            {parsed.params.length ? (
              <table className="w-full text-left text-[13.5px]" aria-label="Query parameters">
                <tbody className="divide-y font-mono">
                  {parsed.params.map(([k, v], i) => (
                    <tr key={`${k}-${i}`}>
                      <td className="w-1/3 px-4 py-2 align-top break-all text-muted-foreground">{k}</td>
                      <td className="px-2 py-2 break-all">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-3 text-[13.5px] text-muted-foreground">No query parameters.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
