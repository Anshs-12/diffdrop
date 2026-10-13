import React, { forwardRef, memo, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { splitLines, type InlineSpan } from '@/lib/diffProcessor';
import type { LineMarks } from '@/lib/marks';
import { lineStartStates, tokenizeLine, type Lang, type LineState } from '@/lib/syntax';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineContent } from './DiffSpans';

/** Files above this size are rejected to keep the tab responsive. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** In-editor highlighting is skipped above this many lines (it re-renders on every keystroke). */
export const MAX_HIGHLIGHT_LINES = 5000;

export interface EditorPaneHandle {
  scrollToLine: (line: number) => void;
}

const Gutter = memo(({ count, marks }: { count: number; marks: LineMarks | null }) => {
  const rows: React.ReactNode[] = [];
  for (let n = 1; n <= count; n++) {
    const mark = marks?.get(n);
    rows.push(
      <span key={n} className={mark ? `is-${mark.kind}` : undefined}>
        {n}
      </span>,
    );
  }
  return <>{rows}</>;
});

interface BackdropLineProps {
  text: string;
  kind: 'add' | 'del' | undefined;
  spans: InlineSpan[] | null;
  lang: Lang | null;
  startState: LineState;
}

// Memoized on primitives so typing only re-renders the lines that changed
const BackdropLine = memo(({ text, kind, spans, lang, startState }: BackdropLineProps) => (
  <div className={cn('bd-line', kind && `is-${kind}`)}>
    <LineContent text={text} spans={spans} tokens={lang ? tokenizeLine(text, lang, startState).tokens : null} />
  </div>
));

const Backdrop = ({
  lines,
  marks,
  fresh,
  lang,
}: {
  lines: string[];
  marks: LineMarks | null;
  fresh: boolean;
  lang: Lang | null;
}) => {
  const states = lang ? lineStartStates(lines, lang) : null;
  return (
    <>
      {lines.map((text, i) => {
        const mark = marks?.get(i + 1);
        return (
          <BackdropLine
            key={i}
            text={text}
            kind={mark?.kind}
            // Word highlights only when the diff matches the current text; else just shade the line
            spans={mark && fresh ? mark.spans : null}
            lang={lang}
            startState={states ? states[i]! : 0}
          />
        );
      })}
    </>
  );
};

interface EditorPaneProps {
  side: 'original' | 'changed';
  label: string;
  value: string;
  fileName: string | null;
  /** Highlights to paint behind the text, or null for none. */
  marks: LineMarks | null;
  /** Whether `marks` were computed from exactly the current value. */
  marksFresh: boolean;
  /** Language to syntax-color the text with, or null for plain text. */
  syntax: Lang | null;
  tall: boolean;
  onChange: (text: string, fileName: string | null) => void;
  onError: (message: string) => void;
}

const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(
  ({ side, label, value, fileName, marks, marksFresh, syntax, tall, onChange, onError }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const ta = textareaRef.current;
        if (!ta) return;
        const lh = parseFloat(getComputedStyle(ta).lineHeight) || 21;
        ta.scrollTo({ top: Math.max(0, (line - 1) * lh - ta.clientHeight / 3), behavior: 'smooth' });
      },
    }));

    // Keep the gutter and highlight layer glued to the textarea's scroll position.
    const syncScroll = useCallback(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
      if (backdropRef.current) {
        backdropRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      }
    }, []);

    // Read the file locally — it is never uploaded anywhere.
    const loadFile = async (file: File | undefined) => {
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        onError(`${file.name} is larger than 20 MB`);
        return;
      }
      try {
        onChange(await file.text(), file.name);
      } catch {
        onError(`Could not read ${file.name}`);
      }
    };

    const lineCount = splitLines(value).length;
    const displayLines = value.split(/\r?\n/);
    const withinLimit = displayLines.length <= MAX_HIGHLIGHT_LINES;
    const highlight = marks != null && withinLimit;
    const colored = syntax != null && syntax !== 'none' && withinLimit;
    const backdrop = highlight || colored;

    // Re-sync when the highlight layer mounts after the user already scrolled
    useLayoutEffect(syncScroll, [backdrop, syncScroll]);

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
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragging(false);
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
                disabled={!value}
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

        <div className={cn('editor-body', tall && 'is-tall')}>
          <div className="editor-gutter" aria-hidden="true">
            <div ref={gutterRef}>
              <Gutter count={Math.max(1, displayLines.length)} marks={highlight ? marks : null} />
            </div>
          </div>
          <div className="editor-field">
            {backdrop && (
              <div className={cn('editor-backdrop', colored && 'is-colored')} aria-hidden="true">
                <div ref={backdropRef}>
                  <Backdrop
                    lines={displayLines}
                    marks={highlight ? marks : null}
                    fresh={marksFresh}
                    lang={colored ? syntax : null}
                  />
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              className={cn('editor-textarea', colored && 'is-colored')}
              value={value}
              onChange={(e) => onChange(e.target.value, fileName)}
              onScroll={syncScroll}
              placeholder={`Paste ${label.toLowerCase()} text, or drop a file here`}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              wrap="off"
              aria-label={`${label} text`}
            />
          </div>
        </div>
        {dragging && <div className="drop-overlay">drop to open (it stays on your machine)</div>}
      </div>
    );
  },
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
