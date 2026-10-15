/** Which page is being rendered: the general text diff, or the JSON diff page. */
export type Variant = 'text' | 'json';

/** Read from <div id="root" data-variant="..."> in the page's HTML. */
export function readVariant(root: HTMLElement): Variant {
  return root.dataset.variant === 'json' ? 'json' : 'text';
}
