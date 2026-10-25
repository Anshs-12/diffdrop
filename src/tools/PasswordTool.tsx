import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { crackTime, entropyBits, generatePassword, passwordAlphabets, strengthLabel, type PasswordOptions } from '@/lib/generate';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { IconButton, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';

const SETS: { key: keyof Omit<PasswordOptions, 'length' | 'excludeAmbiguous'>; label: string }[] = [
  { key: 'lower', label: 'Lowercase (a–z)' },
  { key: 'upper', label: 'Uppercase (A–Z)' },
  { key: 'digits', label: 'Numbers (0–9)' },
  { key: 'symbols', label: 'Symbols (!@#…)' },
];

/** "Load example": a password that's easy to read out and type on a phone (letters and digits, no look-alikes). */
const EXAMPLE: PasswordOptions = { length: 16, lower: true, upper: true, digits: true, symbols: false, excludeAmbiguous: true };

const LEVEL_COLORS = ['bg-del-fg', 'bg-del-fg', 'bg-amber-500', 'bg-add-fg', 'bg-add-fg'];

export default function PasswordTool() {
  const [o, setO] = useState<PasswordOptions>({ length: 20, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: false });
  // Plain state on purpose: this page never saves or shares its options or passwords (PRIVATE_TOOLS)
  // Generated in the browser only (never at build time)
  const [passwords, setPasswords] = useState<string[]>([]);

  const regenerate = useCallback(() => setPasswords(Array.from({ length: 6 }, () => generatePassword(o))), [o]);
  useEffect(regenerate, [regenerate]);

  const alphabet = useMemo(() => passwordAlphabets(o).join('').length, [o]);
  const bits = entropyBits(o.length, alphabet);
  const strength = strengthLabel(bits);
  const [main, ...more] = passwords;
  const none = alphabet === 0;

  return (
    <>
      <ToolBar onExample={() => setO(EXAMPLE)} />
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-xl border bg-background p-2 pl-4">
          <output className="min-w-0 flex-1 font-mono text-[18px] break-all sm:text-[20px]" aria-label="Generated password">
            {none ? <span className="text-faint">Pick at least one character set</span> : main}
          </output>
          <IconButton label="Copy password" onClick={() => main && copyText(main, 'Password copied')} disabled={!main}>
            <Copy />
          </IconButton>
          <IconButton label="Generate a new password" onClick={regenerate} disabled={none}>
            <RefreshCw />
          </IconButton>
        </div>

        <div className="mt-3 flex items-center gap-3" aria-label="Strength">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= strength.level && !none ? LEVEL_COLORS[strength.level] : 'bg-muted')} />
            ))}
          </div>
          <span className="w-24 text-right text-[13px] font-medium">{none ? '–' : strength.label}</span>
        </div>
        {!none && (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {Math.round(bits)} bits of entropy · brute force takes {crackTime(bits)} at 10 billion guesses a second
          </p>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="pw-length" className="flex justify-between text-[13.5px] font-normal">
              Length <span className="font-mono">{o.length}</span>
            </Label>
            <input
              id="pw-length"
              type="range"
              min={4}
              max={128}
              value={o.length}
              onChange={(e) => setO({ ...o, length: Number(e.target.value) })}
              className="mt-3 w-full accent-[var(--text)]"
            />
            <div className="mt-2 flex gap-1.5">
              {[12, 16, 20, 32, 64].map((n) => (
                <Button key={n} variant={o.length === n ? 'secondary' : 'ghost'} size="xs" onClick={() => setO({ ...o, length: n })}>
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {SETS.map((set) => (
              <div key={set.key} className="flex items-center gap-2">
                <Switch id={`pw-${set.key}`} size="sm" checked={o[set.key]} onCheckedChange={(v) => setO({ ...o, [set.key]: v })} />
                <Label htmlFor={`pw-${set.key}`} className="cursor-pointer text-[13.5px] font-normal">
                  {set.label}
                </Label>
              </div>
            ))}
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch id="pw-ambiguous" size="sm" checked={o.excludeAmbiguous} onCheckedChange={(v) => setO({ ...o, excludeAmbiguous: v })} />
              <Label htmlFor="pw-ambiguous" className="cursor-pointer text-[13.5px] font-normal">
                Exclude ambiguous characters (I l 1 O 0)
              </Label>
            </div>
          </div>
        </div>

        {more.length > 0 && !none && (
          <div className="mt-6 border-t pt-4">
            <p className="mb-2 font-mono text-[11.5px] text-faint">more like this</p>
            <ul className="grid gap-1.5 md:grid-cols-2" aria-label="More passwords">
              {more.map((p, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border bg-background py-1 pr-1 pl-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-[13.5px]">{p}</span>
                  <IconButton label={`Copy password ${i + 2}`} onClick={() => copyText(p, 'Password copied')}>
                    <Copy />
                  </IconButton>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="-mx-4 mt-6 -mb-4 sm:-mx-6 sm:-mb-6">
          <StatusLine tone="ok">Made with crypto.getRandomValues in this tab. Nothing is stored or sent.</StatusLine>
        </div>
      </div>
    </>
  );
}
