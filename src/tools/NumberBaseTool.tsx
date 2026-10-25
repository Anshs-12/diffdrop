import { useMemo } from 'react';
import { Copy } from 'lucide-react';
import { baseName, bitLength, formatInBase, parseInBase } from '@/lib/numberBase';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { IconButton, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const FIXED = [
  { base: 2, label: 'Binary', prefix: '0b', group: 4 },
  { base: 8, label: 'Octal', prefix: '0o', group: 3 },
  { base: 10, label: 'Decimal', prefix: '', group: 3 },
  { base: 16, label: 'Hexadecimal', prefix: '0x', group: 2 },
];
const CUSTOM_BASES = Array.from({ length: 35 }, (_, i) => i + 2);

/** Which field the user typed in: a fixed base, or the custom one. */
type Origin = 2 | 8 | 10 | 16 | 'custom';
const ORIGINS: Origin[] = [2, 8, 10, 16, 'custom'];

export default function NumberBaseTool() {
  const [text, setText] = useSaved('input', '');
  const [origin, setOrigin] = useSaved<Origin>('from', 10, (v) => ORIGINS.includes(v as Origin));
  const [custom, setCustom] = useSaved('base', 36, (v) => CUSTOM_BASES.includes(v as number));
  const [group, setGroup] = useSaved('group', false);
  const [upper, setUpper] = useSaved('upper', true);

  const originBase = origin === 'custom' ? custom : origin;
  const parsed = useMemo(() => parseInBase(text, originBase), [text, originBase]);
  const value = parsed.ok === true ? parsed.value : null;

  const show = (base: number, groupSize: number) => {
    if (value == null) return '';
    const s = formatInBase(value, base, group ? groupSize : 0);
    return upper ? s.toUpperCase() : s;
  };

  const fields = [
    ...FIXED.map((f) => ({
      key: f.base as Origin,
      base: f.base,
      label: f.label,
      group: f.group,
    })),
    {
      key: 'custom' as Origin,
      base: custom,
      label: `Base ${custom}`,
      group: 4,
    },
  ];

  return (
    <>
      <ToolBar
        onExample={() => {
          setOrigin(10);
          setText('18446744073709551615');
        }}
      >
        <div className="flex items-center gap-2">
          <Switch id="nb-group" size="sm" checked={group} onCheckedChange={setGroup} />
          <Label htmlFor="nb-group" className="cursor-pointer text-[13px] font-normal text-muted-foreground" title="Binary in 4s, hex in 2s, decimal in 3s">
            Group digits
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="nb-upper" size="sm" checked={upper} onCheckedChange={setUpper} />
          <Label htmlFor="nb-upper" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
            Uppercase letters
          </Label>
        </div>
      </ToolBar>
      {parsed.ok === 'empty' ? (
        <StatusLine tone="muted">Type a whole number in any field; the others update as you type.</StatusLine>
      ) : parsed.ok === false ? (
        <StatusLine tone="error">
          {fields.find((f) => f.key === origin)!.label}: {parsed.message}
        </StatusLine>
      ) : (
        <StatusLine tone="ok">
          {bitLength(parsed.value).toLocaleString()} bit
          {bitLength(parsed.value) === 1 ? '' : 's'}
          {parsed.value < 0n ? ' plus a minus sign' : ''} · {parsed.value.toString().replace('-', '').length.toLocaleString()} decimal digit
          {parsed.value.toString().replace('-', '').length === 1 ? '' : 's'}, kept exact
        </StatusLine>
      )}
      <div className="divide-y">
        {fields.map((f) => {
          const active = origin === f.key;
          const shown = active ? text : show(f.base, f.group);
          const id = `nb-${f.key}`;
          return (
            <div key={String(f.key)} className="grid gap-1.5 px-3 py-3 sm:grid-cols-[190px_1fr] sm:items-start sm:gap-3">
              <div className="flex items-center gap-2 sm:h-9">
                {f.key === 'custom' ? (
                  <>
                    <Label htmlFor="nb-custom-base" className="font-mono text-[12.5px] font-normal text-muted-foreground">
                      base
                    </Label>
                    <select
                      id="nb-custom-base"
                      value={custom}
                      onChange={(e) => {
                        // Keep the number: if this field is the source, re-express it in the new base
                        const next = Number(e.target.value);
                        if (origin === 'custom' && value != null) setText(formatInBase(value, next));
                        setCustom(next);
                      }}
                      className="h-8 rounded-md border bg-background px-2 font-mono text-[13px]"
                    >
                      {CUSTOM_BASES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <Label htmlFor={id} className="font-mono text-[12.5px] font-normal whitespace-nowrap text-muted-foreground">
                    {f.label.toLowerCase()} <span className="text-faint">· base {f.base}</span>
                  </Label>
                )}
              </div>
              <div className="flex min-w-0 items-start gap-1.5">
                <textarea
                  id={id}
                  rows={1}
                  value={shown}
                  onChange={(e) => {
                    setOrigin(f.key);
                    setText(e.target.value);
                  }}
                  onFocus={() => {
                    // Editing a field that shows a converted value: start from that value, ungrouped
                    if (!active && value != null) {
                      setOrigin(f.key);
                      setText(show(f.base, 0));
                    }
                  }}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  aria-label={f.key === 'custom' ? `Base ${custom} number` : `${f.label} number`}
                  aria-invalid={active && parsed.ok === false}
                  placeholder={f.key === 10 ? 'e.g. 255 or -1,000,000' : f.key === 16 ? 'e.g. 0xff' : f.key === 2 ? 'e.g. 0b1111_1111' : ''}
                  className={cn(
                    'field-sizing-content min-h-9 w-full resize-none rounded-md border bg-transparent px-3 py-1.5 font-mono text-[14px] leading-6 break-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    active && parsed.ok === false && 'border-del',
                  )}
                />
                <div className="flex h-9 items-center">
                  <IconButton
                    label={`Copy ${f.key === 'custom' ? `base ${custom}` : baseName(f.base)}`}
                    onClick={() => copyText(shown.trim())}
                    disabled={!shown.trim() || parsed.ok !== true}
                  >
                    <Copy />
                  </IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
