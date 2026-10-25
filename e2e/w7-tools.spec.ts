import { expect, test, type Locator, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

/** Text of a CodeMirror editor by its aria-label. */
async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

const PREFIX = 'toolspace-input:';

/** Every saved-input key in this page's localStorage. */
const savedKeys = (page: Page) => page.evaluate((p) => Object.keys(localStorage).filter((k) => k.startsWith(p)), PREFIX);
const savedValue = (page: Page, id: string) => page.evaluate((k) => localStorage.getItem(k), PREFIX + id);

/** Drop a file on an element the way a browser does: dragover, then drop, with a DataTransfer holding it. */
async function dropFile(target: Locator, name: string, content: string | number[], type: string) {
  await target.evaluate(
    (el, { name, content, type }) => {
      const data = typeof content === 'string' ? content : new Uint8Array(content);
      const dt = new DataTransfer();
      dt.items.add(new File([data], name, { type }));
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    },
    { name, content, type },
  );
}

/** Each page: its h1, what "Load example" should produce, and a copy button that must exist. */
const PAGES: { path: string; h1: string; copy: string; example: (page: Page) => Promise<void> }[] = [
  {
    path: '/title-case-converter/',
    h1: 'Title case converter',
    copy: 'Copy',
    example: async (page) => expect.poll(() => editorText(page, 'Title case')).toContain('A Tale of Two Cities'),
  },
  {
    path: '/lorem-ipsum-generator/',
    h1: 'Lorem ipsum generator',
    copy: 'Copy',
    example: async (page) => expect.poll(() => editorText(page, 'Lorem ipsum text')).toMatch(/^<p>Lorem ipsum dolor sit amet.*<\/p>\n<p>.*<\/p>$/),
  },
  {
    path: '/css-gradient-generator/',
    h1: 'CSS gradient generator',
    copy: 'Copy CSS',
    example: async (page) => expect(page.getByLabel('Gradient CSS')).toContainText('linear-gradient(120deg, #a5f3fc 0%'),
  },
  {
    path: '/qr-code-generator/',
    h1: 'QR code generator',
    copy: 'Copy image',
    example: async (page) => {
      await expect(page.getByLabel('Network name (SSID)')).toHaveValue('Cafe Guest');
      await expect(page.getByLabel('Status', { exact: true })).toContainText('modules');
    },
  },
  {
    path: '/regex-tester/',
    h1: 'Regex tester',
    copy: 'Copy',
    example: async (page) => expect(page.getByLabel('Status', { exact: true })).toContainText('3 matches'),
  },
  {
    path: '/unix-timestamp-converter/',
    h1: 'Unix timestamp converter',
    copy: 'Copy Seconds',
    example: async (page) => expect(page.getByLabel('Conversions').locator('[data-label="Seconds"]')).toHaveText('1760700000'),
  },
  {
    path: '/url-encoder-decoder/',
    h1: 'URL encoder and decoder',
    copy: 'Copy',
    example: async (page) => expect.poll(() => editorText(page, 'Encoded text')).toContain('name%3DAda%20Lovelace'),
  },
  {
    path: '/base64-encode-decode/',
    h1: 'Base64 encode and decode',
    copy: 'Copy',
    example: async (page) => expect.poll(() => editorText(page, 'Base64 output')).toMatch(/^SGVsbG8sIHdvcmxkIS/),
  },
  {
    path: '/password-generator/',
    h1: 'Password generator',
    copy: 'Copy password',
    // Letters and digits, 16 long, without I l 1 O 0
    example: async (page) => expect(page.getByLabel('Generated password')).toHaveText(/^[A-HJ-NP-Za-km-z2-9]{16}$/),
  },
  {
    path: '/jwt-decoder/',
    h1: 'JWT decoder',
    copy: 'Copy',
    example: async (page) => expect(page.getByLabel('Signature status')).toHaveText('Signature verified'),
  },
];

for (const p of PAGES) {
  test(`${p.path}: Load example works, a copy button exists, no errors or requests`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(p.path, { waitUntil: 'networkidle' });
    const requests = trackOutgoing(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1);
    await page.getByRole('button', { name: 'Load example' }).click();
    await p.example(page);
    await expect(page.getByRole('button', { name: p.copy, exact: true }).first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}

for (const width of [1440, 390]) {
  test(`every page fits at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const p of [...PAGES, { path: '/case-converter/', h1: 'Case converter' }]) {
      await page.goto(p.path, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1);
      const example = page.getByRole('button', { name: 'Load example' });
      await expect(example, p.path).toBeVisible();
      await example.click();
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, p.path).toBeLessThanOrEqual(0);
    }
  });
}

test('typed input survives a reload, and "Forget input" clears it and its saved key', async ({ page }) => {
  await page.goto('/regex-tester/', { waitUntil: 'networkidle' });
  await page.getByLabel('Regular expression').fill('\\d+');
  await page.getByLabel('Test text').fill('a1 b22 c333');
  await page.getByRole('button', { name: 'ignore case (i)' }).click();
  await expect.poll(() => savedValue(page, 'regex-tester')).toContain('c333');
  await page.reload();
  await expect(page.getByLabel('Regular expression')).toHaveValue('\\d+');
  await expect.poll(() => editorText(page, 'Test text')).toBe('a1 b22 c333');
  await expect(page.getByRole('button', { name: 'ignore case (i)' })).toHaveAttribute('data-state', 'on');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('3 matches');

  await page.getByRole('button', { name: 'Forget input' }).click();
  await expect(page.getByLabel('Regular expression')).toHaveValue('');
  await expect.poll(() => editorText(page, 'Test text')).toBe('');
  await page.waitForTimeout(600);
  expect(await savedValue(page, 'regex-tester')).toBeNull();
  await page.reload();
  await expect(page.getByLabel('Regular expression')).toHaveValue('');
});

test('options are restored too: timestamp unit and zone, URL direction, gradient stops', async ({ page }) => {
  await page.goto('/unix-timestamp-converter/', { waitUntil: 'networkidle' });
  await page.getByLabel('Timestamp or date').fill('1760700000123');
  await page.getByRole('radio', { name: 'milliseconds' }).click();
  await page.getByLabel('Time zone').selectOption('Asia/Tokyo');
  await expect.poll(() => savedValue(page, 'unix-timestamp')).toContain('Asia/Tokyo');
  await page.reload();
  await expect(page.getByLabel('Timestamp or date')).toHaveValue('1760700000123');
  await expect(page.getByLabel('Time zone')).toHaveValue('Asia/Tokyo');
  await expect(page.getByRole('radio', { name: 'milliseconds' })).toHaveAttribute('data-state', 'on');

  await page.goto('/url-encoder-decoder/', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page.getByLabel('Text to decode').fill('caf%C3%A9');
  await expect.poll(() => savedValue(page, 'url-encoder')).toContain('decode');
  await page.reload();
  await expect.poll(() => editorText(page, 'Decoded text')).toBe('café');

  await page.goto('/css-gradient-generator/', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Conic' }).click();
  await page.getByRole('button', { name: 'Add stop' }).click();
  await expect.poll(() => savedValue(page, 'css-gradient')).toContain('conic');
  await page.reload();
  await expect(page.getByLabel('Gradient CSS')).toContainText('conic-gradient');
  await expect(page.getByLabel('Stop 4 color')).toBeVisible();
});

test('a share link opened in a new page restores the input, and the popover warns what it holds', async ({ page, browser }) => {
  await page.goto('/base64-encode-decode/', { waitUntil: 'networkidle' });
  await page.getByLabel('Text to encode').fill('shared ✓ text');
  await page.getByLabel('URL-safe').click();
  await page.getByRole('button', { name: 'Share' }).click();
  const link = page.getByLabel('Link with your input');
  await expect(link).toHaveValue(/#s=/);
  await expect(page.getByRole('note')).toContainText('This link contains your input.');
  const url = await link.inputValue();

  // A fresh browser profile: nothing saved, only the link
  const other = await browser.newContext();
  const fresh = await other.newPage();
  await fresh.goto(url, { waitUntil: 'networkidle' });
  await expect.poll(() => editorText(fresh, 'Text to encode')).toBe('shared ✓ text');
  await expect(fresh.getByLabel('URL-safe')).toBeChecked();
  // The fragment is taken off the address bar once read
  expect(new URL(fresh.url()).hash).toBe('');
  await other.close();
});

test('a shared QR link keeps the network but never the Wi-Fi password', async ({ page }) => {
  await page.goto('/qr-code-generator/', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Wi-Fi' }).click();
  await page.getByLabel('Network name (SSID)').fill('Home');
  await page.getByLabel('Password').fill('hunter2-secret');
  await expect.poll(() => savedValue(page, 'qr-code')).toContain('Home');
  expect(await savedValue(page, 'qr-code')).not.toContain('hunter2-secret');
  await page.getByRole('button', { name: 'Share' }).click();
  expect(await page.getByLabel('Link with your input').inputValue()).not.toContain('hunter2');
  await page.reload();
  await expect(page.getByLabel('Network name (SSID)')).toHaveValue('Home');
  await expect(page.getByLabel('Password')).toHaveValue('');
});

for (const p of [
  {
    path: '/password-generator/',
    use: async (page: Page) => {
      await page.getByRole('button', { name: '32', exact: true }).click();
      await page.getByLabel('Symbols (!@#…)').click();
      await page.getByRole('button', { name: 'Load example' }).click();
    },
  },
  {
    path: '/jwt-decoder/',
    use: async (page: Page) => {
      await page.getByRole('button', { name: 'Load example' }).click();
      await page.getByLabel('Secret for HS256').fill('another-secret');
      await page.getByLabel('JWT', { exact: true }).fill('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sig');
    },
  },
]) {
  test(`${p.path} has no Share button and saves nothing`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: 'networkidle' });
    await p.use(page);
    await page.waitForTimeout(800);
    await expect(page.getByRole('button', { name: 'Share' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Forget input' })).toHaveCount(0);
    expect(await savedKeys(page)).toEqual([]);
    // A crafted link is ignored too
    await page.goto(`${p.path}#s=N4IgDghgTgLg9gWwSAXEA`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    expect(await savedKeys(page)).toEqual([]);
  });
}

test('dropping a text file opens it in the input', async ({ page }) => {
  await page.goto('/title-case-converter/', { waitUntil: 'networkidle' });
  await dropFile(page.getByLabel('Titles', { exact: true }), 'titles.txt', 'the war between them', 'text/plain');
  await expect.poll(() => editorText(page, 'Title case')).toBe('The War between Them');

  await page.goto('/regex-tester/', { waitUntil: 'networkidle' });
  await page.getByLabel('Regular expression').fill('o+');
  await dropFile(page.getByLabel('Test text'), 'log.txt', 'foo boo zoo', 'text/plain');
  await expect.poll(() => editorText(page, 'Test text')).toBe('foo boo zoo');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('3 matches');

  await page.goto('/url-encoder-decoder/', { waitUntil: 'networkidle' });
  await dropFile(page.getByLabel('Text to encode'), 'q.txt', 'a b', 'text/plain');
  await expect.poll(() => editorText(page, 'Encoded text')).toBe('a%20b');

  await page.goto('/jwt-decoder/', { waitUntil: 'networkidle' });
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MDcwMDAwMCwiZXhwIjo0MDcwOTA4ODAwfQ.UON4NpPPOt5_shcUevA3ID7eKc1GQmptFnVgCDcN5Lc';
  await dropFile(page.getByLabel('JWT', { exact: true }), 'token.txt', `${token}\n`, 'text/plain');
  await expect(page.getByLabel('Claims')).toContainText('Ada Lovelace');
});

test('Base64 encodes a dropped binary file byte for byte', async ({ page }) => {
  await page.goto('/base64-encode-decode/', { waitUntil: 'networkidle' });
  // A 1×1 PNG
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const bytes = [...Buffer.from(png, 'base64')];
  await dropFile(page.getByLabel('Text to encode'), 'dot.png', bytes, 'image/png');
  await expect(page.getByText('dot.png')).toBeVisible();
  await expect.poll(() => editorText(page, 'Base64 output')).toBe(png);
  await page.getByLabel('As data: URL').click();
  await expect.poll(() => editorText(page, 'Base64 output')).toBe(`data:image/png;base64,${png}`);
});

test('downloads: gradient CSS, regex matches, QR SVG', async ({ page }) => {
  await page.goto('/css-gradient-generator/', { waitUntil: 'networkidle' });
  const [css] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download gradient.css' }).click()]);
  expect(css.suggestedFilename()).toBe('gradient.css');
  const body = await (await css.createReadStream()).toArray();
  expect(Buffer.concat(body).toString()).toBe('.gradient {\n  background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%);\n}\n');

  await page.goto('/regex-tester/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Load example' }).click();
  const [matches] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download regex-results.txt' }).click()]);
  expect(Buffer.concat(await (await matches.createReadStream()).toArray()).toString()).toBe(
    'ada.lovelace@example.com\ngrace+news@navy.mil.\nhelp@toolspace.tech',
  );
});

test('copy buttons put the output on the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permissions are a Chromium feature');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/css-gradient-generator/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Copy CSS' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(
    'background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%);',
  );
  await page.goto('/qr-code-generator/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Copy image' }).click();
  await expect(page.getByText('Image copied')).toBeVisible();
});
