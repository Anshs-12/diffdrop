import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_INDENT, EXAMPLES, LANGS, detectLang, formatCode, langInfo, minifyCss, type CodeLang, type FormatResult } from '@/lib/beautify';
import type { Lang } from '@/lib/syntax';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';

const IS_EXAMPLE = new Set(Object.values(EXAMPLES));

/** Editor syntax colors for each language. */
const SYNTAX: Record<CodeLang, Lang | null> = {
  javascript: 'c',
  typescript: 'c',
  java: 'c',
  csharp: 'c',
  cpp: 'c',
  c: 'c',
  go: 'c',
  php: 'c',
  python: 'hash',
  shell: 'hash',
  lua: null,
  json: 'c',
  css: 'c',
  html: 'markup',
  xml: 'markup',
  markdown: null,
  yaml: 'hash',
  sql: null,
};

const ACCEPT =
  '.js,.mjs,.cjs,.jsx,.ts,.tsx,.py,.java,.cs,.cpp,.cc,.cxx,.hpp,.h,.c,.go,.php,.lua,.sh,.bash,.zsh,.json,.css,.scss,.html,.htm,.md,.markdown,.yaml,.yml,.sql,.xml,.svg,.txt';

export default function BeautifyTool() {
  const [code, setCode] = useState('');
  const [lang, setLang] = useState<CodeLang | 'auto'>('auto');
  const [indentChoice, setIndentChoice] = useState<2 | 4 | 'tab' | 'default'>('default');
  const [printWidth, setPrintWidth] = useState(80);
  const [singleQuote, setSingleQuote] = useState(false);
  const [minify, setMinify] = useState(false);
  const [result, setResult] = useState<FormatResult>({ ok: true, text: '' });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<CodeEditorHandle>(null);

  const actual: CodeLang = useMemo(() => (lang === 'auto' ? detectLang(code) : lang), [lang, code]);
  const info = langInfo(actual);
  const indent = indentChoice === 'default' ? DEFAULT_INDENT[actual] : indentChoice;
  const quotes = actual === 'javascript' || actual === 'typescript' || actual === 'python';
  const hasWidth = !['go', 'shell', 'sql', 'xml'].includes(actual);

  useEffect(() => {
    if (!code.trim()) {
      setResult({ ok: true, text: '' });
      return;
    }
    if (minify && actual === 'css') {
      setResult({ ok: true, text: minifyCss(code) });
      return;
    }
    let current = true;
    setBusy(true);
    // Formatting runs off the keystroke, and only the latest run's result is kept
    const t = setTimeout(() => {
      void formatCode(code, actual, { indent, printWidth, singleQuote }).then((r) => {
        if (!current) return;
        setResult(r);
        setBusy(false);
      });
    }, 120);
    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [code, actual, indent, printWidth, singleQuote, minify]);

  const status = !code.trim() ? (
    <StatusLine tone="muted">Paste code in any of {LANGS.length} languages, or load the example.</StatusLine>
  ) : !result.ok ? (
    <StatusLine
      tone="error"
      action={
        result.line != null && (
          <button type="button" className="underline underline-offset-2" onClick={() => inputRef.current?.goToLine(result.line!, result.column ?? 1)}>
            Go to line {result.line}
          </button>
        )
      }
    >
      {info.label}: {result.message}
    </StatusLine>
  ) : (
    <StatusLine tone={busy ? 'muted' : 'ok'}>
      {busy ? 'Formatting…' : `${minify && actual === 'css' ? 'Minified' : 'Formatted'} as ${info.label}${lang === 'auto' ? ' (detected)' : ''}`}
    </StatusLine>
  );

  return (
    <>
      <ToolBar onExample={() => setCode(EXAMPLES[actual])}>
        <select
          value={lang}
          onChange={(e) => {
            const next = e.target.value as CodeLang | 'auto';
            setLang(next);
            // Showing an example (or nothing)? Show the new language's example instead
            if (next !== 'auto' && (!code.trim() || IS_EXAMPLE.has(code))) setCode(EXAMPLES[next]);
          }}
          aria-label="Language"
          className="h-8 rounded-md border bg-background px-2 text-[13px]"
        >
          <option value="auto">Auto-detect ({info.label})</option>
          {(['Programming languages', 'Web and data'] as const).map((group) => (
            <optgroup key={group} label={group}>
              {LANGS.filter((l) => l.group === group).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(indentChoice)}
          onValueChange={(v) => v && setIndentChoice(v === 'tab' || v === 'default' ? v : (Number(v) as 2 | 4))}
          aria-label="Indentation"
        >
          <ToggleGroupItem value="default" title={`${info.label} convention: ${DEFAULT_INDENT[actual] === 'tab' ? 'tabs' : `${DEFAULT_INDENT[actual]} spaces`}`}>
            Default
          </ToggleGroupItem>
          <ToggleGroupItem value="2">2 spaces</ToggleGroupItem>
          <ToggleGroupItem value="4">4 spaces</ToggleGroupItem>
          <ToggleGroupItem value="tab">Tabs</ToggleGroupItem>
        </ToggleGroup>
        {hasWidth && (
          <select
            value={printWidth}
            onChange={(e) => setPrintWidth(Number(e.target.value))}
            aria-label="Line width"
            className="h-8 rounded-md border bg-background px-2 text-[13px]"
          >
            {[80, 100, 120].map((w) => (
              <option key={w} value={w}>
                {w} columns
              </option>
            ))}
          </select>
        )}
        {quotes && (
          <div className="flex items-center gap-2">
            <Switch id="single-quote" size="sm" checked={singleQuote} onCheckedChange={setSingleQuote} />
            <Label htmlFor="single-quote" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
              Single quotes
            </Label>
          </div>
        )}
        {actual === 'css' && (
          <div className="flex items-center gap-2">
            <Switch id="css-minify" size="sm" checked={minify} onCheckedChange={setMinify} />
            <Label htmlFor="css-minify" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
              Minify
            </Label>
          </div>
        )}
      </ToolBar>
      {status}
      <div className="tool-panes">
        <Panel title="code" actions={<InputActions onLoad={setCode} onClear={() => setCode('')} canClear={!!code} accept={ACCEPT} />}>
          <CodeEditor
            ref={inputRef}
            value={code}
            onChange={setCode}
            lang={SYNTAX[actual]}
            errorLine={!result.ok ? result.line : null}
            placeholder="Paste code: Python, Java, C++, C#, Go, JavaScript, TypeScript, PHP, SQL…"
            ariaLabel="Code to format"
            className="tool-editor"
          />
        </Panel>
        <Panel title="formatted" actions={<OutputActions text={result.ok ? result.text : ''} fileName={`formatted.${info.ext}`} mime={info.mime} />}>
          <CodeEditor value={result.ok ? result.text : ''} readOnly lang={SYNTAX[actual]} ariaLabel="Formatted code" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
