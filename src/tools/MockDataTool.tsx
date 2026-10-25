import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RefreshCw, TriangleAlert, X } from 'lucide-react';
import {
  DEFAULT_FIELDS,
  FIELD_TYPES,
  MAX_ROWS,
  duplicateKeys,
  formatRows,
  generateRows,
  isFieldList,
  isFieldType,
  seedFromText,
  type FieldType,
  type MockField,
  type MockFormat,
} from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { IconButton, OutputActions, Panel } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const FORMATS: { value: MockFormat; label: string; file: string; mime: string }[] = [
  { value: 'json', label: 'JSON', file: 'mock-data.json', mime: 'application/json' },
  { value: 'json-min', label: 'Minified', file: 'mock-data.json', mime: 'application/json' },
  { value: 'jsonl', label: 'JSON Lines', file: 'mock-data.jsonl', mime: 'application/x-ndjson' },
  { value: 'csv', label: 'CSV', file: 'mock-data.csv', mime: 'text/csv' },
];

const EXAMPLE_FIELDS: MockField[] = [
  { key: 'id', type: 'uuid' },
  { key: 'firstName', type: 'firstName' },
  { key: 'lastName', type: 'lastName' },
  { key: 'email', type: 'email' },
  { key: 'phone', type: 'phone' },
  { key: 'company', type: 'company' },
  { key: 'role', type: 'jobTitle' },
  { key: 'plan', type: 'status', choices: 'free, pro, team' },
  { key: 'balance', type: 'price', min: 0, max: 250 },
  { key: 'lastIp', type: 'ip' },
  { key: 'signedUp', type: 'pastDate' },
];

const RANGED = new Set<FieldType>(['integer', 'float', 'price']);
const DEFAULT_RANGE: Partial<Record<FieldType, [number, number]>> = { integer: [1, 100], float: [0, 1], price: [1, 500] };

const fieldClass = 'h-8 min-w-0 rounded-md border bg-background px-2 text-[13px] text-foreground';
const numClass = `${fieldClass} w-20 font-mono`;

