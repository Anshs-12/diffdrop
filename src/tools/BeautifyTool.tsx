import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_INDENT,
  EXAMPLES,
  LANGS,
  MINIFIABLE,
  SQL_DIALECTS,
  detectLang,
  formatCode,
  langInfo,
  minifyCode,
  type CodeLang,
  type FormatResult,
  type KeywordCase,
  type SqlDialect,
} from '@/lib/beautify';
import type { Lang } from '@/lib/syntax';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine, byteLength, formatBytes } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

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

const INDENTS = ['default', '2', '4', 'tab'];
const WIDTHS = [80, 100, 120];
const KEYWORD_CASES: { id: KeywordCase; label: string }[] = [
  { id: 'upper', label: 'UPPER' },
  { id: 'lower', label: 'lower' },
  { id: 'preserve', label: 'As written' },
];
type Mode = 'format' | 'minify';

const isLang = (v: unknown) => v === 'auto' || LANGS.some((l) => l.id === v);

/** `fixedLang` starts the tool in one language (the per-language formatter pages). */
export default function BeautifyTool({ fixedLang }: { fixedLang?: CodeLang } = {}) {
  const [code, setCode] = useSaved('code', '');
  const [lang, setLang] = useSaved<CodeLang | 'auto'>('lang', fixedLang ?? 'auto', isLang);
  const [indentChoice, setIndentChoice] = useSaved('indent', 'default', (v) => INDENTS.includes(v as string));
  const [printWidth, setPrintWidth] = useSaved('width', 80, (v) => WIDTHS.includes(v as number));
  const [singleQuote, setSingleQuote] = useSaved('singleQuote', false);
  const [mode, setMode] = useSaved<Mode>('mode', 'format', (v) => v === 'format' || v === 'minify');
  const [dialect, setDialect] = useSaved<SqlDialect>('sqlDialect', 'sql', (v) => SQL_DIALECTS.some((d) => d.id === v));
  const [keywordCase, setKeywordCase] = useSaved<KeywordCase>('keywordCase', 'upper', (v) => KEYWORD_CASES.some((k) => k.id === v));
  const [result, setResult] = useState<FormatResult>({ ok: true, text: '' });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<CodeEditorHandle>(null);

  const actual: CodeLang = useMemo(() => (lang === 'auto' ? detectLang(code) : lang), [lang, code]);
  const info = langInfo(actual);
  const canMinify = MINIFIABLE.has(actual);
  const minifying = canMinify && mode === 'minify';
  const indent = indentChoice === 'default' ? DEFAULT_INDENT[actual] : indentChoice === 'tab' ? 'tab' : (Number(indentChoice) as 2 | 4);
  const quotes = !minifying && (actual === 'javascript' || actual === 'typescript' || actual === 'python');
  const hasWidth = !minifying && !['go', 'shell', 'sql', 'xml'].includes(actual);
  const isSql = actual === 'sql';

  useEffect(() => {
    if (!code.trim()) {
      setResult({ ok: true, text: '' });
      setBusy(false);
      return;
    }
    let current = true;
    setBusy(true);
    // Formatting runs off the keystroke, and only the latest run's result is kept
    const t = setTimeout(() => {
      const run = minifying ? minifyCode(code, actual) : formatCode(code, actual, { indent, printWidth, singleQuote, sqlDialect: dialect, keywordCase });
      run
        .catch((e: unknown): FormatResult => ({ ok: false, message: e instanceof Error ? e.message : String(e), line: null, column: null }))
        .then((r) => {
          if (!current) return;
          setResult(r);
          setBusy(false);
        });
    }, 120);
    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [code, actual, indent, printWidth, singleQuote, minifying, dialect, keywordCase]);

  const output = result.ok ? result.text : '';
  const verb = minifying ? 'Minified' : 'Formatted';
  const status = !code.trim() ? (
    <StatusLine tone="muted">
      {fixedLang && lang === fixedLang
        ? `Paste ${info.label} code, open a file, or load the example.`
        : `Paste code in any of ${LANGS.length} languages, or load the example.`}
    </StatusLine>
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
      {result.line != null && ` (line ${result.line}${result.column != null ? `, column ${result.column}` : ''})`}
    </StatusLine>
  ) : (
    <StatusLine tone={busy ? 'muted' : 'ok'}>
      {busy
        ? `${minifying ? 'Minifying' : 'Formatting'}…`
        : `${verb} as ${info.label}${lang === 'auto' ? ' (detected)' : ''}${
            minifying && output ? `: ${formatBytes(byteLength(code))} → ${formatBytes(byteLength(output))}` : ''
          }`}
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
        {canMinify && (
          <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as Mode)} aria-label="Output mode">
            <ToggleGroupItem value="format" aria-label="Format">
              Format
            </ToggleGroupItem>
            <ToggleGroupItem value="minify" aria-label="Minify">
              Minify
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        {!minifying && (
          <ToggleGroup type="single" variant="outline" size="sm" value={indentChoice} onValueChange={(v) => v && setIndentChoice(v)} aria-label="Indentation">
            <ToggleGroupItem value="default" title={`${info.label} convention: ${DEFAULT_INDENT[actual] === 'tab' ? 'tabs' : `${DEFAULT_INDENT[actual]} spaces`}`}>
              Default
            </ToggleGroupItem>
            <ToggleGroupItem value="2">2 spaces</ToggleGroupItem>
            <ToggleGroupItem value="4">4 spaces</ToggleGroupItem>
            <ToggleGroupItem value="tab">Tabs</ToggleGroupItem>
          </ToggleGroup>
        )}
        {hasWidth && (
          <select
            value={printWidth}
            onChange={(e) => setPrintWidth(Number(e.target.value))}
            aria-label="Line width"
            className="h-8 rounded-md border bg-background px-2 text-[13px]"
          >
            {WIDTHS.map((w) => (
              <option key={w} value={w}>
                {w} columns
              </option>
            ))}
          </select>
        )}
        {isSql && (
          <>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value as SqlDialect)}
              aria-label="SQL dialect"
              className="h-8 rounded-md border bg-background px-2 text-[13px]"
            >
              {SQL_DIALECTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <ToggleGroup type="single" variant="outline" size="sm" value={keywordCase} onValueChange={(v) => v && setKeywordCase(v as KeywordCase)} aria-label="Keyword case">
              {KEYWORD_CASES.map((k) => (
                <ToggleGroupItem key={k.id} value={k.id} title={`Keywords: ${k.label}`}>
                  {k.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        )}
        {quotes && (
          <div className="flex items-center gap-2">
            <Switch id="single-quote" size="sm" checked={singleQuote} onCheckedChange={setSingleQuote} />
            <Label htmlFor="single-quote" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
              Single quotes
            </Label>
          </div>
        )}
      </ToolBar>
      {status}
      <div className="tool-panes">
        <Panel title="code" onFile={setCode} actions={<InputActions onLoad={setCode} onClear={() => setCode('')} canClear={!!code} accept={ACCEPT} />}>
          <CodeEditor
            ref={inputRef}
            value={code}
            onChange={setCode}
            lang={SYNTAX[actual]}
            errorLine={!result.ok ? result.line : null}
            placeholder={
              fixedLang && lang === fixedLang ? `Paste ${info.label} code or drop a .${info.ext} file` : 'Paste code: Python, Java, C++, C#, Go, JavaScript, TypeScript, PHP, SQL…'
            }
            ariaLabel="Code to format"
            className="tool-editor"
          />
        </Panel>
        <Panel
          title={minifying ? 'minified' : 'formatted'}
          actions={<OutputActions text={output} fileName={`${minifying ? 'minified' : 'formatted'}.${info.ext}`} mime={info.mime} />}
        >
          <CodeEditor value={output} readOnly lang={SYNTAX[actual]} wrap={minifying} ariaLabel="Formatted code" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
