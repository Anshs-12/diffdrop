import React from 'react';

interface EditorPanelProps {
  originalText: string;
  changedText: string;
  onOriginalChange: (text: string) => void;
  onChangedChange: (text: string) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  originalText,
  changedText,
  onOriginalChange,
  onChangedChange,
}) => {
  return (
    <div className="editor-panel">
      <div className="editor-pane">
        <div className="editor-pane-header">Original</div>
        <textarea
          className="editor-textarea"
          value={originalText}
          onChange={(e) => onOriginalChange(e.target.value)}
          placeholder="Paste original text here…"
          spellCheck={false}
        />
      </div>
      <div className="editor-pane">
        <div className="editor-pane-header">Changed</div>
        <textarea
          className="editor-textarea"
          value={changedText}
          onChange={(e) => onChangedChange(e.target.value)}
          placeholder="Paste changed text here…"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default EditorPanel;
