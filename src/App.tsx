import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { useDiffWorker } from '@/lib/useDiffWorker';
import type { DiffLine, DiffOptions, Hunk } from '@/lib/diffProcessor';
import { buildSplitRows, buildUnifiedRows } from '@/lib/rows';
import { buildLineMarks } from '@/lib/marks';
import { generatePatch } from '@/lib/patch';
import { applyMerge } from '@/lib/merge';
import { decodeHash, encodeHash } from '@/lib/share';
import { useTheme } from '@/lib/theme';
import { SAMPLE_CHANGED, SAMPLE_JSON_CHANGED, SAMPLE_JSON_ORIGINAL, SAMPLE_ORIGINAL } from '@/lib/sample';
import { checkJson, formatJson } from '@/lib/json';
import type { Variant } from '@/variant';
import JsonBar from '@/components/JsonBar';
import { detectLang } from '@/lib/syntax';
import { summarizeDiff } from '@/lib/summary';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader from '@/components/SiteHeader';
import EditorPanel, { type EditorPaneHandle } from '@/components/EditorPanel';
import Toolbar, { type HighlightPlacement, type ToolbarOptions, type ViewMode } from '@/components/Toolbar';
import DiffViewport, { type DiffViewportHandle } from '@/components/DiffViewport';
import { FullSplitTable, type RowContext } from '@/components/DiffRows';
import FindBar from '@/components/FindBar';
import SummaryPanel from '@/components/SummaryPanel';
import { Features, Footer, Hero, JsonGuide, Paywall, Privacy, ToolCards } from '@/components/Landing';
import { LogoMark } from '@/components/Icons';

interface Snapshot {
  original: string;
  changed: string;
}

/** Above this many rows (after folding unchanged lines), printing is refused. */
const MAX_PRINT_ROWS = 20_000;

function isTypingTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable);
}

const notify = (message: string) => toast(message);

/**
 * Where this copy of diffdrop is served from, read at runtime so it follows whatever
 * domain the site is deployed on. The #fragment (shared texts) is never included.
 */
function siteUrl(): string {
  const { origin, pathname, href } = window.location;
  const url = origin && origin !== 'null' ? `${origin}${pathname}` : href.split('#')[0]!;
  return url.replace(/index\.html$/, '');
}

/** First line of a hunk on one side, or the nearest line above it when that side has none. */
function hunkLine(lines: DiffLine[], hunk: Hunk, side: 'leftNum' | 'rightNum'): number {
  for (let i = hunk.startIndex; i < hunk.endIndex; i++) {
    const n = lines[i]![side];
    if (n != null) return n;
  }
  for (let i = hunk.startIndex - 1; i >= 0; i--) {
    const n = lines[i]![side];
    if (n != null) return n;
  }
  return 1;
}

