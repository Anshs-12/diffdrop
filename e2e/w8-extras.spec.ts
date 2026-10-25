import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

/** Opens a page with nothing saved, checks its h1 and watches for requests and errors; call the returned check at the end. */
async function open(page: Page, path: string, h1: string) {
  const errors = trackErrors(page);
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
  // From here on, using the tool must not make any request
  const requests = trackOutgoing(page);
  return () => {
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  };
}

test('px to rem converts one value, CSS in batch, and follows the root size', async ({ page }) => {
  const done = await open(page, '/px-to-rem/', 'PX to REM converter');
  await page.getByLabel('Value in px').fill('24px');
  await expect(page.getByLabel('Result')).toHaveText('1.5rem');
  await page.getByLabel('Root font size in px').fill('10');
  await expect(page.getByLabel('Result')).toHaveText('2.4rem');
  await expect(page.getByLabel('Reference table')).toContainText('1.4rem');
  await page.getByRole('button', { name: 'Swap direction' }).click();
  await expect(page.getByLabel('Value in rem')).toHaveValue('2.4');
  await expect(page.getByLabel('Result')).toHaveText('24px');
  await page.getByLabel('Value in rem').fill('abc');
  await expect(page.getByLabel('Status')).toContainText('isn’t a number');
  await page.getByLabel('Root font size in px').fill('16');

  await page.getByRole('radio', { name: 'Batch' }).click();
  await page.getByRole('radio', { name: 'px → rem' }).click();
  await page.getByLabel('Values to convert', { exact: true }).fill('a { padding: 8px 12px; border: 1px solid; background: url(x-16px.png) }\n32');
  await expect.poll(() => editorText(page, 'Converted values')).toBe('a { padding: 0.5rem 0.75rem; border: 0.0625rem solid; background: url(x-16px.png) }\n2rem');
  await page.getByLabel('Keep 1px').click();
  await expect.poll(() => editorText(page, 'Converted values')).toContain('border: 1px solid');
  await page.getByRole('radio', { name: '2 decimals' }).click();
  await page.getByLabel('Values to convert', { exact: true }).fill('13');
  await expect.poll(() => editorText(page, 'Converted values')).toBe('0.81rem');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'Converted values')).toContain('font-size: 0.88rem;');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download converted.css' })).toBeVisible();
  done();
});

test('email extractor finds, dedupes, filters and sorts addresses', async ({ page }) => {
  const done = await open(page, '/email-extractor/', 'Email extractor');
  await page
    .getByLabel('Text to search', { exact: true })
    .fill('Mail <a href="mailto:zoe@Example.com?subject=x">Zoe</a>, bob@example.com. Also BOB@EXAMPLE.COM; bob@example.com and josé@exämple.de, logo@2x.png');
  await expect.poll(() => editorText(page, 'Email addresses')).toBe('zoe@example.com\nbob@example.com\nBOB@example.com\njosé@exämple.de');
  await expect(page.getByLabel('Count')).toContainText('4 email addresses (1 duplicate removed)');

  await page.getByLabel('Lowercase').click();
  await page.getByLabel('Sort A–Z').click();
  await page.getByRole('radio', { name: 'Comma separated' }).click();
  await expect.poll(() => editorText(page, 'Email addresses')).toBe('bob@example.com, josé@exämple.de, zoe@example.com');
  await page.getByLabel('Only these domains').fill('example.com');
  await expect.poll(() => editorText(page, 'Email addresses')).toBe('bob@example.com, zoe@example.com');
  await expect(page.getByLabel('Count')).toContainText('outside the domain filter');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'Email addresses')).toContain('billing+invoices@accounts.example.com');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download emails.txt' })).toBeVisible();
  done();
});

test('user agent parser reads the visitor’s browser and pasted strings', async ({ page }) => {
  const done = await open(page, '/user-agent-parser/', 'User agent parser');
  const own = await page.evaluate(() => navigator.userAgent);
  await expect(page.locator('#ua-input')).toHaveValue(own);
  await expect(page.getByLabel('Engine', { exact: true })).toHaveText(/Blink/);
  await expect(page.getByLabel('Client hints')).toContainText('navigator.userAgentData');

  await page.locator('#ua-input').fill('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68');
  await expect(page.getByLabel('Browser', { exact: true })).toHaveText('Microsoft Edge 130.0.2849.68');
  await expect(page.getByLabel('Operating system', { exact: true })).toHaveText('Windows 10 or 11');
  await expect(page.getByLabel('Device type', { exact: true })).toHaveText('Desktop');
  await expect(page.getByText('can’t tell Windows 10 and 11 apart')).toBeVisible();

  await page.getByRole('button', { name: 'Googlebot' }).click();
  await expect(page.getByLabel('Device type', { exact: true })).toHaveText('Bot');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Browser', { exact: true })).toHaveText('Mobile Safari 18.1');
  await expect(page.getByLabel('Operating system', { exact: true })).toHaveText('iOS 18.1');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download user-agent.json' })).toBeVisible();

  await page.getByRole('button', { name: 'Use my browser' }).click();
  await expect(page.locator('#ua-input')).toHaveValue(own);
  done();
});

test('jsonpath tester shows matches with normalized paths and explains errors', async ({ page }) => {
  const done = await open(page, '/jsonpath-tester/', 'JSONPath tester');
  await page.getByLabel('JSON input', { exact: true }).fill('{"a": [3, 5, 1, 2, 4, 6, {"b": "j"}, {"b": "k"}, {"b": {}}, {"b": "kilo"}], "o": {"p": 1, "q": 2}}');
  const expr = page.locator('#jsonpath-expr');
  await expr.fill('$.a[?@.b == "kilo" || @ > 4]');
  await expect(page.getByLabel('Expression status')).toHaveText(/3 matches/);
  await page.getByRole('radio', { name: 'Paths' }).click();
  await expect.poll(() => editorText(page, 'Matches')).toBe(`[\n  "$['a'][1]",\n  "$['a'][5]",\n  "$['a'][9]"\n]`);
  await page.getByRole('radio', { name: 'Values' }).click();
  await expect.poll(() => editorText(page, 'Matches')).toBe('[\n  5,\n  6,\n  {\n    "b": "kilo"\n  }\n]');

  await expr.fill("$.a[?match(@.b, '[jk]')].b");
  await expect.poll(() => editorText(page, 'Matches')).toBe('[\n  "j",\n  "k"\n]');

  await expr.fill('$.a[?@.b = 1]');
  await expect(page.getByLabel('Expression status')).toContainText('Use == to compare (at character 10)');
  await expr.fill('$.o[name]');
  await expect(page.getByLabel('Expression status')).toContainText("Names in brackets need quotes: ['name']");

  await page.getByRole('button', { name: 'Load example' }).click();
  await page.getByRole('radio', { name: 'Both' }).click();
  await expect.poll(() => editorText(page, 'Matches')).toContain(`"path": "$['store']['book'][2]['title']"`);
  await page.getByRole('button', { name: /^\$\.\.book\[-1\]/ }).click();
  await expect.poll(() => editorText(page, 'Matches')).toContain('The Lord of the Rings');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download matches.json' })).toBeVisible();
  done();
});

test('the new pages fit a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/px-to-rem/', '/email-extractor/', '/user-agent-parser/', '/jsonpath-tester/']) {
    await page.goto(path);
    await page.getByRole('button', { name: 'Load example' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(390);
  }
});
