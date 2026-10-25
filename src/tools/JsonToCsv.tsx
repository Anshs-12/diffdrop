import { useDeferredValue, useMemo, useRef } from 'react';
import { jsonToCsv, type Delimiter } from '@/lib/jsonTools';
import { DELIMITER_NAMES, csvToJson } from '@/lib/csvJson';
import { parseJson } from '@/lib/jsonValue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, OutputActions, Panel, StatusLine, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const DELIMITERS: { value: Delimiter; label: string; id: string }[] = [
  { value: ',', label: 'Comma', id: 'comma' },
  { value: ';', label: 'Semicolon', id: 'semicolon' },
  { value: '\t', label: 'Tab', id: 'tab' },
];
const READ_DELIMITERS = [{ value: 'auto', label: 'Auto', id: 'auto' } as const, ...DELIMITERS];

type Direction = 'json-csv' | 'csv-json';
const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'json-csv', label: 'JSON → CSV' },
  { value: 'csv-json', label: 'CSV → JSON' },
];

/** The CSV the JSON example turns into, so the two directions show the same data. */
const EXAMPLE_CSV = jsonToCsv(parseJson(EXAMPLE_JSON)).csv;

function Toggle({ id, label, checked, onChange, title }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-[13px] font-normal text-muted-foreground" title={title}>
        {label}
      </Label>
    </div>
  );
}

export default function JsonToCsv() {
  const [direction, setDirection] = useSaved<Direction>('direction', 'json-csv', (v) => DIRECTIONS.some((d) => d.value === v));
  const { text, setText, parsed } = useJsonInput();
  const [delimiterId, setDelimiterId] = useSaved('delimiter', 'comma', (v) => DELIMITERS.some((d) => d.id === v));
  // On by default: a cell like =HYPERLINK(...) from untrusted data would run when the CSV is opened
  const [escapeFormulas, setEscapeFormulas] = useSaved('escapeFormulas', true);
  const [csvText, setCsvText] = useSaved('csv', '');
  const [readDelimiterId, setReadDelimiterId] = useSaved('readDelimiter', 'auto', (v) => READ_DELIMITERS.some((d) => d.id === v));
  const [header, setHeader] = useSaved('header', true);
  const [types, setTypes] = useSaved('types', false);
  const [nest, setNest] = useSaved('nest', false);
  const inputRef = useRef<CodeEditorHandle>(null);
  const toCsv = direction === 'json-csv';
  const delimiter = DELIMITERS.find((d) => d.id === delimiterId)!.value;
  const readDelimiter = READ_DELIMITERS.find((d) => d.id === readDelimiterId)!.value;

  const result = useMemo(
    () => (toCsv && parsed.status === 'valid' ? jsonToCsv(parsed.value, { delimiter, escapeFormulas }) : null),
    [toCsv, parsed, delimiter, escapeFormulas],
  );
  // Large pastes convert just after typing settles, so the editor stays responsive
  const deferredCsv = useDeferredValue(csvText);
  const fromCsv = useMemo(
    () => (!toCsv && deferredCsv.trim() ? csvToJson(deferredCsv, { delimiter: readDelimiter, header, types, nest }) : null),
    [toCsv, deferredCsv, readDelimiter, header, types, nest],
  );

  const directionToggle = (
    <ToggleGroup type="single" variant="outline" size="sm" value={direction} onValueChange={(v) => v && setDirection(v as Direction)} aria-label="Direction">
      {DIRECTIONS.map((d) => (
        <ToggleGroupItem key={d.value} value={d.value}>
          {d.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  if (toCsv) {
    const note =
      result &&
      `${result.rows.toLocaleString()} row${result.rows === 1 ? '' : 's'}, ${result.columns.length} column${result.columns.length === 1 ? '' : 's'}` +
        (result.unwrapped ? `, from the ${JSON.stringify(result.unwrapped)} array` : '');
    return (
      <>
        <ToolBar onExample={() => setText(EXAMPLE_JSON)}>
          {directionToggle}
          <ToggleGroup type="single" variant="outline" size="sm" value={delimiterId} onValueChange={(v) => v && setDelimiterId(v)} aria-label="Delimiter">
            {DELIMITERS.map((d) => (
              <ToggleGroupItem key={d.id} value={d.id}>
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Toggle
            id="escape-formulas"
            label="Escape formulas"
            checked={escapeFormulas}
            onChange={setEscapeFormulas}
            title="Prefix cells starting with = + - @ or a tab with ' so Excel and Sheets don't run them as formulas"
          />
        </ToolBar>
        <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} validNote={note} />
        <div className="tool-panes">
          <Panel title="json" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
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

  const plural = (n: number, w: string) => `${n.toLocaleString()} ${w}${n === 1 ? '' : 's'}`;
  return (
    <>
      <ToolBar onExample={() => setCsvText(EXAMPLE_CSV)}>
        {directionToggle}
        <ToggleGroup type="single" variant="outline" size="sm" value={readDelimiterId} onValueChange={(v) => v && setReadDelimiterId(v)} aria-label="Delimiter">
          {READ_DELIMITERS.map((d) => (
            <ToggleGroupItem key={d.id} value={d.id}>
              {d.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Toggle id="header-row" label="Header row" checked={header} onChange={setHeader} title="Use the first row as the keys of each object; off gives an array of arrays" />
        <Toggle
          id="detect-types"
          label="Detect numbers and true/false"
          checked={types}
          onChange={setTypes}
          title="Off: every value stays a string. On: 42, true, false, null and JSON lists become those values; 007, 1.10 and IDs too long to be exact stay strings"
        />
        {header && <Toggle id="nest-keys" label="Nest dotted keys" checked={nest} onChange={setNest} title="Turn columns like address.city back into nested objects" />}
      </ToolBar>
      {!fromCsv ? (
        <StatusLine tone="muted" label="CSV status">
          Paste CSV, open a file, or load the example.
        </StatusLine>
      ) : fromCsv.ok ? (
        <StatusLine
          tone="ok"
          label="CSV status"
          action={
            <span className="text-muted-foreground">
              {[readDelimiter === 'auto' && `${DELIMITER_NAMES[fromCsv.delimiter]}-separated (detected)`, header && 'first row used as keys'].filter(Boolean).join(', ')}
            </span>
          }
        >
          {plural(fromCsv.rows, 'row')}, {plural(fromCsv.columns, 'column')}
        </StatusLine>
      ) : (
        <StatusLine
          tone="error"
          label="CSV status"
          action={
            <Button variant="outline" size="xs" onClick={() => inputRef.current?.goToLine(fromCsv.line, fromCsv.column)}>
              Go to error
            </Button>
          }
        >
          {fromCsv.message} at line {fromCsv.line}, column {fromCsv.column}
        </StatusLine>
      )}
      <div className="tool-panes">
        <Panel
          title="csv"
          onFile={setCsvText}
          actions={<InputActions onLoad={setCsvText} onClear={() => setCsvText('')} canClear={!!csvText} accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain" />}
        >
          <CodeEditor
            ref={inputRef}
            value={csvText}
            onChange={setCsvText}
            lang={null}
            errorLine={fromCsv && !fromCsv.ok ? fromCsv.line : null}
            placeholder="Paste CSV here, or open a .csv file"
            ariaLabel="CSV input"
            className="tool-editor"
          />
        </Panel>
        <Panel title="json" actions={<OutputActions text={fromCsv?.ok ? fromCsv.json : ''} fileName="data.json" mime="application/json" />}>
          <CodeEditor value={fromCsv?.ok ? fromCsv.json : ''} readOnly lang="c" ariaLabel="JSON output" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
