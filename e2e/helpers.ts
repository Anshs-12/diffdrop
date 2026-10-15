import { expect, type Page } from '@playwright/test';

export const ORIGINAL = `function total(items) {
  let sum = 0;
  for (const item of items) sum += item.price;
  return sum;
}
`;

export const CHANGED = `function total(items, tax) {
  let sum = 0;
  for (const item of items) sum += item.price;
  return sum * (1 + tax);
}
`;

/** Type both texts into the editors and wait for the diff to be computed. */
export async function fillEditors(page: Page, a: string, b: string) {
  await page.getByLabel('Original text').fill(a);
  await page.getByLabel('Changed text').fill(b);
  await expect(page.getByLabel('Change summary')).toBeVisible();
}

/** The text currently in an editor (all lines are rendered for small documents). */
export async function editorText(page: Page, label: 'Original text' | 'Changed text'): Promise<string> {
  return page.getByLabel(label).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

/**
 * Record requests that could carry data out: anything to another origin, or any
 * non-GET. Lazily loaded code from the site's own /assets/ is not counted.
 */
export function trackOutgoing(page: Page): string[] {
  const out: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    const ownAsset = url.origin === new URL(page.url()).origin && r.method() === 'GET' && url.pathname.startsWith('/assets/');
    if (!ownAsset) out.push(`${r.method()} ${r.url()}`);
  });
  return out;
}

/** Collect console errors and uncaught exceptions for the whole test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
