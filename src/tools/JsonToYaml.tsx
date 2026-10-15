import { useMemo, useRef } from 'react';
import { jsonToYaml } from '@/lib/jsonTools';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, OutputActions, Panel, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';

export default function JsonToYaml() {
  const { text, setText, parsed } = useJsonInput();
  const inputRef = useRef<CodeEditorHandle>(null);
  const yaml = useMemo(() => (parsed.status === 'valid' ? jsonToYaml(parsed.value) : ''), [parsed]);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE_JSON)} />
      <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} />
      <div className="tool-panes">
        <Panel title="json" actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
          <CodeEditor
            ref={inputRef}
            value={text}
            onChange={setText}
            lang="c"
            errorLine={parsed.status === 'invalid' ? parsed.check.line : null}
            placeholder="Paste JSON here, or open a file"
            ariaLabel="JSON input"
            className="tool-editor"
          />
        </Panel>
        <Panel title="yaml" actions={<OutputActions text={yaml} fileName="data.yaml" mime="application/yaml" />}>
          <CodeEditor value={yaml} readOnly lang="hash" ariaLabel="YAML output" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
