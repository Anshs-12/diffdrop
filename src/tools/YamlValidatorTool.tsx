import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { checkYaml, type YamlIssue, type YamlVersion } from '@/lib/yamlCheck';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, OutputActions, Panel } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

export const YAML_EXAMPLE = `# Two documents in one file
service: web
replicas: 3
ports:
  - 80
  - 443
env:
  country: NO
  debug: false
---
service: worker
replicas: 1
`;

const LARGE = 200_000;
const SHOWN = 5;

function where(i: YamlIssue, multi: boolean) {
  const parts: string[] = [];
  if (i.line != null) parts.push(`line ${i.line}, column ${i.column}`);
  if (multi) parts.push(`document ${i.doc}`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

export default function YamlValidatorTool() {
  const [text, setText] = useSaved('input', '');
  const [version, setVersion] = useSaved<YamlVersion>('version', '1.2', (v) => v === '1.2' || v === '1.1');
  const [settled, setSettled] = useState(text);
  const inputRef = useRef<CodeEditorHandle>(null);

  useEffect(() => {
    if (text.length < LARGE) {
      setSettled(text);
      return;
    }
    const t = setTimeout(() => setSettled(text), 250);
    return () => clearTimeout(t);
  }, [text]);

  const result = useMemo(() => checkYaml(settled, version), [settled, version]);
  const json = result.status === 'valid' ? result.json : '';
  const multi = result.status !== 'empty' && result.documents > 1;
  const firstError = result.status === 'invalid' ? result.errors[0] : undefined;
  const warnings = result.status === 'empty' ? [] : result.warnings;
  const jump = (i: YamlIssue) => i.line != null && inputRef.current?.goToLine(i.line, i.column ?? 1);

  return (
    <>
      <ToolBar onExample={() => setText(YAML_EXAMPLE)}>
        <ToggleGroup type="single" variant="outline" size="sm" value={version} onValueChange={(v) => v && setVersion(v as YamlVersion)} aria-label="YAML version">
          <ToggleGroupItem value="1.2" title="The current spec, used by most modern parsers">
            YAML 1.2
          </ToggleGroupItem>
          <ToggleGroupItem value="1.1" title="Older rules: yes/no/on/off are booleans">
            YAML 1.1
          </ToggleGroupItem>
        </ToggleGroup>
      </ToolBar>
      <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 font-mono text-[12.5px]" aria-live="polite" aria-label="YAML status">
        {result.status === 'empty' && <span className="text-faint">Paste YAML, open a file, or load the example.</span>}
        {result.status === 'valid' && (
          <>
            <span className="inline-flex items-center gap-1.5 text-add">
              <CircleCheck className="size-3.5" aria-hidden="true" /> Valid YAML {version}
            </span>
            {result.documents > 1 && <span className="text-muted-foreground">{result.documents} documents, shown as a JSON array</span>}
            {result.documents === 0 && <span className="text-muted-foreground">No documents, only comments</span>}
          </>
        )}
        {firstError && (
          <>
            <span className="inline-flex items-start gap-1.5 text-del">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {firstError.message}
              {where(firstError, multi)}
              {result.status === 'invalid' && result.errors.length > 1 && ` (and ${result.errors.length - 1} more)`}
            </span>
            {firstError.line != null && (
              <Button variant="outline" size="xs" onClick={() => jump(firstError)}>
                Go to line {firstError.line}
              </Button>
            )}
          </>
        )}
        {warnings.slice(0, SHOWN).map((w, i) => (
          <span key={i} className="inline-flex basis-full flex-wrap items-start gap-1.5 text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {w.message}
              {where(w, multi)}
            </span>
            {w.line != null && (
              <Button variant="outline" size="xs" onClick={() => jump(w)}>
                Go to line {w.line}
              </Button>
            )}
          </span>
        ))}
        {warnings.length > SHOWN && <span className="basis-full text-amber-700 dark:text-amber-400">and {warnings.length - SHOWN} more warnings</span>}
      </div>
      <div className="tool-panes">
        <Panel title="yaml" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept=".yaml,.yml,text/yaml,text/plain" />}>
          <CodeEditor
            ref={inputRef}
            value={text}
            onChange={setText}
            lang="hash"
            errorLine={firstError?.line ?? null}
            placeholder="Paste YAML here, or open a file"
            ariaLabel="YAML input"
            className="tool-editor"
          />
        </Panel>
        <Panel title="parsed as json" actions={<OutputActions text={json} fileName="data.json" mime="application/json" />}>
          <CodeEditor value={json} readOnly lang="c" ariaLabel="Parsed JSON" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
