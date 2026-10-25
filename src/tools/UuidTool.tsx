import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { checkUuid, formatUuid, generateUuids, MAX_UUIDS, type UuidVersion } from '@/lib/uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { OutputActions, Panel, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const EXAMPLE_CHECK = '{017F22E2-79B0-7CC3-98C4-DC0C0C07398F}';

export default function UuidTool() {
  const [count, setCount] = useSaved('count', 10, (v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_UUIDS);
  const [version, setVersion] = useSaved<UuidVersion>('version', 4, (v) => v === 4 || v === 7);
  const [upper, setUpper] = useSaved('upper', false);
  const [dashes, setDashes] = useSaved('dashes', true);
  const [braces, setBraces] = useSaved('braces', false);
  const [check, setCheck] = useSaved('check', '');
  const [countText, setCountText] = useState(String(count));
  // Generated in the browser only; never saved or put in links
  const [raw, setRaw] = useState<string[]>([]);

  const regenerate = useCallback(() => setRaw(generateUuids(count, version)), [count, version]);
  useEffect(regenerate, [regenerate]);
  useEffect(() => setCountText(String(count)), [count]);

  const output = useMemo(() => raw.map((u) => formatUuid(u, { upper, dashes, braces })).join('\n'), [raw, upper, dashes, braces]);
  const result = useMemo(() => checkUuid(check), [check]);

  const commitCount = (text: string) => {
    setCountText(text);
    const n = Number(text);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_UUIDS) setCount(n);
  };

  const switches = [
    { id: 'uuid-upper', label: 'Uppercase', value: upper, set: setUpper },
    { id: 'uuid-dashes', label: 'Dashes', value: dashes, set: setDashes },
    { id: 'uuid-braces', label: 'Braces {}', value: braces, set: setBraces },
  ];

  return (
    <>
      <ToolBar
        onExample={() => {
          setVersion(7);
          setCount(5);
          setCheck(EXAMPLE_CHECK);
        }}
      >
        <ToggleGroup type="single" variant="outline" size="sm" value={String(version)} onValueChange={(v) => v && setVersion(Number(v) as UuidVersion)} aria-label="Version">
          <ToggleGroupItem value="4" title="Random">
            v4
          </ToggleGroupItem>
          <ToggleGroupItem value="7" title="Time-ordered">
            v7
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Label htmlFor="uuid-count" className="text-[13px] font-normal text-muted-foreground">
            How many
          </Label>
          <Input
            id="uuid-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_UUIDS}
            value={countText}
            onChange={(e) => commitCount(e.target.value)}
            onBlur={() => setCountText(String(count))}
            aria-invalid={countText !== String(count)}
            className="h-8 w-20 font-mono text-[13px]"
          />
        </div>
        {switches.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <Switch id={s.id} size="sm" checked={s.value} onCheckedChange={s.set} />
            <Label htmlFor={s.id} className="cursor-pointer text-[13px] font-normal text-muted-foreground">
              {s.label}
            </Label>
          </div>
        ))}
      </ToolBar>
      <StatusLine
        tone={countText !== String(count) ? 'error' : 'ok'}
        action={
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="xs" onClick={() => copyText(output, `Copied ${raw.length} UUID${raw.length === 1 ? '' : 's'}`)} disabled={!output}>
              <Copy /> Copy all
            </Button>
            <Button variant="outline" size="xs" onClick={regenerate}>
              <RefreshCw /> Regenerate
            </Button>
          </div>
        }
      >
        {countText !== String(count)
          ? `Pick a number from 1 to ${MAX_UUIDS.toLocaleString()}`
          : `${raw.length.toLocaleString()} version ${version} UUID${raw.length === 1 ? '' : 's'}${version === 7 ? ', in time order' : ''}, made with crypto.getRandomValues in this tab`}
      </StatusLine>
      <Panel title={`uuid v${version}`} meta={raw.length ? `${raw.length} lines` : undefined} actions={<OutputActions text={output} fileName="uuids.txt" mime="text/plain" />}>
        <CodeEditor value={output} readOnly lang={null} ariaLabel="Generated UUIDs" className="tool-editor" />
      </Panel>
      <div className="border-t">
        <div className="flex h-11 items-center border-b px-3">
          <span className="font-mono text-[12.5px] text-muted-foreground">check a uuid</span>
        </div>
        <div className="p-3">
          <Input
            value={check}
            onChange={(e) => setCheck(e.target.value)}
            placeholder="Paste a UUID to check it"
            aria-label="UUID to check"
            spellCheck={false}
            className="font-mono text-[13px]"
          />
        </div>
        <div className="-mb-px">
          {result.status === 'empty' ? (
            <StatusLine tone="muted" label="UUID check">
              Paste any UUID or GUID: with or without dashes, braces or urn:uuid:.
            </StatusLine>
          ) : result.status === 'invalid' ? (
            <StatusLine tone="error" label="UUID check">
              {result.message}
            </StatusLine>
          ) : (
            <StatusLine tone={result.label.startsWith('Valid UUID') || result.variant === 'nil' || result.variant === 'max' ? 'ok' : 'warn'} label="UUID check">
              {result.label}
              {result.time && ` · created ${result.time.toLocaleString()} (${result.time.toISOString()})`}
            </StatusLine>
          )}
        </div>
      </div>
    </>
  );
}
