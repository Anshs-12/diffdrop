import { useMemo, useState } from 'react';
import { TITLE_STYLES, titleCase, type TitleStyle } from '@/lib/textCase';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';

const EXAMPLE = [
  'a tale of two cities and the war between them',
  'how to compare two JSON files on your iPhone',
  'the end: a story to think about',
  'self-driving cars and the road ahead',
].join('\n');

export default function TitleCaseTool() {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<TitleStyle>('chicago');
  const output = useMemo(() => titleCase(text, style), [text, style]);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)}>
        <ToggleGroup type="single" variant="outline" size="sm" value={style} onValueChange={(v) => v && setStyle(v as TitleStyle)} aria-label="Style guide">
          {TITLE_STYLES.map((s) => (
            <ToggleGroupItem key={s.style} value={s.style}>
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ToolBar>
      <StatusLine tone="muted">{TITLE_STYLES.find((s) => s.style === style)!.rule}</StatusLine>
      <div className="tool-panes">
        <Panel title="titles" actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.md,.csv" />}>
          <CodeEditor value={text} onChange={setText} lang={null} wrap placeholder="Paste titles or headlines, one per line" ariaLabel="Titles" className="tool-editor" />
        </Panel>
        <Panel title="title case" actions={<OutputActions text={output} fileName="titles.txt" mime="text/plain" />}>
          <CodeEditor value={output} readOnly lang={null} wrap ariaLabel="Title case" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
