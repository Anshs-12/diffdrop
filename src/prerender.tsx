import { renderToString } from 'react-dom/server';
import type { PageId } from '@/site';
import HomeApp from '@/home/HomeApp';
import ToolApp from '@/tools/ToolApp';

/**
 * Server render of the home page or a tool page, written into its HTML at build
 * time (see prerender() in vite.config.ts) so its content is in the static page.
 * Tools themselves load in the browser.
 */
export function render(page: PageId): string {
  return renderToString(page === 'home' ? <HomeApp /> : <ToolApp page={page} />);
}
