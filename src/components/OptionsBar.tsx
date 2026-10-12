import React from 'react';

interface OptionsBarProps {
  viewMode: 'side-by-side' | 'unified';
  onViewModeChange: (mode: 'side-by-side' | 'unified') => void;
  ignoreWhitespace: boolean;
  onIgnoreWhitespaceChange: (v: boolean) => void;
  ignoreCase: boolean;
  onIgnoreCaseChange: (v: boolean) => void;
  hideUnchanged: boolean;
  onHideUnchangedChange: (v: boolean) => void;
  lineWrap: boolean;
  onLineWrapChange: (v: boolean) => void;
  onPrevDiff: () => void;
  onNextDiff: () => void;
  hunkCount: number;
  currentHunk: number;
}

const OptionsBar: React.FC<OptionsBarProps> = ({
  viewMode,
  onViewModeChange,
  ignoreWhitespace,
  onIgnoreWhitespaceChange,
  ignoreCase,
  onIgnoreCaseChange,
  hideUnchanged,
  onHideUnchangedChange,
  lineWrap,
  onLineWrapChange,
  onPrevDiff,
  onNextDiff,
  hunkCount,
  currentHunk,
}) => {
  return (
    <div className="options-bar">
      <button
        className={`btn ${viewMode === 'side-by-side' ? 'btn-active' : ''}`}
        onClick={() => onViewModeChange('side-by-side')}
      >
        Side by Side
      </button>
      <button
        className={`btn ${viewMode === 'unified' ? 'btn-active' : ''}`}
        onClick={() => onViewModeChange('unified')}
      >
        Unified
      </button>

      <span className="options-separator" />

      <label className="option-label">
        <input
          type="checkbox"
          checked={ignoreWhitespace}
          onChange={(e) => onIgnoreWhitespaceChange(e.target.checked)}
        />
        Ignore whitespace
      </label>

      <label className="option-label">
        <input
          type="checkbox"
          checked={ignoreCase}
          onChange={(e) => onIgnoreCaseChange(e.target.checked)}
        />
        Ignore case
      </label>

      <label className="option-label">
        <input
          type="checkbox"
          checked={hideUnchanged}
          onChange={(e) => onHideUnchangedChange(e.target.checked)}
        />
        Hide unchanged
      </label>

      <label className="option-label">
        <input
          type="checkbox"
          checked={lineWrap}
          onChange={(e) => onLineWrapChange(e.target.checked)}
        />
        Wrap lines
      </label>

      <span className="options-separator" />

      <button className="btn btn-icon" onClick={onPrevDiff} title="Previous diff">
        ▲
      </button>
      <span style={{ fontSize: 11, color: 'var(--text-dimmed)', whiteSpace: 'nowrap' }}>
        {hunkCount > 0 ? `${currentHunk + 1}/${hunkCount}` : '0/0'}
      </span>
      <button className="btn btn-icon" onClick={onNextDiff} title="Next diff">
        ▼
      </button>
    </div>
  );
};

export default OptionsBar;
