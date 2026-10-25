import { useDeferredValue, useMemo, useRef } from 'react';
import { jsonToYaml } from '@/lib/jsonTools';
import { EXAMPLE_YAML, yamlToJson } from '@/lib/yamlJson';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, OutputActions, Panel, StatusLine, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type Direction = 'json-yaml' | 'yaml-json';
const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'json-yaml', label: 'JSON → YAML' },
  { value: 'yaml-json', label: 'YAML → JSON' },
];

export default function JsonToYaml() {
  const [direction, setDirection] = useSaved<Direction>('direction', 'json-yaml', (v) => DIRECTIONS.some((d) => d.value === v));
  const { text, setText, parsed } = useJsonInput();
  const [yamlText, setYamlText] = useSaved('yaml', '');
  const inputRef = useRef<CodeEditorHandle>(null);
  const toYaml = direction === 'json-yaml';

  const yaml = useMemo(() => (toYaml && parsed.status === 'valid' ? jsonToYaml(parsed.value) : ''), [toYaml, parsed]);
  const deferredYaml = useDeferredValue(yamlText);
  const fromYaml = useMemo(() => (!toYaml && deferredYaml.trim() ? yamlToJson(deferredYaml) : null), [toYaml, deferredYaml]);
  const json = fromYaml?.ok ? fromYaml.json : '';

  const directionToggle = (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={direction}
      onValueChange={(v) => v && setDirection(v as Direction)}
      aria-label="Direction"
    >
      {DIRECTIONS.map((d) => (
        <ToggleGroupItem key={d.value} value={d.value}>
          {d.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  if (toYaml) {
    return (
      <>
        <ToolBar onExample={() => setText(EXAMPLE_JSON)}>{directionToggle}</ToolBar>
        <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} />
        <div className="tool-panes">
          <Panel title="json" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
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
          <Panel title="yaml" actions={<OutputActions text={yaml} fileName="data.yaml" mime="application/yaml" />}>
            <CodeEditor value={yaml} readOnly lang="hash" ariaLabel="YAML output" className="tool-editor" />
          </Panel>
        </div>
      </>
    );
  }

  const docs = fromYaml?.ok && fromYaml.documents > 1 ? `${fromYaml.documents} documents, written as one JSON array` : null;
  return (
    <>
      <ToolBar onExample={() => setYamlText(EXAMPLE_YAML)}>{directionToggle}</ToolBar>
      {!fromYaml ? (
        <StatusLine tone="muted" label="YAML status">
          Paste YAML, open a file, or load the example.
        </StatusLine>
      ) : fromYaml.ok ? (
        <StatusLine tone="ok" label="YAML status" action={docs || fromYaml.warnings.length ? <span className="text-muted-foreground">{[docs, ...fromYaml.warnings].filter(Boolean).join('; ')}</span> : undefined}>
          Valid YAML
        </StatusLine>
      ) : (
        <StatusLine
          tone="error"
          label="YAML status"
          action={
            fromYaml.line != null && (
              <Button variant="outline" size="xs" onClick={() => inputRef.current?.goToLine(fromYaml.line!, fromYaml.column ?? 1)}>
                Go to error
              </Button>
            )
          }
        >
          {fromYaml.message}
          {fromYaml.line != null && ` at line ${fromYaml.line}, column ${fromYaml.column}`}
        </StatusLine>
      )}
      <div className="tool-panes">
        <Panel
          title="yaml"
          onFile={setYamlText}
          actions={<InputActions onLoad={setYamlText} onClear={() => setYamlText('')} canClear={!!yamlText} accept=".yaml,.yml,application/yaml,text/yaml,text/plain" />}
        >
          <CodeEditor
            ref={inputRef}
            value={yamlText}
            onChange={setYamlText}
            lang="hash"
            errorLine={fromYaml && !fromYaml.ok ? fromYaml.line : null}
            placeholder="Paste YAML here, or open a file"
            ariaLabel="YAML input"
            className="tool-editor"
          />
        </Panel>
        <Panel title="json" actions={<OutputActions text={json} fileName="data.json" mime="application/json" />}>
          <CodeEditor value={json} readOnly lang="c" ariaLabel="JSON output" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
