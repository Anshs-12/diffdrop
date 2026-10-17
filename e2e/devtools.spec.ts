import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

/** Text of a CodeMirror editor by its aria-label. */
async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

const PAGES = [
  { path: '/base64-encode-decode/', h1: 'Base64 encode and decode' },
  { path: '/unix-timestamp-converter/', h1: 'Unix timestamp converter' },
  { path: '/jwt-decoder/', h1: 'JWT decoder' },
  { path: '/regex-tester/', h1: 'Regex tester' },
  { path: '/url-encoder-decoder/', h1: 'URL encoder and decoder' },
];

for (const p of PAGES) {
  test(`${p.path} loads with its heading, FAQ and FAQ data, without errors`, async ({ page, request }) => {
    const errors = trackErrors(page);
    await page.goto(p.path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1);
    await expect(page.getByRole('heading', { name: 'Questions' })).toBeVisible();
    expect(errors).toEqual([]);
    const html = await (await request.get(p.path)).text();
    expect(html).toContain(`>${p.h1}</h1>`);
    expect(html).toMatch(/"@type":"FAQPage"/);
  });
}

test('Base64 encodes UTF-8, decodes either alphabet and points at bad characters', async ({ page }) => {
  await page.goto('/base64-encode-decode/');
  await page.getByLabel('Text to encode').fill('héllo ✓');
  await expect.poll(() => editorText(page, 'Base64 output')).toBe('aMOpbGxvIOKckw==');
  await page.getByLabel('URL-safe').click();
  await expect.poll(() => editorText(page, 'Base64 output')).toBe('aMOpbGxvIOKckw');
  // Switching direction carries the output over as the new input
  await page.getByRole('radio', { name: 'Decode' }).click();
  await expect.poll(() => editorText(page, 'Decoded text')).toBe('héllo ✓');
  await page.getByLabel('Base64 to decode').fill('aGV$bG8=');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('"$" isn\'t a Base64 character at position 4');
});

test('Base64 decodes binary data to a preview and a download', async ({ page }) => {
  await page.goto('/base64-encode-decode/');
  await page.getByRole('radio', { name: 'Decode' }).click();
  // A 1×1 PNG
  await page
    .getByLabel('Base64 to decode')
    .fill('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('image/png file');
  await expect(page.getByAltText('Decoded image')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download decoded.png' }).click()]);
  expect(download.suggestedFilename()).toBe('decoded.png');
});

test('timestamp converter detects the unit and converts to dates', async ({ page }) => {
  await page.goto('/unix-timestamp-converter/');
  await page.getByLabel('Time zone').selectOption('UTC');
  await page.getByLabel('Timestamp or date').fill('1760700000123');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('Read as milliseconds');
  const conv = page.getByLabel('Conversions');
  await expect(conv.locator('[data-label="ISO 8601 (UTC)"]')).toHaveText('2025-10-17T11:20:00.123Z');
  await expect(conv.locator('[data-label="Seconds"]')).toHaveText('1760700000');
  await expect(conv.locator('[data-label="Nanoseconds"]')).toHaveText('1760700000123000000');
  // A date converts back to a timestamp
  await page.getByLabel('Timestamp or date').fill('2026-10-17T00:00:00Z');
  await expect(conv.locator('[data-label="Seconds"]')).toHaveText('1792195200');
  await page.getByLabel('Time zone').selectOption('America/New_York');
  await expect(conv.locator('[data-label="ISO 8601 (zone)"]')).toHaveText('2026-10-16T20:00:00-04:00');
  await page.getByLabel('Timestamp or date').fill('not a date');
  await expect(page.getByLabel('Status', { exact: true })).toContainText("isn't a timestamp");
});

test('JWT decoder shows claims, expiry and verifies the signature', async ({ page }) => {
  await page.goto('/jwt-decoder/');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Status', { exact: true })).toContainText('valid, expires in');
  await expect.poll(() => editorText(page, 'JWT header')).toContain('"alg": "HS256"');
  await expect(page.getByLabel('Claims')).toContainText('Ada Lovelace');
  await expect(page.getByLabel('Claims')).toContainText('2099-01-01T00:00:00Z');
  await expect(page.getByLabel('Signature status')).toHaveText('Signature verified');
  await page.getByLabel('Secret for HS256').fill('wrong');
  await expect(page.getByLabel('Signature status')).toContainText('Invalid signature');
  await page.getByLabel('JWT', { exact: true }).fill('not.a-token');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('A JWT has 3 parts');
});

test('regex tester highlights matches, lists groups and previews replacements', async ({ page }) => {
  await page.goto('/regex-tester/');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Status', { exact: true })).toContainText('3 matches, 2 groups each');
  await expect(page.locator('.regex-editor .cm-match')).toHaveCount(3);
  await expect(page.getByLabel('Matches')).toContainText('domain: navy.mil.');
  await expect.poll(() => editorText(page, 'Replace result')).toContain('help at diffdrop.dev');
  await page.getByLabel('Regular expression').fill('(unclosed');
  await expect(page.getByLabel('Status', { exact: true })).toContainText(/unterminated group|missing \)/i);
});

test('regex tester stops a catastrophic pattern instead of freezing', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', "Safari's regex engine gives up on this pattern by itself, so there is no hang to stop");
  await page.goto('/regex-tester/');
  await page.getByLabel('Test text').fill('a'.repeat(40) + '!');
  await page.getByLabel('Regular expression').fill('^(a+)+$');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('backtracks catastrophically', { timeout: 6000 });
  // The page still responds, and a sane pattern works again
  await page.getByLabel('Regular expression').fill('a+');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('1 match');
});

test('URL encoder encodes, decodes, pinpoints bad escapes and splits URLs', async ({ page }) => {
  await page.goto('/url-encoder-decoder/');
  await page.getByLabel('Text to encode').fill('a b&c=é');
  await expect.poll(() => editorText(page, 'Encoded text')).toBe('a%20b%26c%3D%C3%A9');
  await page.getByRole('radio', { name: 'Form' }).click();
  await expect.poll(() => editorText(page, 'Encoded text')).toBe('a+b%26c%3D%C3%A9');
  await page.getByRole('radio', { name: 'Decode' }).click();
  await expect.poll(() => editorText(page, 'Decoded text')).toBe('a b&c=é');
  await page.getByLabel('Text to decode').fill('100% sure');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('at line 1, column 4');
  await page.getByRole('radio', { name: 'Component' }).click();
  await page.getByLabel('Text to decode').fill('https://x.io/p?q=caf%C3%A9&n=1#top');
  await expect(page.getByLabel('Query parameters')).toContainText('café');
  await expect(page.getByLabel('URL parts')).toContainText('x.io');
});

test('the new tools make no network requests while working', async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p.path, { waitUntil: 'networkidle' });
    const requests = trackOutgoing(page);
    await page.getByRole('button', { name: 'Load example' }).click();
    await page.waitForTimeout(300);
    expect(requests, p.path).toEqual([]);
  }
});

test('guides link to the tools and ship article data', async ({ page, request }) => {
  await page.goto('/guides/json-to-csv-excel/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('JSON to CSV for Excel: nested objects, arrays and encoding');
  await page.getByRole('link', { name: 'Open the JSON to CSV' }).click();
  await expect(page).toHaveURL(/\/json-to-csv\/$/);
  const html = await (await request.get('/guides/compare-json-files/')).text();
  expect(html).toContain('>How to compare two JSON files</h1>');
  expect(html).toMatch(/"@type":"TechArticle"/);
});