const App: React.FC<{ variant: Variant }> = ({ variant }) => {
  const isJson = variant === 'json';
  const { choice: theme, resolved: resolvedTheme, setChoice: setTheme } = useTheme();

  // Decode shared texts from the URL fragment on first render
  const shared = useMemo(() => decodeHash(window.location.hash), []);

  const [originalText, setOriginalText] = useState(shared?.original ?? '');
  const [changedText, setChangedText] = useState(shared?.changed ?? '');
  const [originalName, setOriginalName] = useState<string | null>(null);
  const [changedName, setChangedName] = useState<string | null>(null);

  const [placement, setPlacement] = useState<HighlightPlacement>('below');
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    window.matchMedia('(max-width: 720px)').matches ? 'unified' : 'split',
  );
  const [options, setOptions] = useState<ToolbarOptions>({
    ignoreWhitespace: false,
    ignoreCase: false,
    charLevel: false,
    syntax: true,
    collapseUnchanged: false,
    lineWrap: false,
  });
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [currentHunk, setCurrentHunk] = useState(0);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [findQuery, setFindQuery] = useState('');
  const [findIndex, setFindIndex] = useState(0);
  const viewportRef = useRef<DiffViewportHandle>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const leftEditorRef = useRef<EditorPaneHandle>(null);
  const rightEditorRef = useRef<EditorPaneHandle>(null);

  const diffOptions: DiffOptions = useMemo(
    () => ({
      ignoreWhitespace: options.ignoreWhitespace,
      ignoreCase: options.ignoreCase,
      charLevel: options.charLevel,
      ignorePatterns,
    }),
    [options.ignoreWhitespace, options.ignoreCase, options.charLevel, ignorePatterns],
  );

  // Syntax languages (detected from the file name, or the start of the text)
  const leftLang = useMemo(() => detectLang(originalText, originalName), [originalText, originalName]);
  const rightLang = useMemo(() => detectLang(changedText, changedName), [changedText, changedName]);
  const syntaxLeft = options.syntax ? leftLang : null;
  const syntaxRight = options.syntax ? rightLang : null;

  const { result, input, error, pending } = useDiffWorker(
    originalText,
    changedText,
    diffOptions,
    syntaxLeft,
    syntaxRight,
  );
  const isEmpty = !originalText && !changedText;
  const lines = useMemo(() => (isEmpty ? [] : result?.lines ?? []), [isEmpty, result]);
  const hunks = useMemo(() => (isEmpty ? [] : result?.hunks ?? []), [isEmpty, result]);
  const stats = isEmpty ? null : result?.stats ?? null;

  const inEditor = placement === 'editor';
  const rowModel = useMemo(
    () => (viewMode === 'split' ? buildSplitRows : buildUnifiedRows)(lines, options.collapseUnchanged),
    [lines, viewMode, options.collapseUnchanged],
  );

  // Summary only when it's open (it walks the whole diff)
  const summary = useMemo(
    () => (summaryOpen && result && !isEmpty ? summarizeDiff(result) : null),
    [summaryOpen, result, isEmpty],
  );

  // In-editor highlights; only word-level when the diff matches what's in the boxes right now
  const marks = useMemo(() => (inEditor ? buildLineMarks(lines) : null), [inEditor, lines]);
  const marksFresh = input?.originalText === originalText && input?.changedText === changedText;

  // ── Find in diff (the table only renders visible rows, so the browser's own find can't see them) ──

  const find = findQuery.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!find || inEditor) return [];
    const out: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (rowModel.rowOfLine[i]! < 0) continue; // folded away
      const l = lines[i]!;
      if (l.leftContent?.toLowerCase().includes(find) || l.rightContent?.toLowerCase().includes(find)) out.push(i);
    }
    return out;
  }, [find, inEditor, lines, rowModel]);

  useEffect(() => {
    setFindIndex(0);
  }, [find]);

  const currentMatch = matches.length ? matches[Math.min(findIndex, matches.length - 1)]! : -1;

  const goToMatch = useCallback(
    (delta: number) => {
      if (!matches.length) return;
      const next = (findIndex + delta + matches.length) % matches.length;
      setFindIndex(next);
      viewportRef.current?.scrollToLine(matches[next]!);
    },
    [matches, findIndex],
  );

  // Jump to the first match as you type
  useEffect(() => {
    if (matches.length) viewportRef.current?.scrollToLine(matches[0]!);
  }, [matches]);

  // Keep the hunk cursor valid as the diff changes
  useEffect(() => {
    setCurrentHunk((h) => Math.min(h, Math.max(0, hunks.length - 1)));
  }, [hunks.length]);

  // ── Text updates ──

  const setOriginal = useCallback((text: string, name: string | null) => {
    setOriginalText(text);
    setOriginalName(name);
  }, []);

  const setChanged = useCallback((text: string, name: string | null) => {
    setChangedText(text);
    setChangedName(name);
  }, []);

  const pushUndo = useCallback(() => {
    setUndoStack((s) => [...s.slice(-49), { original: originalText, changed: changedText }]);
  }, [originalText, changedText]);

  const handleUndo = useCallback(() => {
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    setOriginalText(entry.original);
    setChangedText(entry.changed);
    setUndoStack((s) => s.slice(0, -1));
    notify('Undone');
  }, [undoStack]);

  // ── Hunk navigation ──

  const scrollToHunk = useCallback(
    (index: number) => {
      if (hunks.length === 0) return;
      // Wrap around at either end
      const next = (index + hunks.length) % hunks.length;
      setCurrentHunk(next);
      const hunk = hunks[next]!;

      if (inEditor) {
        leftEditorRef.current?.scrollToLine(hunkLine(lines, hunk, 'leftNum'));
        rightEditorRef.current?.scrollToLine(hunkLine(lines, hunk, 'rightNum'));
        return;
      }
      viewportRef.current?.scrollToLine(hunk.startIndex);
    },
    [hunks, lines, inEditor],
  );

  const handlePrevHunk = useCallback(() => scrollToHunk(currentHunk - 1), [currentHunk, scrollToHunk]);
  const handleNextHunk = useCallback(() => scrollToHunk(currentHunk + 1), [currentHunk, scrollToHunk]);

  // Keyboard: Alt+↑/↓ changes, ⌘/Ctrl+Z undoes a merge, ⌘/Ctrl+F finds in the diff
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        if (hunks.length === 0) return;
        e.preventDefault();
        if (e.key === 'ArrowDown') handleNextHunk();
        else handlePrevHunk();
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (undoStack.length === 0 || isTypingTarget(e.target)) return;
        e.preventDefault();
        handleUndo();
        return;
      }
      // Only while the diff panel is on screen and focus isn't in an editor (they have their own search)
      if (mod && e.key.toLowerCase() === 'f' && !inEditor && result && !isTypingTarget(e.target)) {
        const panel = document.querySelector('.diff-scroll')?.getBoundingClientRect();
        if (!panel || panel.bottom < 0 || panel.top > window.innerHeight) return;
        e.preventDefault();
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hunks.length, undoStack.length, handleNextHunk, handlePrevHunk, handleUndo, inEditor, result]);

  // ── Merge ──

  const handleMergeLeftToRight = useCallback(
    (index: number) => {
      const next = applyMerge(lines, index, 'toRight', originalText, changedText);
      if (next == null) return;
      pushUndo();
      setChangedText(next);
      notify('Copied to b');
    },
    [lines, originalText, changedText, pushUndo],
  );

  const handleMergeRightToLeft = useCallback(
    (index: number) => {
      const next = applyMerge(lines, index, 'toLeft', changedText, originalText);
      if (next == null) return;
      pushUndo();
      setOriginalText(next);
      notify('Copied to a');
    },
    [lines, originalText, changedText, pushUndo],
  );

  // ── Actions ──

  const handleSwap = useCallback(() => {
    setOriginalText(changedText);
    setChangedText(originalText);
    setOriginalName(changedName);
    setChangedName(originalName);
  }, [originalText, changedText, originalName, changedName]);

  const handleExample = useCallback(() => {
    if (isJson) {
      setOriginal(SAMPLE_JSON_ORIGINAL, 'package.json');
      setChanged(SAMPLE_JSON_CHANGED, 'package.json');
    } else {
      setOriginal(SAMPLE_ORIGINAL, 'cart.js');
      setChanged(SAMPLE_CHANGED, 'cart.js');
    }
    setUndoStack([]);
    document.getElementById('try')?.scrollIntoView({ behavior: 'smooth' });
  }, [isJson, setOriginal, setChanged]);

  // ── JSON page ──

  const leftJson = useMemo(() => (isJson ? checkJson(originalText) : null), [isJson, originalText]);
  const rightJson = useMemo(() => (isJson ? checkJson(changedText) : null), [isJson, changedText]);

  const handleFormatJson = useCallback(() => {
    const a = formatJson(originalText);
    const b = formatJson(changedText);
    if (a == null && b == null) {
      toast.error('Neither side is valid JSON yet');
      return;
    }
    if ((a ?? originalText) === originalText && (b ?? changedText) === changedText) {
      notify('Already formatted');
      return;
    }
    pushUndo();
    if (a != null) setOriginalText(a);
    if (b != null) setChangedText(b);
    if (a == null || b == null) toast(`Formatted ${a == null ? 'b' : 'a'} only; the other side isn't valid JSON`);
    else toast.success('Formatted both sides, keys sorted A–Z');
  }, [originalText, changedText, pushUndo]);

  const patch = useCallback(
    () => (result ? generatePatch(lines, result.eof, originalName ?? 'original', changedName ?? 'changed') : ''),
    [lines, result, originalName, changedName],
  );

  const handleShare = useCallback(async () => {
    const hash = encodeHash(originalText, changedText);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    history.replaceState(null, '', `#${hash}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', { description: 'Both texts are inside it, after the #.' });
    } catch {
      notify('Link updated in the address bar');
    }
  }, [originalText, changedText]);

  const handleCopy = useCallback(async () => {
    const text = patch();
    if (!text) {
      notify('No differences to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Unified diff copied');
    } catch {
      toast.error('Clipboard unavailable');
    }
  }, [patch]);

  const handleDownload = useCallback(() => {
    const text = patch();
    if (!text) {
      notify('No differences to export');
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'text/x-diff' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(changedName ?? 'changes').replace(/\.[^.]+$/, '')}.patch`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success('Patch downloaded');
  }, [patch, changedName]);

  // The printout shows changes with 3 lines of context (like a patch), not whole files
  const printModel = useMemo(() => (printing ? buildSplitRows(lines, true) : null), [printing, lines]);

  const handlePrint = useCallback(() => {
    if (isEmpty || !result) {
      notify('Nothing to export yet');
      return;
    }
    if (hunks.length === 0) {
      notify('No differences to print');
      return;
    }
    if (buildSplitRows(lines, true).rows.length > MAX_PRINT_ROWS) {
      toast.error('Too many changes to print', { description: 'Download the .patch instead.' });
      return;
    }
    setPrinting(true);
  }, [isEmpty, result, hunks.length, lines]);

  // Print only the diff (see .print-only in index.css); the browser offers "Save as PDF"
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    document.body.classList.add('is-printing');
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => window.print(), 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('is-printing');
    };
  }, [printing]);

  const handleOptionChange = useCallback((key: keyof ToolbarOptions, value: boolean) => {
    setOptions((o) => ({ ...o, [key]: value }));
  }, []);

  const rowCtx: RowContext = useMemo(
    () => ({
      lines,
      lineWrap: options.lineWrap,
      syntax: {
        left: syntaxLeft,
        right: syntaxRight,
        leftStates: result?.leftStates ?? null,
        rightStates: result?.rightStates ?? null,
      },
      find,
      currentMatch,
      onMergeLeftToRight: handleMergeLeftToRight,
      onMergeRightToLeft: handleMergeRightToLeft,
    }),
    [lines, options.lineWrap, syntaxLeft, syntaxRight, result, find, currentMatch, handleMergeLeftToRight, handleMergeRightToLeft],
  );

  // ── Diff body (separate panel) ──

  let body: React.ReactNode;
  if (isEmpty) {
    body = (
      <div className="diff-scroll">
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground">
          <p>Paste or drop something into a and b, and the differences show up here.</p>
          <Button variant="outline" size="sm" onClick={handleExample}>
            Load an example <ArrowRight />
          </Button>
        </div>
      </div>
    );
  } else if (error) {
    body = (
      <div className="diff-scroll">
        <div className="flex min-h-52 flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Couldn't compute the diff</p>
          <p>{error}</p>
        </div>
      </div>
    );
  } else if (!result) {
    body = (
      <div className="diff-scroll">
        <div className="grid min-h-52 place-items-center">
          <span
            className="size-4 animate-spin rounded-full border-[1.5px] border-input border-t-foreground"
            aria-label="Computing diff"
          />
        </div>
      </div>
    );
  } else {
    body = (
      <DiffViewport
        ref={viewportRef}
        mode={viewMode}
        model={rowModel}
        ctx={rowCtx}
        maxColumns={result.maxColumns}
        pending={pending}
      />
    );
  }

  const identical = !isEmpty && result != null && !error && hunks.length === 0;

  return (
    <TooltipProvider delayDuration={300}>
      <SiteHeader current={isJson ? 'json-diff' : 'home'} theme={theme} onThemeChange={setTheme} />
      <main>
        <Hero variant={variant} onTryExample={handleExample} />

        <section className="scroll-mt-20 pb-20" id="try" aria-label="Compare texts">
          <div className="page-wide">
            <div className="workspace">
              <Toolbar
                placement={placement}
                onPlacementChange={setPlacement}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                options={options}
                onOptionChange={handleOptionChange}
                ignorePatterns={ignorePatterns}
                onIgnorePatternsChange={setIgnorePatterns}
                stats={stats}
                hunkCount={hunks.length}
                currentHunk={currentHunk}
                onPrevHunk={handlePrevHunk}
                onNextHunk={handleNextHunk}
                canUndo={undoStack.length > 0}
                onUndo={handleUndo}
                onSwap={handleSwap}
                onShare={handleShare}
                summaryOpen={summaryOpen}
                onToggleSummary={() => setSummaryOpen((o) => !o)}
                onCopy={handleCopy}
                onDownload={handleDownload}
                onPrint={handlePrint}
              />

              {summaryOpen && (
                <SummaryPanel
                  summary={summary ?? { headline: 'Paste two texts to get a summary.', points: [] }}
                  getPatch={patch}
                  diffKey={result}
                  onClose={() => setSummaryOpen(false)}
                />
              )}

              {isJson && leftJson && rightJson && (
                <JsonBar left={leftJson} right={rightJson} onFormat={handleFormatJson} />
              )}

              <EditorPanel
                originalText={originalText}
                changedText={changedText}
                originalName={originalName}
                changedName={changedName}
                leftMarks={marks?.left ?? null}
                rightMarks={marks?.right ?? null}
                marksFresh={marksFresh}
                leftSyntax={syntaxLeft}
                rightSyntax={syntaxRight}
                tall={inEditor}
                leftRef={leftEditorRef}
                rightRef={rightEditorRef}
                onOriginalChange={setOriginal}
                onChangedChange={setChanged}
                onError={(m) => toast.error(m)}
              />

              {identical && (
                <div className="flex items-center gap-2 border-t px-4 py-2 font-mono text-[12.5px] text-add">
                  <CircleCheck className="size-3.5" /> a and b are identical
                  {(options.ignoreCase || options.ignoreWhitespace || ignorePatterns.length > 0) &&
                    ' (with the current ignore options)'}
                </div>
              )}

              {!inEditor && result && !isEmpty && !error && (
                <FindBar
                  inputRef={findInputRef}
                  query={findQuery}
                  onQueryChange={setFindQuery}
                  count={matches.length}
                  index={matches.length ? Math.min(findIndex, matches.length - 1) : -1}
                  onPrev={() => goToMatch(-1)}
                  onNext={() => goToMatch(1)}
                />
              )}

              {!inEditor && body}
            </div>
          </div>
        </section>

        {isJson && <JsonGuide />}
        <ToolCards current={isJson ? 'json-diff' : 'home'} />
        <Features />
        <Paywall />
        <Privacy />
      </main>
      <Footer current={isJson ? 'json-diff' : 'home'} />

      {printing && result && printModel && (
        <div className="print-only">
          <FullSplitTable
            rows={printModel.rows}
            ctx={{ ...rowCtx, lineWrap: true, find: '', currentMatch: -1, onMergeLeftToRight: undefined, onMergeRightToLeft: undefined }}
            header={
              <div className="print-brand">
                <span className="print-brand-name">
                  <LogoMark size={20} /> diffdrop
                </span>
                <span className="print-brand-url">{siteUrl()}</span>
                <span className="print-brand-meta">
                  a: {originalName ?? 'original'} → b: {changedName ?? 'changed'} · +{result.stats.added} −
                  {result.stats.removed} · {new Date().toLocaleString()}
                </span>
              </div>
            }
          />
          <p className="print-foot">
            Compared with diffdrop at {siteUrl()}. The diff was computed in the browser; nothing was uploaded.
          </p>
        </div>
      )}
      <Toaster theme={resolvedTheme} position="bottom-center" />
    </TooltipProvider>
  );
};

export default App;
