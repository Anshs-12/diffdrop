import { useMemo, useRef } from 'react';
import { jsonToTs, type JsonToTsFormat } from '@/lib/jsonToTs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, OutputActions, Panel, StatusLine, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import OptionSwitch from './OptionSwitch';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const FORMATS: { value: JsonToTsFormat; label: string }[] = [
  { value: 'interface', label: 'Interfaces' },
  { value: 'type', label: 'Types' },
  { value: 'zod', label: 'Zod' },
];

export default function JsonToTsTool() {
  const { text, setText, parsed } = useJsonInput();
  const [format, setFormat] = useSaved<JsonToTsFormat>('format', 'interface', (v) => FORMATS.some((f) => f.value === v));
  const [rootName, setRootName] = useSaved('root', 'Root', (v) => typeof v === 'string' && v.length <= 80);
  const [exported, setExported] = useSaved('export', true, (v) => typeof v === 'boolean');
  const [readonly, setReadonly] = useSaved('readonly', false, (v) => typeof v === 'boolean');
  const inputRef = useRef<CodeEditorHandle>(null);

  const result = useMemo(
    () => (parsed.status === 'valid' ? jsonToTs(parsed.value, { format, rootName, exported, readonly }) : null),
    [parsed, format, rootName, exported, readonly],
  );
  const code = result?.ok ? result.code : '';
  const note = result?.ok ? `${result.types} ${format === 'zod' ? 'schema' : 'type'}${result.types === 1 ? '' : 's'}` : undefined;

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE_JSON)}>
        <ToggleGroup type="single" variant="outline" size="sm" value={format} onValueChange={(v) => v && setFormat(v as JsonToTsFormat)} aria-label="Output">
          {FORMATS.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value}>
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Root name
          <input
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            spellCheck={false}
            className="h-8 w-28 rounded-md border bg-background px-2 font-mono text-[13px] text-foreground"
            aria-label="Root type name"
          />
        </label>
        <OptionSwitch id="ts-export" label="export" checked={exported} onChange={setExported} />
        <OptionSwitch
          id="ts-readonly"
          label="readonly"
          checked={readonly && format !== 'zod'}
          onChange={setReadonly}
          disabled={format === 'zod'}
          title="Mark every property (and array) readonly"
        />
      </ToolBar>
      <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} validNote={note} />
      {result && !result.ok && <StatusLine tone="error">{result.error}</StatusLine>}
      <StatusLine tone="warn" label="Note">
        Inferred starter schema: review before use. One sample can’t show which fields are optional or what values are valid.
      </StatusLine>
      <div className="tool-panes">
        <Panel title="json" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
          <CodeEditor
            ref={inputRef}
            value={text}
            onChange={setText}
            lang="c"
            errorLine={parsed.status === 'invalid' ? parsed.check.line : null}
            placeholder="Paste a JSON sample, or open a file"
            ariaLabel="JSON input"
            className="tool-editor"
          />
        </Panel>
        <Panel
          title={format === 'zod' ? 'zod schema' : 'typescript'}
          actions={<OutputActions text={code} fileName={format === 'zod' ? 'schema.ts' : 'types.ts'} mime="text/typescript" />}
        >
          <CodeEditor value={code} readOnly lang="c" ariaLabel="TypeScript output" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
