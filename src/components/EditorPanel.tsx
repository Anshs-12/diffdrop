import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { EditorState, RangeSet, RangeSetBuilder, StateEffect, StateField, type Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  GutterMarker,
  ViewPlugin,
  gutterLineClass,
  keymap,
  lineNumbers,
  placeholder,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { search, searchKeymap } from '@codemirror/search';
import type { LineMarks } from '@/lib/marks';
import { tokenizeLine, type Lang, type LineState } from '@/lib/syntax';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Files above this size are rejected to keep the tab responsive. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Above this many lines, changes are reported to the app after a short pause instead of per keystroke. */
const LARGE_DOC_LINES = 50_000;

/**
 * Inserting more than this many lines through a normal edit makes CodeMirror draw
 * every inserted line once (its drawn range stretches over the insertion) before
 * trimming back to the viewport. Bigger insertions load a fresh document instead.
 */
const LARGE_INSERT_LINES = 2_000;

function countNewlines(text: string, limit = Infinity): number {
  let n = 0;
  for (let i = text.indexOf('\n'); i !== -1 && n < limit; i = text.indexOf('\n', i + 1)) n++;
  return n;
}

export interface EditorPaneHandle {
  scrollToLine: (line: number) => void;
}

// ─────────────────────────────────────────────────────────────
// Diff highlights: line backgrounds, word marks and gutter colors
// ─────────────────────────────────────────────────────────────

interface DiffMarksValue {
  marks: LineMarks | null;
  /** Whether the marks were computed from exactly the current text. */
  fresh: boolean;
}

const setDiffMarks = StateEffect.define<DiffMarksValue>();

const diffMarksField = StateField.define<DiffMarksValue>({
  create: () => ({ marks: null, fresh: false }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setDiffMarks)) return e.value;
    // Once the text changes, word positions no longer line up
    return tr.docChanged && value.fresh ? { ...value, fresh: false } : value;
  },
});

class GutterClass extends GutterMarker {
  constructor(readonly cls: string) {
    super();
    this.elementClass = cls;
  }
  override eq(other: GutterMarker) {
    return other instanceof GutterClass && other.cls === this.cls;
  }
}
const gutterAdd = new GutterClass('cm-gutter-add');
const gutterDel = new GutterClass('cm-gutter-del');

/** Gutter (line number) colors for every changed line in the document. */
const gutterField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(value, tr) {
    const effect = tr.effects.find((e) => e.is(setDiffMarks));
    if (!effect) return tr.docChanged ? value.map(tr.changes) : value;
    const { marks } = effect.value as DiffMarksValue;
    if (!marks) return RangeSet.empty;
    const doc = tr.state.doc;
    const builder = new RangeSetBuilder<GutterMarker>();
    // Map iteration follows line order (marks are built in diff order)
    for (const [n, m] of marks) {
      if (n > doc.lines) break;
      const from = doc.line(n).from;
      builder.add(from, from, m.kind === 'add' ? gutterAdd : gutterDel);
    }
    return builder.finish();
  },
  provide: (f) => gutterLineClass.from(f),
});

// ─────────────────────────────────────────────────────────────
// Syntax colors (our tokenizer), with an incremental block-comment cache
// ─────────────────────────────────────────────────────────────

const setLang = StateEffect.define<Lang | null>();
const langField = StateField.define<Lang | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setLang)) return e.value;
    return value;
  },
});

const lineDeco = {
  add: Decoration.line({ class: 'cm-diff-add' }),
  del: Decoration.line({ class: 'cm-diff-del' }),
};
const markDeco: Record<string, Decoration> = {};
const mark = (cls: string) => (markDeco[cls] ??= Decoration.mark({ class: cls }));

/**
 * Decorations for the visible lines only: diff backgrounds, word highlights and
 * syntax colors. Block-comment states are cached per line and recomputed only
 * from the first edited line onwards, up to what is on screen.
 */
const highlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    /** states[n] = block-comment state at the start of line n (1-based). */
    states = new Uint8Array(0);
    /** Lines 1..valid have a known start state. */
    valid = 0;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(u: ViewUpdate) {
      const langChanged = u.startState.field(langField) !== u.state.field(langField);
      if (langChanged) this.valid = 0;
      if (u.docChanged) {
        let first = Infinity;
        u.changes.iterChangedRanges((fromA) => {
          first = Math.min(first, u.startState.doc.lineAt(fromA).number);
        });
        // The edited line's own start state is still right; everything after may change
        this.valid = Math.min(this.valid, first);
      }
      const marksChanged = u.startState.field(diffMarksField) !== u.state.field(diffMarksField);
      if (u.docChanged || u.viewportChanged || marksChanged || langChanged) this.decorations = this.build(u.view);
    }

    /** Make sure start states are known for lines 1..n. */
    statesUpTo(view: EditorView, lang: Lang, n: number) {
      if (this.states.length < n + 2) {
        const grown = new Uint8Array(Math.max(n + 2, this.states.length * 2));
        grown.set(this.states.subarray(0, Math.min(this.states.length, this.valid + 1)));
        this.states = grown;
      }
      const doc = view.state.doc;
      if (this.valid < 1) {
        this.states[1] = 0;
        this.valid = 1;
      }
      for (let l = this.valid; l < n; l++) {
        this.states[l + 1] = tokenizeLine(doc.line(l).text, lang, this.states[l] as LineState).state;
      }
      this.valid = Math.max(this.valid, n);
    }

    build(view: EditorView): DecorationSet {
      const { marks, fresh } = view.state.field(diffMarksField);
      const lang = view.state.field(langField);
      const blocky = lang === 'c' || lang === 'markup';
      const doc = view.state.doc;
      const out: Range<Decoration>[] = [];

      for (const { from, to } of view.visibleRanges) {
        const lastLine = doc.lineAt(to).number;
        if (lang && blocky) this.statesUpTo(view, lang, lastLine);
        for (let n = doc.lineAt(from).number; n <= lastLine; n++) {
          const line = doc.line(n);
          const m = marks?.get(n);
          if (m) {
            out.push(lineDeco[m.kind].range(line.from));
            if (fresh && m.spans) {
              let pos = line.from;
              for (const s of m.spans) {
                const end = Math.min(pos + s.text.length, line.to);
                if (s.type !== 'equal' && end > pos) {
                  out.push(mark(s.type === 'added' ? 'inline-added' : 'inline-removed').range(pos, end));
                }
                pos = end;
              }
            }
          }
          // Very long lines (minified files) are left uncolored to keep scrolling smooth
          if (lang && line.length > 0 && line.length < 20_000) {
            const state = (blocky ? this.states[n] ?? 0 : 0) as LineState;
            for (const t of tokenizeLine(line.text, lang, state).tokens) {
              out.push(mark(`tok-${t.kind}`).range(line.from + t.start, line.from + t.end));
            }
          }
        }
      }
      return Decoration.set(out, true);
    }
  },
  { decorations: (v) => v.decorations },
);

const editorTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--text)' },
  '&.cm-focused': { outline: 'none' },
  // The scroller must scroll vertically itself; otherwise CodeMirror thinks every line is
  // visible and renders the whole document instead of just the viewport
  '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '21px', overflow: 'auto' },
  '.cm-content': { padding: '10px 0', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0 14px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--text-faint)',
    borderRight: '1px solid var(--border)',
    fontSize: '11.5px',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 9px 0 8px', minWidth: '40px' },
  '.cm-placeholder': { color: 'var(--text-faint)' },
});

// ─────────────────────────────────────────────────────────────
// One editor pane
// ─────────────────────────────────────────────────────────────

/** Line count as people count it: a final newline ends the last line. */
function countLines(state: EditorState): number {
  const doc = state.doc;
  if (doc.length === 0) return 0;
  return doc.line(doc.lines).length === 0 ? doc.lines - 1 : doc.lines;
}

interface EditorPaneProps {
  side: 'original' | 'changed';
  label: string;
  value: string;
  fileName: string | null;
  marks: LineMarks | null;
  marksFresh: boolean;
  syntax: Lang | null;
  tall: boolean;
  onChange: (text: string, fileName: string | null) => void;
  onError: (message: string) => void;
}

