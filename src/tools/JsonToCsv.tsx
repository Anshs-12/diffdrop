import { useMemo, useRef, useState } from 'react';
import { jsonToCsv, type Delimiter } from '@/lib/jsonTools';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, OutputActions, Panel, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';

const DELIMITERS: { value: Delimiter; label: string; id: string }[] = [
  { value: ',', label: 'Comma', id: 'comma' },
  { value: ';', label: 'Semicolon', id: 'semicolon' },
  { value: '\t', label: 'Tab', id: 'tab' },
];

export default function JsonToCsv() {
  const { text, setText, parsed } = useJsonInput();
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  // On by default: a cell like =HYPERLINK(...) from untrusted data would run when the CSV is opened
  const [escapeFormulas, setEscapeFormulas] = useState(true);
  const inputRef = useRef<CodeEditorHandle>(null);

  const result = useMemo(
    () => (parsed.status === 'valid' ? jsonToCsv(parsed.value, { delimiter, escapeFormulas }) : null),
    [parsed, delimiter, escapeFormulas],
  );
  const note =
    result &&
    `${result.rows.toLocaleString()} row${result.rows === 1 ? '' : 's'}, ${result.columns.length} column${result.columns.length === 1 ? '' : 's'}` +
      (result.unwrapped ? `, from the ${JSON.stringify(result.unwrapped)} array` : '');

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE_JSON)}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={DELIMITERS.find((d) => d.value === delimiter)!.id}
          onValueChange={(v) => v && setDelimiter(DELIMITERS.find((d) => d.id === v)!.value)}
          aria-label="Delimiter"
        >
          {DELIMITERS.map((d) => (
            <ToggleGroupItem key={d.id} value={d.id}>
              {d.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="escape-formulas" size="sm" checked={escapeFormulas} onCheckedChange={setEscapeFormulas} />
          <Label
            htmlFor="escape-formulas"
            className="cursor-pointer text-[13px] font-normal text-muted-foreground"
            title="Prefix cells starting with = + - @ or a tab with ' so Excel and Sheets don't run them as formulas"
          >
            Escape formulas
          </Label>
        </div>
      </ToolBar>
      <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} validNote={note} />
      <div className="tool-panes">
        <Panel title="json" actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
          <CodeEditor
            ref={inputRef}
            value={text}
            onChange={setText}
            lang="c"
            errorLine={parsed.status === 'invalid' ? parsed.check.line : null}
            placeholder="Paste a JSON array of objects, or open a file"
            ariaLabel="JSON input"
            className="tool-editor"
          />
        </Panel>
        <Panel
          title="csv"
          actions={
            <OutputActions
              text={result?.csv ?? ''}
              fileName={delimiter === '\t' ? 'data.tsv' : 'data.csv'}
              mime={delimiter === '\t' ? 'text/tab-separated-values' : 'text/csv'}
              bom
            />
          }
        >
          <CodeEditor value={result?.csv ?? ''} readOnly lang={null} ariaLabel="CSV output" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
