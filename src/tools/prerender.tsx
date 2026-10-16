import { renderToString } from 'react-dom/server';
import type { PageId } from '@/site';
import ToolApp from './ToolApp';

/**
 * Server render of a tool page, written into its HTML at build time (see
 * prerender() in vite.config.ts) so the heading, how-to and FAQ are in the
 * static page. The tool itself loads in the browser.
 */
export function render(page: PageId): string {
  return renderToString(<ToolApp page={page} />);
}
