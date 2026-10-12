import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { useDiffWorker } from './lib/useDiffWorker';
import type { DiffLine, DiffOptions, Hunk } from './lib/diffProcessor';
import EditorPanel from './components/EditorPanel';
import SideBySideView from './components/SideBySideView';
import UnifiedView from './components/UnifiedView';
import OptionsBar from './components/OptionsBar';

// ── URL hash encoding/decoding ──

function encodeHash(original: string, changed: string): string {
  const data = JSON.stringify({ o: original, c: changed });
  return compressToEncodedURIComponent(data);
}

function decodeHash(hash: string): { original: string; changed: string } | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw) return null;
    const json = decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const data = JSON.parse(json);
    return { original: data.o ?? '', changed: data.c ?? '' };
  } catch {
    return null;
  }
}

// ── Patch generation ──

function generatePatch(lines: DiffLine[]): string {
  const parts: string[] = [];
  for (const line of lines) {
    if (line.type === 'unchanged') {
      parts.push(` ${line.leftContent ?? ''}`);
    } else if (line.type === 'removed') {
      parts.push(`-${line.leftContent ?? ''}`);
    } else if (line.type === 'added') {
      parts.push(`+${line.rightContent ?? ''}`);
    } else if (line.type === 'modified') {
      parts.push(`-${line.leftContent ?? ''}`);
      parts.push(`+${line.rightContent ?? ''}`);
    }
  }
  return parts.join('\n') + '\n';
}

// ── Undo stack ──

interface UndoEntry {
  original: string;
  changed: string;
}

// ── Toast ──

function Toast({ message }: { message: string }) {
  return <div className="toast">{message}</div>;
}

// ── App ──