const EditorPane = memo(
  forwardRef<EditorPaneHandle, EditorPaneProps>(
    ({ side, label, value, fileName, marks, marksFresh, syntax, tall, onChange, onError }, ref) => {
      const hostRef = useRef<HTMLDivElement>(null);
      const viewRef = useRef<EditorView | null>(null);
      const inputRef = useRef<HTMLInputElement>(null);
      /** The text this editor last reported (or was given), to tell its own edits from outside changes. */
      const lastValue = useRef(value);
      const pending = useRef<number | undefined>(undefined);
      const fileNameRef = useRef(fileName);
      const onChangeRef = useRef(onChange);
      fileNameRef.current = fileName;
      onChangeRef.current = onChange;
      const [dragging, setDragging] = useState(false);
      const [lineCount, setLineCount] = useState(0);

      // Read the file locally — it is never uploaded anywhere.
      const loadFile = async (file: File | undefined) => {
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
          onError(`${file.name} is larger than 50 MB`);
          return;
        }
        try {
          onChangeRef.current(await file.text(), file.name);
        } catch {
          onError(`Could not read ${file.name}`);
        }
      };
      const loadFileRef = useRef(loadFile);
      loadFileRef.current = loadFile;

      const marksRef = useRef<DiffMarksValue>({ marks, fresh: marksFresh });
      marksRef.current = { marks, fresh: marksFresh };
      const langRef = useRef<Lang | null>(null);
      langRef.current = syntax && syntax !== 'none' ? syntax : null;

      /** Replace the whole document with a fresh state (no history), keeping our highlights. */
      const resetDoc = useRef<(view: EditorView, text: string, cursor?: number) => void>(() => {});

      useEffect(() => {
        const emit = (view: EditorView) => {
          performance.mark(`diffdrop:emit-${side}`);
          const text = view.state.doc.toString();
          lastValue.current = text;
          onChangeRef.current(text, fileNameRef.current);
        };
        const extensions = [
          lineNumbers(),
          history(),
          search({ top: true }),
          keymap.of([...searchKeymap, ...defaultKeymap, ...historyKeymap]),
          placeholder(`Paste ${label.toLowerCase()} text, or drop a file here`),
          EditorView.contentAttributes.of({
            'aria-label': `${label} text`,
            spellcheck: 'false',
            autocapitalize: 'off',
            autocorrect: 'off',
          }),
          diffMarksField,
          gutterField,
          langField,
          highlighter,
          editorTheme,
          EditorView.domEventHandlers({
            drop(event) {
              if (!event.dataTransfer?.files.length) return false;
              event.preventDefault();
              void loadFileRef.current(event.dataTransfer.files[0]);
              return true;
            },
            paste(event, view) {
              const text = event.clipboardData?.getData('text/plain');
              if (!text || countNewlines(text, LARGE_INSERT_LINES + 1) <= LARGE_INSERT_LINES) return false;
              // Huge paste: build the new text and load it as a fresh document
              event.preventDefault();
              const { from, to } = view.state.selection.main;
              const doc = view.state.doc;
              const next = doc.sliceString(0, from) + text + doc.sliceString(to);
              resetDoc.current(view, next, from + text.length);
              emit(view);
              return true;
            },
          }),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return;
            setLineCount(countLines(u.state));
            window.clearTimeout(pending.current);
            // Big documents: report after a short pause so typing stays smooth
            if (u.state.doc.lines > LARGE_DOC_LINES) pending.current = window.setTimeout(() => emit(u.view), 150);
            else emit(u.view);
          }),
        ];

        resetDoc.current = (view, text, cursor) => {
          const state = EditorState.create({
            doc: text,
            extensions,
            selection: cursor != null ? { anchor: Math.min(cursor, text.length) } : undefined,
          });
          view.setState(state);
          // Fresh state: restore highlights and language, then bring the cursor into view
          view.dispatch({
            effects: [
              setDiffMarks.of(marksRef.current),
              setLang.of(langRef.current),
              ...(cursor != null ? [EditorView.scrollIntoView(state.selection.main.head, { y: 'center' })] : []),
            ],
          });
          setLineCount(countLines(view.state));
        };

        const view = new EditorView({
          parent: hostRef.current!,
          state: EditorState.create({ doc: lastValue.current, extensions }),
        });
        viewRef.current = view;
        setLineCount(countLines(view.state));
        return () => {
          window.clearTimeout(pending.current);
          view.destroy();
          viewRef.current = null;
        };
        // The editor is created once; later prop changes are dispatched below
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      // Outside changes (swap, merge, example, file, clear, share link): apply only the part
      // that differs, so a one-line merge stays a one-line edit (scroll and undo survive)
      useEffect(() => {
        const view = viewRef.current;
        if (!view || value === lastValue.current) return;
        window.clearTimeout(pending.current);
        lastValue.current = value;
        const old = view.state.doc.toString();
        let start = 0;
        const max = Math.min(old.length, value.length);
        while (start < max && old.charCodeAt(start) === value.charCodeAt(start)) start++;
        let endOld = old.length;
        let endNew = value.length;
        while (endOld > start && endNew > start && old.charCodeAt(endOld - 1) === value.charCodeAt(endNew - 1)) {
          endOld--;
          endNew--;
        }
        const insert = value.slice(start, endNew);
        if (countNewlines(insert, LARGE_INSERT_LINES + 1) > LARGE_INSERT_LINES) {
          resetDoc.current(view, value);
        } else {
          view.dispatch({ changes: { from: start, to: endOld, insert } });
          setLineCount(countLines(view.state));
        }
      }, [value]);

      useEffect(() => {
        viewRef.current?.dispatch({ effects: setDiffMarks.of({ marks, fresh: marksFresh }) });
      }, [marks, marksFresh]);

      useEffect(() => {
        viewRef.current?.dispatch({ effects: setLang.of(syntax && syntax !== 'none' ? syntax : null) });
      }, [syntax]);

      useImperativeHandle(ref, () => ({
        scrollToLine(line: number) {
          const view = viewRef.current;
          if (!view) return;
          const doc = view.state.doc;
          const pos = doc.line(Math.max(1, Math.min(line, doc.lines))).from;
          view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        },
      }));

      return (
        <div
          className={cn('editor-pane', dragging && 'is-dragging')}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(e) => {
            setDragging(false);
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            void loadFile(e.dataTransfer.files[0]);
          }}
        >
          <div className="editor-pane-header">
            <span className={`side-tag side-tag-${side}`} aria-hidden="true">
              {side === 'original' ? 'a' : 'b'}
            </span>
            <span className="text-muted-foreground">{label.toLowerCase()}</span>
            {fileName && (
              <span className="editor-file-name min-w-0 truncate text-foreground" title={fileName}>
                {fileName}
              </span>
            )}
            <span className="ml-auto pr-1 text-[11.5px] whitespace-nowrap text-faint tabular-nums">
              {lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground"
                  aria-label={`Open a file as ${label.toLowerCase()}`}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open a file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground"
                  aria-label={`Clear ${label.toLowerCase()}`}
                  disabled={lineCount === 0}
                  onClick={() => onChange('', null)}
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear</TooltipContent>
            </Tooltip>
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(e) => {
                void loadFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className={cn('editor-body', tall && 'is-tall')} ref={hostRef} />
          {dragging && <div className="drop-overlay">drop to open (it stays on your machine)</div>}
        </div>
      );
    },
  ),
);

