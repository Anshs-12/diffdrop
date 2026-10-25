import { useDeferredValue, useMemo } from 'react';
import { Copy, Download } from 'lucide-react';
import { htmlDocument, renderMarkdown } from '@/lib/markdown';
import CodeEditor from './CodeEditor';
import { IconButton, InputActions, Panel, copyText, downloadFile } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

/** The first heading, as the downloaded page's title. */
function titleOf(md: string): string {
  const m = /^ {0,3}#{1,6}[ \t]+(.+?)[ \t#]*$/m.exec(md);
  return m ? m[1]!.replace(/[*_`~[\]]/g, '').trim() || 'Document' : 'Document';
}

const EXAMPLE = `# Project name

A short description of what this does and **why** it matters.

## Features

- [x] Live preview as you type
- [x] Tables, task lists and ~~strikethrough~~
- [ ] Your next idea

| Command | What it does |
| --- | --- |
| \`npm install\` | Install dependencies |
| \`npm test\` | Run the tests |

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> Blockquotes work too. [Links](https://example.com) open in a new tab.
`;

export default function MarkdownTool() {
  const [md, setMd] = useSaved('markdown', '');
  const deferred = useDeferredValue(md);
  // Sanitized: scripts and event handlers in the Markdown are removed
  const html = useMemo(() => renderMarkdown(deferred), [deferred]);

  return (
    <>
      <ToolBar onExample={() => setMd(EXAMPLE)} />
      <div className="tool-panes">
        <Panel
          title="markdown"
          onFile={setMd}
          actions={
            <>
              <InputActions onLoad={setMd} onClear={() => setMd('')} canClear={!!md} accept=".md,.markdown,.txt,text/*" />
              <IconButton label="Copy Markdown" onClick={() => copyText(md, 'Markdown copied')} disabled={!md}>
                <Copy />
              </IconButton>
              <IconButton label="Download document.md" onClick={() => downloadFile(md, 'document.md', 'text/markdown;charset=utf-8')} disabled={!md}>
                <Download />
              </IconButton>
            </>
          }
        >
          <CodeEditor value={md} onChange={setMd} lang={null} wrap placeholder="Write or paste Markdown" ariaLabel="Markdown" className="tool-editor" />
        </Panel>
        <Panel
          title="preview"
          actions={
            <>
              <IconButton label="Copy HTML" onClick={() => copyText(html, 'HTML copied')} disabled={!html}>
                <Copy />
              </IconButton>
              <IconButton label="Download HTML page" onClick={() => downloadFile(htmlDocument(md, titleOf(md)), 'document.html', 'text/html;charset=utf-8')} disabled={!md}>
                <Download />
              </IconButton>
            </>
          }
        >
          <div
            className="markdown-body tool-editor overflow-auto px-5 py-4"
            aria-label="Rendered Markdown"
            // eslint-disable-next-line react/no-danger -- sanitized by DOMPurify in renderMarkdown
            dangerouslySetInnerHTML={{ __html: html || '<p class="md-empty">The preview appears here.</p>' }}
          />
        </Panel>
      </div>
    </>
  );
}