const App: React.FC = () => {
  // Decode hash on mount
  const hashData = useMemo(() => decodeHash(window.location.hash), []);

  const [originalText, setOriginalText] = useState(hashData?.original ?? '');
  const [changedText, setChangedText] = useState(hashData?.changed ?? '');

  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(false);
  const [lineWrap, setLineWrap] = useState(false);
  const [currentHunk, setCurrentHunk] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Undo stack for merge operations
  const undoStack = useRef<UndoEntry[]>([]);

  const diffOptions: DiffOptions = useMemo(
    () => ({ ignoreWhitespace, ignoreCase }),
    [ignoreWhitespace, ignoreCase],
  );

  const diffResult = useDiffWorker(originalText, changedText, diffOptions);
  const lines = diffResult?.lines ?? [];
  const hunks: Hunk[] = diffResult?.hunks ?? [];

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Keyboard undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        const entry = undoStack.current.pop();
        if (entry) {
          e.preventDefault();
          setOriginalText(entry.original);
          setChangedText(entry.changed);
          setToast('Undo merge');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Hunk navigation ──
  const diffPanelRef = useRef<HTMLDivElement | null>(null);

  const scrollToHunk = useCallback(
    (index: number) => {
      if (hunks.length === 0) return;
      const clamped = Math.max(0, Math.min(index, hunks.length - 1));
      setCurrentHunk(clamped);

      // Find the row in DOM
      const panel = document.querySelector('.diff-panel');
      if (!panel) return;
      const row = panel.querySelector(`[data-diff-line="${hunks[clamped]!.startIndex}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [hunks],
  );

  const handlePrevDiff = useCallback(() => {
    scrollToHunk(currentHunk - 1);
  }, [currentHunk, scrollToHunk]);

  const handleNextDiff = useCallback(() => {
    scrollToHunk(currentHunk + 1);
  }, [currentHunk, scrollToHunk]);

  // ── Merge operations ──
  const handleMergeLeftToRight = useCallback(
    (lineIndex: number) => {
      const line = lines[lineIndex];
      if (!line || line.leftContent == null) return;

      undoStack.current.push({ original: originalText, changed: changedText });

      const changedLines = changedText.split('\n');
      if (line.type === 'removed') {
        // Insert the removed line into the changed side
        const insertAt = line.rightNum != null ? line.rightNum - 1 : changedLines.length;
        changedLines.splice(insertAt, 0, line.leftContent);
      } else if (line.type === 'modified' && line.rightNum != null) {
        // Replace the changed line with the original
        changedLines[line.rightNum - 1] = line.leftContent;
      }
      setChangedText(changedLines.join('\n'));
      setToast('Merged → right');
    },
    [lines, originalText, changedText],
  );

  const handleMergeRightToLeft = useCallback(
    (lineIndex: number) => {
      const line = lines[lineIndex];
      if (!line || line.rightContent == null) return;

      undoStack.current.push({ original: originalText, changed: changedText });

      const originalLines = originalText.split('\n');
      if (line.type === 'added') {
        // Insert the added line into the original side
        const insertAt = line.leftNum != null ? line.leftNum - 1 : originalLines.length;
        originalLines.splice(insertAt, 0, line.rightContent);
      } else if (line.type === 'modified' && line.leftNum != null) {
        // Replace the original line with the changed
        originalLines[line.leftNum - 1] = line.rightContent;
      }
      setOriginalText(originalLines.join('\n'));
      setToast('Merged ← left');
    },
    [lines, originalText, changedText],
  );

  // ── Actions ──
  const handleSwap = useCallback(() => {
    const tmp = originalText;
    setOriginalText(changedText);
    setChangedText(tmp);
    setToast('Sides swapped');
  }, [originalText, changedText]);

  const handleShare = useCallback(async () => {
    const hash = encodeHash(originalText, changedText);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    window.location.hash = hash;
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied to clipboard!');
    } catch {
      setToast('Hash updated in URL');
    }
  }, [originalText, changedText]);

  const handleCopyResult = useCallback(async () => {
    const patch = generatePatch(lines);
    try {
      await navigator.clipboard.writeText(patch);
      setToast('Diff copied!');
    } catch {
      setToast('Failed to copy');
    }
  }, [lines]);

  const handleDownloadPatch = useCallback(() => {
    const patch = generatePatch(lines);
    const blob = new Blob([patch], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.patch';
    a.click();
    URL.revokeObjectURL(url);
    setToast('Patch downloaded');
  }, [lines]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <span className="lock-icon">🔒</span>
          Diff
          <span className="header-subtitle">— nothing leaves your browser</span>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={handleSwap}>⇄ Swap</button>
          <button className="btn" onClick={handleShare}>🔗 Share</button>
          <button className="btn" onClick={handleCopyResult}>📋 Copy</button>
          <button className="btn" onClick={handleDownloadPatch}>⬇ .patch</button>
        </div>
      </header>

      {/* Options */}
      <OptionsBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        ignoreWhitespace={ignoreWhitespace}
        onIgnoreWhitespaceChange={setIgnoreWhitespace}
        ignoreCase={ignoreCase}
        onIgnoreCaseChange={setIgnoreCase}
        hideUnchanged={hideUnchanged}
        onHideUnchangedChange={setHideUnchanged}
        lineWrap={lineWrap}
        onLineWrapChange={setLineWrap}
        onPrevDiff={handlePrevDiff}
        onNextDiff={handleNextDiff}
        hunkCount={hunks.length}
        currentHunk={currentHunk}
      />

      {/* Main content */}
      <div className="main-content">
        <EditorPanel
          originalText={originalText}
          changedText={changedText}
          onOriginalChange={setOriginalText}
          onChangedChange={setChangedText}
        />

        {viewMode === 'side-by-side' ? (
          <SideBySideView
            lines={lines}
            hideUnchanged={hideUnchanged}
            lineWrap={lineWrap}
            onMergeLeftToRight={handleMergeLeftToRight}
            onMergeRightToLeft={handleMergeRightToLeft}
          />
        ) : (
          <UnifiedView
            lines={lines}
            hideUnchanged={hideUnchanged}
            lineWrap={lineWrap}
          />
        )}
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
};

export default App;
