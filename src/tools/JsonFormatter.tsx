import { useMemo, useRef } from 'react';
import { stringifyJson, type Indent } from '@/lib/jsonTools';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, OutputActions, Panel, byteLength, formatBytes, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const INDENTS: { value: Indent; label: string }[] = [
  { value: 2, label: '2 spaces' },
  { value: 4, label: '4 spaces' },
  { value: 'tab', label: 'Tabs' },
  { value: 'minify', label: 'Minify' },
];

export default function JsonFormatter() {
  const { text, setText, parsed } = useJsonInput();
  const [indent, setIndent] = useSaved<Indent>('indent', 2, (v) => INDENTS.some((i) => i.value === v));
  const [sort, setSort] = useSaved('sort', false);
  const inputRef = useRef<CodeEditorHandle>(null);

  const output = useMemo(
    () => (parsed.status === 'valid' ? stringifyJson(parsed.value, indent, sort) : ''),
    [parsed, indent, sort],
  );

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE_JSON)}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(indent)}
          onValueChange={(v) => v && setIndent(v === 'tab' || v === 'minify' ? v : (Number(v) as 2 | 4))}
          aria-label="Indentation"
        >
          {INDENTS.map((i) => (
            <ToggleGroupItem key={String(i.value)} value={String(i.value)}>
              {i.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="sort-keys" size="sm" checked={sort} onCheckedChange={setSort} />
          <Label htmlFor="sort-keys" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
            Sort keys
          </Label>
        </div>
      </ToolBar>
      <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} />
      <div className="tool-panes">
        <Panel
          title="input"
          onFile={setText}
          meta={text ? formatBytes(byteLength(text)) : undefined}
          actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}
        >
          <CodeEditor
            ref={inputRef}
            value={text}
            onChange={setText}
            lang="c"
            errorLine={parsed.status === 'invalid' ? parsed.check.line : null}
            placeholder="Paste JSON here, or open a file"
            ariaLabel="JSON input"
            className="tool-editor"
          />
        </Panel>
        <Panel
          title="formatted"
          meta={output ? formatBytes(byteLength(output)) : undefined}
          actions={<OutputActions text={output} fileName={indent === 'minify' ? 'data.min.json' : 'data.json'} mime="application/json" />}
        >
          <CodeEditor value={output} readOnly lang="c" ariaLabel="Formatted JSON" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
