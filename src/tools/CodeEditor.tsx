import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Compartment, EditorState, StateEffect, StateField, type Extension, type Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { search, searchKeymap } from '@codemirror/search';
import { tokenizeLine, type Lang } from '@/lib/syntax';

export interface CodeEditorHandle {
  /** Scroll to a line (1-based) and put the cursor there. */
  goToLine: (line: number, column?: number) => void;
}

interface CodeEditorProps {
  value: string;
  onChange?: (text: string) => void;
  readOnly?: boolean;
  /** Syntax colors: 'c' suits JSON, 'hash' suits YAML; null for plain text. */
  lang: Lang | null;
  /** Line to mark as an error (1-based), or null. */
  errorLine?: number | null;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  /** Ranges to highlight (e.g. regex matches), sorted by start; alternate ones get a second color. */
  highlights?: readonly { from: number; to: number }[] | null;
  /** Wrap long lines (for one-line content like tokens, URLs and Base64). */
  wrap?: boolean;
}

const setError = StateEffect.define<number | null>();
const errorField = StateField.define<number | null>({
  create: () => null,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setError)) return e.value;
    return tr.docChanged ? null : v;
  },
});

const setLang = StateEffect.define<Lang | null>();
const langField = StateField.define<Lang | null>({
  create: () => null,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setLang)) return e.value;
    return v;
  },
});

const setHighlights = StateEffect.define<readonly { from: number; to: number }[] | null>();
const highlightField = StateField.define<readonly { from: number; to: number }[] | null>({
  create: () => null,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setHighlights)) return e.value;
    return tr.docChanged ? null : v;
  },
});
const matchDeco = [Decoration.mark({ class: 'cm-match' }), Decoration.mark({ class: 'cm-match cm-match-alt' })];

const errorLineDeco = Decoration.line({ class: 'cm-error-line' });
const markCache: Record<string, Decoration> = {};
const mark = (cls: string) => (markCache[cls] ??= Decoration.mark({ class: cls }));

/** Syntax colors and the error line, for the visible lines only. */
const decorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(u: ViewUpdate) {
      if (
        u.docChanged ||
        u.viewportChanged ||
        u.startState.field(errorField) !== u.state.field(errorField) ||
        u.startState.field(highlightField) !== u.state.field(highlightField) ||
        u.startState.field(langField) !== u.state.field(langField)
      ) {
        this.decorations = this.build(u.view);
      }
    }
    build(view: EditorView): DecorationSet {
      const lang = view.state.field(langField);
      const error = view.state.field(errorField);
      const doc = view.state.doc;
      const out: Range<Decoration>[] = [];
      const highlights = view.state.field(highlightField);
      if (highlights) {
        // Only the matches in view; ranges are sorted, so binary-search the first
        for (const { from, to } of view.visibleRanges) {
          let lo = 0;
          let hi = highlights.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (highlights[mid]!.to < from) lo = mid + 1;
            else hi = mid;
          }
          for (let k = lo; k < highlights.length && highlights[k]!.from <= to; k++) {
            const h = highlights[k]!;
            if (h.to > h.from && h.to <= doc.length) out.push(matchDeco[k % 2]!.range(h.from, h.to));
          }
        }
      }
      for (const { from, to } of view.visibleRanges) {
        for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) {
          const line = doc.line(n);
          if (n === error) out.push(errorLineDeco.range(line.from));
          if (lang && line.length > 0 && line.length < 20_000) {
            for (const t of tokenizeLine(line.text, lang, 0).tokens) {
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

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '21px', overflow: 'auto' },
  '.cm-content': { padding: '10px 0', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0 14px' },
  '.cm-cursor': { borderLeftColor: 'var(--text)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--text-faint)',
    borderRight: '1px solid var(--border)',
    fontSize: '11.5px',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 9px 0 8px', minWidth: '40px' },
  '.cm-placeholder': { color: 'var(--text-faint)' },
});

/** Pastes of more than this many lines load as a fresh document (see EditorPanel). */
const LARGE_INSERT_LINES = 2_000;

/** A CodeMirror editor for the JSON tools: input (editable) or output (read-only). */
const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ value, onChange, readOnly = false, lang, errorLine = null, placeholder, ariaLabel, className, highlights = null, wrap = false }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const lastValue = useRef(value);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const extensionsRef = useRef<Extension[]>([]);
    // The label can change when one editor shows different things (encode vs decode output)
    const labelRef = useRef(new Compartment());
    const labelAttrs = (label: string) => EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false', autocorrect: 'off' });

    useEffect(() => {
      const emit = (text: string) => {
        lastValue.current = text;
        onChangeRef.current?.(text);
      };
      const extensions: Extension[] = [
        lineNumbers(),
        history(),
        search({ top: true }),
        keymap.of([...searchKeymap, ...defaultKeymap, ...historyKeymap]),
        EditorState.readOnly.of(readOnly),
        ...(wrap ? [EditorView.lineWrapping] : []),
        labelRef.current.of(labelAttrs(ariaLabel)),
        ...(placeholder ? [placeholderExt(placeholder)] : []),
        errorField,
        highlightField,
        langField,
        decorations,
        theme,
        EditorView.domEventHandlers({
          paste(event, view) {
            const text = event.clipboardData?.getData('text/plain');
            if (!text || readOnly) return false;
            let lines = 0;
            for (let i = text.indexOf('\n'); i !== -1 && lines <= LARGE_INSERT_LINES; i = text.indexOf('\n', i + 1)) lines++;
            if (lines <= LARGE_INSERT_LINES) return false;
            event.preventDefault();
            const { from, to } = view.state.selection.main;
            const next = view.state.doc.sliceString(0, from) + text + view.state.doc.sliceString(to);
            view.setState(EditorState.create({ doc: next, extensions: extensionsRef.current }));
            emit(next);
            return true;
          },
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) emit(u.state.doc.toString());
        }),
      ];
      extensionsRef.current = extensions;
      const view = new EditorView({
        parent: hostRef.current!,
        state: EditorState.create({ doc: lastValue.current, extensions }),
      });
      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // Created once; value, lang and error updates are dispatched below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Outside changes (examples, outputs, file loads)
    useEffect(() => {
      const view = viewRef.current;
      if (!view || value === lastValue.current) return;
      lastValue.current = value;
      if (value.length > 200_000) view.setState(EditorState.create({ doc: value, extensions: extensionsRef.current }));
      else view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
      view.dispatch({ effects: [setLang.of(lang), setError.of(errorLine)] });
    }, [value, lang, errorLine]);

    useEffect(() => {
      viewRef.current?.dispatch({ effects: setLang.of(lang) });
    }, [lang]);

    useEffect(() => {
      viewRef.current?.dispatch({ effects: setError.of(errorLine) });
    }, [errorLine]);

    useEffect(() => {
      viewRef.current?.dispatch({ effects: labelRef.current.reconfigure(labelAttrs(ariaLabel)) });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ariaLabel]);

    useEffect(() => {
      const view = viewRef.current;
      // Ranges computed for an older text are dropped rather than drawn in the wrong place
      if (view && value === view.state.doc.toString()) view.dispatch({ effects: setHighlights.of(highlights) });
    }, [highlights, value]);

    useImperativeHandle(ref, () => ({
      goToLine(line: number, column = 1) {
        const view = viewRef.current;
        if (!view) return;
        const doc = view.state.doc;
        const l = doc.line(Math.max(1, Math.min(line, doc.lines)));
        const pos = Math.min(l.to, l.from + Math.max(0, column - 1));
        view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        view.focus();
      },
    }));

    return <div ref={hostRef} className={className} />;
  },
);

export default CodeEditor;
