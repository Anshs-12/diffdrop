import { useMemo } from 'react';
import { CASE_MODES, convertCase, type CaseMode } from '@/lib/textCase';
import { cn } from '@/lib/utils';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const EXAMPLE = 'The quick brown fox jumps over the lazy dog.\nparseHTTPRequest\nuser_account_id';

export default function CaseTool() {
  const [text, setText] = useSaved('text', '');
  const [mode, setMode] = useSaved<CaseMode>('mode', 'title', (v) => CASE_MODES.some((m) => m.mode === v));
  const output = useMemo(() => convertCase(text, mode), [text, mode]);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)} />
      <div className="flex flex-wrap gap-1.5 border-b px-3 py-2.5" role="radiogroup" aria-label="Case">
        {CASE_MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            role="radio"
            aria-checked={mode === m.mode}
            onClick={() => setMode(m.mode)}
            className={cn(
              'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
              mode === m.mode ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="tool-panes">
        <Panel title="text" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.md,.csv" />}>
          <CodeEditor value={text} onChange={setText} lang={null} wrap placeholder="Type or paste text to convert" ariaLabel="Text to convert" className="tool-editor" />
        </Panel>
        <Panel title={CASE_MODES.find((m) => m.mode === mode)!.label} actions={<OutputActions text={output} fileName="converted.txt" mime="text/plain" />}>
          <CodeEditor value={output} readOnly lang={null} wrap ariaLabel="Converted text" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
