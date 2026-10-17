import { renderToString } from 'react-dom/server';
import type { PageId } from '@/site';
import App from '@/App';
import HomeApp from '@/home/HomeApp';
import GuideApp from '@/guides/GuideApp';
import { GUIDES, type GuideId } from '@/guides/content';
import ToolApp from '@/tools/ToolApp';

/**
 * Server render of a page, written into its HTML at build time (see
 * prerender() in vite.config.ts) so its content is in the static page. The
 * browser then renders it fresh; editors and tools start working once it has.
 */
export function render(page: PageId): string {
  if (page === 'home') return renderToString(<HomeApp />);
  if (page === 'diff-checker' || page === 'json-diff') return renderToString(<App variant={page === 'json-diff' ? 'json' : 'text'} />);
  if (page in GUIDES) return renderToString(<GuideApp page={page as GuideId} />);
  return renderToString(<ToolApp page={page} />);
}
