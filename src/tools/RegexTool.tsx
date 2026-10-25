import { useEffect, useMemo, useRef, useState } from 'react';
import { FLAGS, MAX_MATCHES } from '@/lib/regex';
import { REGEX_TIMEOUT_MS, useRegex } from '@/lib/useRegex';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved, useSavedStatus } from './saved';

const EXAMPLE = {
  pattern: '(?<user>[\\w.+-]+)@(?<domain>[\\w-]+\\.[\\w.]+)',
  flags: ['g', 'i'],
  text: 'Contact ada.lovelace@example.com or grace+news@navy.mil.\nInvalid: alan@ and @turing.org\nSupport: help@toolspace.tech',
  replacement: '$<user> at $<domain>',
};

/** Matches listed under the editor (the editor highlights all of them). */
const LIST_LIMIT = 300;

const show = (s: string) => (s === '' ? '(empty)' : s.replace(/\n/g, '↵').replace(/\t/g, '→'));

export default function RegexTool() {
  const [pattern, setPattern] = useSaved('pattern', '');
  const [flags, setFlags] = useSaved<string[]>('flags', ['g'], (v) => Array.isArray(v) && v.every((f) => FLAGS.some((x) => x.flag === f)));
  const [text, setText] = useSaved('text', '');
  const [replaceOn, setReplaceOn] = useSaved('replaceOn', false);
  const [replacement, setReplacement] = useSaved('replacement', '');

  const flagString = FLAGS.map((f) => f.flag).filter((f) => flags.includes(f)).join('');
  // Bumped to run the same request again
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(
    () => ({ pattern, flags: flagString, text, replacement: replaceOn ? replacement : null, attempt }),
    [pattern, flagString, text, replaceOn, replacement, attempt],
  );
  const state = useRegex(request);
  // A restored input runs while the page is still loading, and the worker's start-up counts against
  // the time limit; so the first run gets one retry before it's called catastrophic
  const { restored } = useSavedStatus();
  const firstRun = useRef(true);
  useEffect(() => {
    if (state.status === 'done') firstRun.current = false;
    if (state.status === 'timeout' && firstRun.current && restored) {
      firstRun.current = false;
      setAttempt((a) => a + 1);
    }
  }, [state, restored]);
  const result = state.status === 'done' ? state.result : null;
  // Highlights only for the text they were computed on
  const highlights = useMemo(
    () => (state.status === 'done' && state.result.ok && state.text === text ? state.result.matches.map((m) => ({ from: m.start, to: m.end })) : null),
    [state, text],
  );

  const matchList = useMemo(() => (result?.ok ? result.matches.map((m) => m.value).join('\n') : ''), [result]);

  const status = (() => {
    if (!pattern) return <StatusLine tone="muted">Write a pattern, paste text to test it on, or load the example.</StatusLine>;
    if (state.status === 'timeout') {
      return (
        <StatusLine tone="error">
          Stopped after {REGEX_TIMEOUT_MS / 1000}s: this pattern backtracks catastrophically on this text (nested quantifiers like (a+)+ are the usual cause)
        </StatusLine>
      );
    }
    if (!result) return <StatusLine tone="muted">Matching…</StatusLine>;
    if (!result.ok) return <StatusLine tone="error">{result.message}</StatusLine>;
    const n = result.matches.length;
    return (
      <StatusLine tone={n ? 'ok' : 'muted'}>
        {n === 0 ? 'No matches' : `${result.truncated ? `${MAX_MATCHES.toLocaleString()}+` : n.toLocaleString()} match${n === 1 ? '' : 'es'}`}
        {n > 0 && result.matches[0]!.groups.length > 0 && `, ${result.matches[0]!.groups.length} group${result.matches[0]!.groups.length === 1 ? '' : 's'} each`}
      </StatusLine>
    );
  })();

  return (
    <>
      <ToolBar
        onExample={() => {
          setPattern(EXAMPLE.pattern);
          setFlags(EXAMPLE.flags);
          setText(EXAMPLE.text);
          setReplacement(EXAMPLE.replacement);
          setReplaceOn(true);
        }}
      >
        <ToggleGroup type="multiple" variant="outline" size="sm" value={flags} onValueChange={setFlags} aria-label="Flags">
          {FLAGS.map((f) => (
            <ToggleGroupItem key={f.flag} value={f.flag} aria-label={`${f.name} (${f.flag})`} className="font-mono">
              {/* Inside the item, so the tooltip doesn't overwrite its on/off state */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>{f.flag}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {f.flag}: {f.description}
                </TooltipContent>
              </Tooltip>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="regex-replace" size="sm" checked={replaceOn} onCheckedChange={setReplaceOn} />
          <Label htmlFor="regex-replace" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
            Replace
          </Label>
        </div>
      </ToolBar>

      <div className="flex items-center gap-1 border-b px-3 py-2.5 font-mono text-[15px]">
        <span className="text-faint" aria-hidden="true">
          /
        </span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="[a-z]+@[a-z]+\.com"
          aria-label="Regular expression"
          spellCheck={false}
          autoComplete="off"
          className="h-9 min-w-0 flex-1 bg-transparent px-1 outline-none placeholder:text-faint"
        />
        <span className="text-faint" aria-hidden="true">
          /{flagString}
        </span>
      </div>
      {replaceOn && (
        <div className="flex items-center gap-2 border-b px-3 py-2 font-mono text-[14px]">
          <span className="shrink-0 font-sans text-[12.5px] text-muted-foreground">replace with</span>
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="$1, $<name> or $&"
            aria-label="Replacement"
            spellCheck={false}
            autoComplete="off"
            className="h-8 min-w-0 flex-1 bg-transparent px-1 outline-none placeholder:text-faint"
          />
        </div>
      )}
      {status}

      <div className={replaceOn ? 'tool-panes' : undefined}>
        <Panel
          title="test text"
          onFile={setText}
          actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.log,.csv,.md,.json" />}
        >
          <CodeEditor
            value={text}
            onChange={setText}
            lang={null}
            wrap
            highlights={highlights}
            placeholder="Paste the text to test the pattern on"
            ariaLabel="Test text"
            className="tool-editor regex-editor"
          />
        </Panel>
        {replaceOn && (
          <Panel title="result" actions={<OutputActions text={result?.ok ? (result.replaced ?? '') : ''} fileName="replaced.txt" mime="text/plain" />}>
            <CodeEditor value={result?.ok ? (result.replaced ?? '') : ''} readOnly lang={null} wrap ariaLabel="Replace result" className="tool-editor regex-editor" />
          </Panel>
        )}
      </div>

      {result?.ok && result.matches.length > 0 && (
        <div className="flex h-11 items-center gap-2 border-t px-3">
          <span className="font-mono text-[12.5px] text-muted-foreground">matches</span>
          <span className="font-mono text-[11.5px] text-faint">one per line</span>
          <div className="ml-auto flex items-center gap-0.5">
            <OutputActions text={matchList} fileName="regex-results.txt" mime="text/plain" />
          </div>
        </div>
      )}
      {result?.ok && result.matches.length > 0 && (
        <div className="max-h-96 overflow-auto border-t">
          <table className="w-full text-left text-[13px]" aria-label="Matches">
            <thead className="sticky top-0 bg-card font-mono text-[11.5px] text-faint">
              <tr className="border-b">
                <th className="px-4 py-2 font-normal">#</th>
                <th className="px-2 py-2 font-normal">at</th>
                <th className="px-2 py-2 font-normal">match</th>
                <th className="px-2 py-2 font-normal">groups</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {result.matches.slice(0, LIST_LIMIT).map((m, i) => (
                <tr key={`${m.start}-${i}`} className="border-b align-top last:border-b-0">
                  <td className="px-4 py-1.5 text-faint tabular-nums">{i + 1}</td>
                  <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{m.start}</td>
                  <td className="px-2 py-1.5 break-all">
                    <span className="cm-match">{show(m.value)}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    {m.groups.map((g) => (
                      <span key={g.index} className="mr-3 inline-block">
                        <span className="text-faint">{g.name ?? g.index}:</span> {g.value == null ? <span className="text-faint">undefined</span> : show(g.value)}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.matches.length > LIST_LIMIT && (
            <p className="px-4 py-2 text-[12.5px] text-muted-foreground">
              Showing the first {LIST_LIMIT}; all {result.matches.length.toLocaleString()} are highlighted above.
            </p>
          )}
        </div>
      )}
    </>
  );
}
