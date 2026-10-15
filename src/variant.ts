import type { PageId } from './site';

/** Which version of the diff app is rendered: the general text diff, or the JSON diff page. */
export type Variant = 'text' | 'json';

/** The page being rendered, from <div id="root" data-page="..."> in its HTML. */
export function readPage(root: HTMLElement): PageId {
  return (root.dataset.page as PageId | undefined) ?? 'home';
}
