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
  const outgoing = trackOutgoing(page);
  return () => {
    expect(outgoing).toEqual([]);
    expect(errors).toEqual([]);
  };
}

test('uuid generator makes v4 and v7 batches and checks a UUID', async ({ page }) => {
  const done = await open(page, '/uuid-generator/', 'UUID generator');
  const out = () => editorText(page, 'Generated UUIDs');
  await expect.poll(async () => (await out()).split('\n').length).toBe(10);
  for (const line of (await out()).split('\n')) expect(line).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  await page.getByRole('radio', { name: 'v7' }).click();
  await page.getByLabel('How many').fill('25');
  await expect.poll(async () => (await out()).split('\n').length).toBe(25);
  const v7 = (await out()).split('\n');
  expect([...v7].sort()).toEqual(v7);
  for (const line of v7) expect(line[14]).toBe('7');

  await page.getByLabel('Uppercase').click();
  await page.getByLabel('Braces {}').click();
  await expect.poll(async () => (await out()).split('\n')[0]).toMatch(/^\{[0-9A-F-]{36}\}$/);
  // Formatting doesn't regenerate
  expect((await out()).split('\n')[0]!.slice(1, -1).toLowerCase()).toBe(v7[0]);

  await page.getByRole('button', { name: 'Regenerate' }).click();
  await expect.poll(async () => (await out()).split('\n')[0]!.slice(1, -1).toLowerCase()).not.toBe(v7[0]);

  await expect(page.getByRole('button', { name: 'Copy all' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download uuids.txt' })).toBeVisible();

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('UUID check')).toContainText('Valid UUID, version 7');
  await page.getByLabel('UUID to check').fill('not-a-uuid');
  await expect(page.getByLabel('UUID check')).toContainText('isn’t a hex digit');
  done();
});

test('hash generator hashes text, compares a checksum and does HMAC', async ({ page }) => {
  const done = await open(page, '/hash-generator/', 'Hash generator');
  await page.getByLabel('Text to hash', { exact: true }).fill('abc');
  await expect(page.getByLabel('MD5', { exact: true })).toHaveText('900150983cd24fb0d6963f7d28e17f72');
  await expect(page.getByLabel('SHA-256', { exact: true })).toHaveText('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await expect(page.getByText('not secure for passwords or signatures')).toHaveCount(2);

  await page.getByRole('radio', { name: 'Base64' }).click();
  await expect(page.getByLabel('MD5', { exact: true })).toHaveText('kAFQmDzST7DWlj99KOF/cg==');
  await page.getByRole('radio', { name: 'hex', exact: true }).click();

  await page.getByLabel('compare with expected hash').fill('A9993E364706816ABA3E25717850C26C9CD0D89D');
  await expect(page.getByLabel('Hash comparison')).toHaveText('Match: SHA-1');
  await page.getByLabel('compare with expected hash').fill('0'.repeat(64));
  await expect(page.getByLabel('Hash comparison')).toHaveText('No match with any hash above');

  await page.getByLabel('HMAC', { exact: true }).click();
  await page.getByLabel('HMAC key').fill('key');
  await page.getByLabel('Text to hash', { exact: true }).fill('The quick brown fox jumps over the lazy dog');
  await expect(page.getByLabel('HMAC-SHA-256', { exact: true })).toHaveText('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  await page.getByLabel('HMAC', { exact: true }).click();

  // A binary file is hashed as bytes, locally
  await page.getByLabel('File to hash').setInputFiles({ name: 'bytes.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 255, 1, 254]) });
  await expect(page.getByText('bytes.bin')).toBeVisible();
  await expect(page.getByLabel('MD5', { exact: true })).toHaveText('e60bc83b2d77afcd721b626437a3b805');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Hash comparison')).toHaveText('Match: SHA-256');
  await expect(page.getByRole('button', { name: 'Copy SHA-256' })).toBeVisible();
  done();
});

test('number base converter updates every base and explains errors', async ({ page }) => {
  const done = await open(page, '/number-base-converter/', 'Number base converter');
  await page.getByLabel('Decimal number', { exact: true }).fill('255');
  await expect(page.getByLabel('Binary number', { exact: true })).toHaveValue('11111111');
  await expect(page.getByLabel('Octal number', { exact: true })).toHaveValue('377');
  await expect(page.getByLabel('Hexadecimal number', { exact: true })).toHaveValue('FF');
  await expect(page.getByLabel('Base 36 number', { exact: true })).toHaveValue('73');

  await page.getByLabel('Hexadecimal number', { exact: true }).fill('-0xdead_beef');
  await expect(page.getByLabel('Decimal number', { exact: true })).toHaveValue('-3735928559');

  await page.getByLabel('Binary number', { exact: true }).fill('10201');
  await expect(page.getByLabel('Status')).toContainText('“2” isn’t a binary digit');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Hexadecimal number', { exact: true })).toHaveValue('FFFFFFFFFFFFFFFF');
  await page.getByLabel('Group digits').click();
  await expect(page.getByLabel('Hexadecimal number', { exact: true })).toHaveValue('FF FF FF FF FF FF FF FF');
  await expect(page.getByRole('button', { name: 'Copy hex' })).toBeVisible();
  done();
});

test('html entity encoder escapes and decodes without running HTML', async ({ page }) => {
  const done = await open(page, '/html-entity-encoder/', 'HTML entity encoder and decoder');
  await page.getByLabel('Text to encode', { exact: true }).fill(`<b class="x">Tom & Jerry's café</b>`);
  await expect.poll(() => editorText(page, 'Encoded text')).toBe('&lt;b class=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s café&lt;/b&gt;');
  await page.getByLabel('Encode non-ASCII too').click();
  await expect.poll(() => editorText(page, 'Encoded text')).toContain('caf&eacute;');

  await page.getByRole('radio', { name: 'Decode' }).click();
  // The encoded text moved to the input, so decoding gives the original back
  await expect.poll(() => editorText(page, 'Decoded text')).toBe(`<b class="x">Tom & Jerry's café</b>`);

  await page.getByLabel('Text to decode', { exact: true }).fill('&lt;img src=x onerror=alert(1)&gt; &hearts; &#x1F600; &bogus;');
  await expect.poll(() => editorText(page, 'Decoded text')).toBe('<img src=x onerror=alert(1)> ♥ 😀 &bogus;');
  await expect(page.getByLabel('Status')).toContainText('&bogus;');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'Decoded text')).toContain('<a href="/search?q=café&lang=fr">Café ☕</a> © 2026');
  await expect(page.getByRole('button', { name: 'Copy' }).last()).toBeVisible();
  done();
});

test('slug generator makes one slug per line with options', async ({ page }) => {
  const done = await open(page, '/slug-generator/', 'Slug generator');
  await page.getByLabel('Text to slugify', { exact: true }).fill('Crème Brûlée: A Beginner’s Guide 🍮\nStraße & Łódź');
  await expect.poll(() => editorText(page, 'Slugs')).toBe('creme-brulee-a-beginners-guide\nstrasse-and-lodz');
  await page.getByRole('radio', { name: 'Underscore' }).click();
  await page.getByLabel('Remove stop words').click();
  await expect.poll(() => editorText(page, 'Slugs')).toBe('creme_brulee_beginners_guide\nstrasse_lodz');
  await page.getByLabel('Max length').fill('15');
  await expect.poll(() => editorText(page, 'Slugs')).toBe('creme_brulee\nstrasse_lodz');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'Slugs')).toContain('creme_brulee');
  await expect(page.getByRole('button', { name: 'Download slugs.txt' })).toBeVisible();
  done();
});

test('cron generator explains, lists next runs and reports errors', async ({ page }) => {
  const done = await open(page, '/cron-generator/', 'Cron expression generator');
  const expr = page.getByLabel('Cron expression', { exact: true });
  await expr.fill('0 9 * * 1-5');
  await expect(page.getByLabel('Explanation')).toHaveText('At 09:00, Monday through Friday');
  const runs = page.getByRole('list', { name: 'Next runs' }).getByRole('listitem');
  await expect(runs).toHaveCount(10);
  const times = await page.locator('ol[aria-label="Next runs"] time').evaluateAll((els) => els.map((e) => new Date(e.getAttribute('datetime')!)));
  for (const t of times) {
    expect(t.getHours()).toBe(9);
    expect(t.getMinutes()).toBe(0);
    expect([1, 2, 3, 4, 5]).toContain(t.getDay());
  }

  await page.getByRole('button', { name: 'Every 5 minutes' }).click();
  await expect(expr).toHaveValue('*/5 * * * *');
  await expect(page.getByLabel('Explanation')).toHaveText('Every 5 minutes');

  await page.getByLabel('hour', { exact: true }).fill('9-17');
  await expect(expr).toHaveValue('*/5 9-17 * * *');
  await expect(page.getByLabel('Explanation')).toHaveText('Every 5 minutes, between 09:00 and 17:59');

  await expr.fill('0 25 * * *');
  await expect(page.getByLabel('Cron status')).toHaveText('Hour field (“25”): 25 is out of range (0–23)');
  await expr.fill('@weekly');
  await expect(page.getByLabel('Explanation')).toHaveText('At 00:00, on Sunday');

  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(expr).toHaveValue('*/15 9-17 * * MON-FRI');
  await expect(page.getByRole('button', { name: 'Copy expression' })).toBeVisible();
  done();
});