export default function MockDataTool() {
  const [fields, setFields] = useSaved<MockField[]>('fields', DEFAULT_FIELDS, isFieldList);
  const [rows, setRows] = useSaved('rows', 10, (v) => typeof v === 'number' && v >= 1 && v <= MAX_ROWS);
  const [format, setFormat] = useSaved<MockFormat>('format', 'json', (v) => FORMATS.some((f) => f.value === v));
  const [seedText, setSeedText] = useSaved('seed', '', (v) => typeof v === 'string' && v.length <= 100);
  const [randomSeed, setRandomSeed] = useState(() => (Math.random() * 2 ** 32) >>> 0);
  const [rowsDraft, setRowsDraft] = useState(String(rows));
  // Keep the box in step when rows change from elsewhere (a share link, "Forget input")
  useEffect(() => setRowsDraft((d) => (Number(d) === rows ? d : String(rows))), [rows]);

  const seed = seedText.trim() ? seedFromText(seedText.trim()) : randomSeed;
  const output = useMemo(() => formatRows(generateRows(fields, { rows, seed }), fields, format), [fields, rows, seed, format]);
  const fmt = FORMATS.find((f) => f.value === format)!;
  const dups = duplicateKeys(fields);
  const emptyKeys = fields.filter((f) => !f.key).length;

  const update = (i: number, patch: Partial<MockField>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...fields];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setFields(next);
  };
  const setType = (i: number, type: FieldType) => {
    const range = DEFAULT_RANGE[type];
    update(i, { type, min: range?.[0], max: range?.[1], choices: type === 'status' ? (fields[i]!.choices ?? 'active, pending, inactive') : fields[i]!.choices });
  };
  const addField = () => {
    const used = new Set(fields.map((f) => f.key));
    let key = 'field';
    for (let n = 2; used.has(key); n++) key = `field${n}`;
    setFields([...fields, { key, type: 'sentence' }]);
  };
  const commitRows = (v: string) => {
    const n = Math.min(MAX_ROWS, Math.max(1, Math.floor(Number(v)) || 1));
    setRows(n);
    setRowsDraft(String(n));
  };

  return (
    <>
      <ToolBar
        onExample={() => {
          setFields(EXAMPLE_FIELDS);
          setRows(5);
          setRowsDraft('5');
        }}
      >
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Rows
          <input
            type="number"
            min={1}
            max={MAX_ROWS}
            value={rowsDraft}
            onChange={(e) => {
              setRowsDraft(e.target.value);
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= MAX_ROWS) setRows(n);
            }}
            onBlur={(e) => commitRows(e.target.value)}
            className={numClass}
            aria-label="Rows"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Seed
          <input
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder="random"
            className={`${fieldClass} w-28 font-mono`}
            aria-label="Seed"
            title="Any text. The same seed and fields give the same data."
            spellCheck={false}
          />
        </label>
        <Button variant="outline" size="sm" onClick={() => setRandomSeed((Math.random() * 2 ** 32) >>> 0)} disabled={!!seedText.trim()}>
          <RefreshCw /> New data
        </Button>
      </ToolBar>
      <div className="tool-panes">
        <Panel
          title="fields"
          meta={fields.length}
          actions={
            <Button variant="ghost" size="xs" onClick={() => setFields(DEFAULT_FIELDS)} className="text-muted-foreground">
              Reset
            </Button>
          }
        >
          {(dups.length > 0 || emptyKeys > 0) && (
            <p className="flex items-start gap-1.5 border-b px-3 py-2 text-[12.5px] text-amber-700 dark:text-amber-400" role="status">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {dups.length > 0 && `Key ${dups.map((d) => JSON.stringify(d)).join(', ')} is used twice: only the last one shows up. `}
              {emptyKeys > 0 && 'A field has an empty key name.'}
            </p>
          )}
          <ul className="flex-1 divide-y overflow-auto" aria-label="Fields">
            {fields.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                <input
                  value={f.key}
                  onChange={(e) => update(i, { key: e.target.value })}
                  className={`${fieldClass} w-32 flex-1 font-mono sm:flex-none`}
                  aria-label={`Key name ${i + 1}`}
                  aria-invalid={!f.key || dups.includes(f.key)}
                  spellCheck={false}
                />
                <select
                  value={f.type}
                  onChange={(e) => isFieldType(e.target.value) && setType(i, e.target.value)}
                  className={`${fieldClass} w-40 flex-1 sm:flex-none`}
                  aria-label={`Type ${i + 1}`}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span className="ml-auto flex items-center">
                  <IconButton label={`Move ${f.key || 'field'} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp />
                  </IconButton>
                  <IconButton label={`Move ${f.key || 'field'} down`} onClick={() => move(i, 1)} disabled={i === fields.length - 1}>
                    <ArrowDown />
                  </IconButton>
                  <IconButton label={`Remove ${f.key || 'field'}`} onClick={() => setFields(fields.filter((_, j) => j !== i))}>
                    <X />
                  </IconButton>
                </span>
                {RANGED.has(f.type) && (
                  <span className="flex basis-full items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    from
                    <input
                      type="number"
                      value={f.min ?? ''}
                      onChange={(e) => update(i, { min: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className={numClass}
                      aria-label={`Minimum for ${f.key}`}
                    />
                    to
                    <input
                      type="number"
                      value={f.max ?? ''}
                      onChange={(e) => update(i, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className={numClass}
                      aria-label={`Maximum for ${f.key}`}
                    />
                  </span>
                )}
                {f.type === 'status' && (
                  <input
                    value={f.choices ?? ''}
                    onChange={(e) => update(i, { choices: e.target.value })}
                    placeholder="active, pending, inactive"
                    className={`${fieldClass} basis-full font-mono`}
                    aria-label={`Choices for ${f.key}, separated by commas`}
                    spellCheck={false}
                  />
                )}
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-2">
            <Button variant="outline" size="sm" onClick={addField} disabled={fields.length >= 100}>
              <Plus /> Add field
            </Button>
          </div>
        </Panel>
        <Panel
          title={fmt.label.toLowerCase()}
          meta={`${rows.toLocaleString()} row${rows === 1 ? '' : 's'}`}
          actions={<OutputActions text={output} fileName={fmt.file} mime={fmt.mime} bom={format === 'csv'} />}
        >
          <div className="border-b px-3 py-2">
            <ToggleGroup type="single" variant="outline" size="sm" value={format} onValueChange={(v) => v && setFormat(v as MockFormat)} aria-label="Output format">
              {FORMATS.map((f) => (
                <ToggleGroupItem key={f.value} value={f.value}>
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {/* Remounted when wrapping changes: the editor reads `wrap` when it's created */}
          <CodeEditor key={format === 'json' ? 'nowrap' : 'wrap'} value={output} readOnly lang={format === 'csv' ? null : 'c'} wrap={format !== 'json'} ariaLabel="Generated data" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