interface EditorPanelProps {
  originalText: string;
  changedText: string;
  originalName: string | null;
  changedName: string | null;
  leftMarks: LineMarks | null;
  rightMarks: LineMarks | null;
  marksFresh: boolean;
  leftSyntax: Lang | null;
  rightSyntax: Lang | null;
  tall: boolean;
  leftRef: React.Ref<EditorPaneHandle>;
  rightRef: React.Ref<EditorPaneHandle>;
  onOriginalChange: (text: string, fileName: string | null) => void;
  onChangedChange: (text: string, fileName: string | null) => void;
  onError: (message: string) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  originalText,
  changedText,
  originalName,
  changedName,
  leftMarks,
  rightMarks,
  marksFresh,
  leftSyntax,
  rightSyntax,
  tall,
  leftRef,
  rightRef,
  onOriginalChange,
  onChangedChange,
  onError,
}) => (
  <div className="editor-panel">
    <EditorPane
      ref={leftRef}
      side="original"
      label="Original"
      value={originalText}
      fileName={originalName}
      marks={leftMarks}
      marksFresh={marksFresh}
      syntax={leftSyntax}
      tall={tall}
      onChange={onOriginalChange}
      onError={onError}
    />
    <EditorPane
      ref={rightRef}
      side="changed"
      label="Changed"
      value={changedText}
      fileName={changedName}
      marks={rightMarks}
      marksFresh={marksFresh}
      syntax={rightSyntax}
      tall={tall}
      onChange={onChangedChange}
      onError={onError}
    />
  </div>
);

export default EditorPanel;
