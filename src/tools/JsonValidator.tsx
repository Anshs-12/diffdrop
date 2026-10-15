import { useMemo, useRef } from 'react';
import { jsonStats } from '@/lib/jsonTools';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, Panel, byteLength, formatBytes, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';

/** An example with a typical mistake (a trailing comma), to show what an error looks like. */
const BROKEN_EXAMPLE = EXAMPLE_JSON.replace('"roles": [],', '"roles": [],\n    "tags": ["a", "b",],');

export default function JsonValidator() {
  const { text, setText, parsed } = useJsonInput();
  const inputRef = useRef<CodeEditorHandle>(null);

  const stats = useMemo(() => (parsed.status === 'valid' ? jsonStats(parsed.value) : null), [parsed]);
  const plural = (n: number, w: string) => `${n.toLocaleString()} ${w}${n === 1 ? '' : 's'}`;

  return (
    <>
      <ToolBar onExample={() => setText(text === BROKEN_EXAMPLE ? EXAMPLE_JSON : BROKEN_EXAMPLE)} />
      <JsonStatusLine
        parsed={parsed}
        onJump={(l, c) => inputRef.current?.goToLine(l, c)}
        validNote={
          stats &&
          `${plural(stats.objects, 'object')}, ${plural(stats.arrays, 'array')}, ${plural(stats.keys, 'key')}, ` +
            `depth ${stats.depth}, ${formatBytes(byteLength(text))}`
        }
      />
      <Panel title="json" actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
        <CodeEditor
          ref={inputRef}
          value={text}
          onChange={setText}
          lang="c"
          errorLine={parsed.status === 'invalid' ? parsed.check.line : null}
          placeholder="Paste JSON here to check it, or open a file"
          ariaLabel="JSON input"
          className="tool-editor"
        />
      </Panel>
    </>
  );
}
