/** Markdown to safe HTML: GitHub-flavored Markdown via marked, sanitized with DOMPurify. */
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });

// Links in the preview open in a new tab, so a click doesn't lose your text
let hooked = false;
function hookLinks() {
  if (hooked || typeof DOMPurify.addHook !== 'function') return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/** HTML from Markdown, unsanitized (for export; the preview always sanitizes). */
export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false });
}

/** HTML safe to insert into the page: scripts, event handlers and javascript: links removed. */
export function renderMarkdown(md: string): string {
  hookLinks();
  return DOMPurify.sanitize(markdownToHtml(md), { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] });
}

/** A standalone HTML document of the rendered Markdown, for download. */
export function htmlDocument(md: string, title = 'Document'): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[<>&"]/g, '')}</title>
<style>body{max-width:72ch;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif}pre{overflow:auto;padding:1rem;background:#f4f4f4;border-radius:8px}code{font-family:ui-monospace,monospace}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:.4rem .6rem}img{max-width:100%}</style>
</head>
<body>
${renderMarkdown(md)}
</body>
</html>
`;
}
