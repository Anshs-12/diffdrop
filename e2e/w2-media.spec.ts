import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** A real RGBA PNG of the given size with a gradient, built in memory. */
function makePng(w: number, h: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * (w * 4 + 1) + 1 + x * 4;
      raw[i] = (x * 255) / w;
      raw[i + 1] = (y * 255) / h;
      raw[i + 2] = ((x ^ y) * 7) & 255;
      raw[i + 3] = 255;
    }
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Open a page, then record outgoing requests (after the page's own load) and errors. */
async function open(page: Page, path: string) {
  const errors = trackErrors(page);
  await page.goto(path, { waitUntil: 'networkidle' });
  return { out: trackOutgoing(page), errors };
}
async function clean(g: { out: string[]; errors: string[] }) {
  expect(g.out).toEqual([]);
  expect(g.errors).toEqual([]);
}

test('color palette builds palettes and exports them', async ({ page }) => {
  const g = await open(page, '/color-palette-generator/');
  await expect(page.locator('h1')).toHaveText('Color palette generator');
  await page.getByLabel('Base color', { exact: true }).fill('#3b82f6');
  const scale = page.getByRole('region', { name: 'Tints and shades' });
  await expect(scale.getByRole('button')).toHaveCount(11);
  await expect(scale.getByRole('button', { name: 'Copy #3b82f6' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Complementary', exact: true }).getByRole('button')).toHaveCount(2);
  await expect.poll(() => editorText(page, 'Exported palette')).toContain('--brand-500: #3b82f6;');
  await page.getByRole('radio', { name: 'Tailwind v4' }).click();
  await expect.poll(() => editorText(page, 'Exported palette')).toContain('@theme {');
  await page.getByLabel('Base color', { exact: true }).fill('not a color');
  await expect(page.getByLabel('Status')).toContainText('isn’t a color');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Base color', { exact: true })).toHaveValue('#e8590c');
  await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Color converter' }).last()).toBeVisible();
  await clean(g);
});

test('contrast checker rates a pair and suggests a fix', async ({ page }) => {
  const g = await open(page, '/color-contrast-checker/');
  await expect(page.locator('h1')).toHaveText('Contrast checker');
  await page.getByLabel('Text color', { exact: true }).fill('#000');
  await page.getByLabel('Background color', { exact: true }).fill('rgb(255 255 255)');
  await expect(page.getByLabel('Contrast ratio')).toHaveAttribute('data-ratio', '21.00');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Contrast ratio')).toHaveAttribute('data-ratio', '4.47');
  await expect(page.locator('[data-check="aa"]')).toHaveAttribute('data-pass', 'false');
  await expect(page.locator('[data-check="aa-large"]')).toHaveAttribute('data-pass', 'true');
  await expect(page.locator('[data-suggest="AA"]')).toContainText('#767676');
  await page.locator('[data-suggest="AA"]').getByRole('button', { name: 'Use' }).click();
  await expect(page.getByLabel('Text color', { exact: true })).toHaveValue('#767676');
  await expect(page.locator('[data-check="aa"]')).toHaveAttribute('data-pass', 'true');
  await page.getByRole('button', { name: 'Swap text and background' }).click();
  await expect(page.getByLabel('Text color', { exact: true })).toHaveValue('#ffffff');
  await expect(page.getByRole('button', { name: 'Copy result' })).toBeVisible();
  await page.getByLabel('Background color', { exact: true }).fill('hsl(nope)');
  await expect(page.getByLabel('Status')).toContainText('The background color isn’t a color');
  await clean(g);
});

test('aspect ratio simplifies and solves', async ({ page }) => {
  const g = await open(page, '/aspect-ratio-calculator/');
  await expect(page.locator('h1')).toHaveText('Aspect ratio calculator');
  await page.getByLabel('Width', { exact: true }).first().fill('1366');
  await page.getByLabel('Height', { exact: true }).first().fill('768');
  await expect(page.getByLabel('Simplified ratio')).toHaveText('683:384');
  await expect(page.getByRole('region', { name: 'Ratio from a size' })).toContainText('close to 16:9');
  await page.getByRole('button', { name: '4:3' }).click();
  const solve = page.getByRole('region', { name: 'Missing side' });
  await solve.getByLabel('Width', { exact: true }).fill('1000');
  await expect(solve.getByLabel('Height', { exact: true })).toHaveValue('750');
  await expect(page.getByRole('table', { name: 'Common sizes' })).toContainText('1024 × 768');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Simplified ratio')).toHaveText('16:9');
  await expect(solve.getByLabel('Height', { exact: true })).toHaveValue('720');
  await expect(page.getByRole('button', { name: 'Copy ratio' })).toBeVisible();
  await clean(g);
});

test('image compressor re-encodes an uploaded PNG', async ({ page }) => {
  const g = await open(page, '/image-compressor/');
  await expect(page.locator('h1')).toHaveText('Image compressor');
  await page.getByRole('radio', { name: 'WebP' }).click();
  await page.getByLabel('Choose images').setInputFiles({ name: 'grad.png', mimeType: 'image/png', buffer: makePng(320, 200) });
  const item = page.getByTestId('compressed-item').first();
  await expect(item).toContainText('320 × 200');
  await expect(item.getByLabel('Size change')).toContainText('→');
  await expect(item.getByRole('img', { name: 'Compressed grad.png' })).toHaveAttribute('src', /^data:image\/webp/);
  const download = page.waitForEvent('download');
  await item.getByRole('button', { name: /Download/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^grad\.(webp|png)$/);
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByTestId('compressed-item')).toHaveCount(2);
  await expect(page.getByTestId('compressed-item').nth(1)).toContainText('1600 × 1000');
  await expect(page.getByRole('button', { name: 'Download all' })).toBeEnabled();
  await clean(g);
});

test('image resizer resizes with the ratio locked', async ({ page }) => {
  const g = await open(page, '/image-resizer/');
  await expect(page.locator('h1')).toHaveText('Image resizer');
  await page.getByLabel('Choose an image').setInputFiles({ name: 'grad.png', mimeType: 'image/png', buffer: makePng(400, 300) });
  await page.getByLabel('Width (px)').fill('100');
  await expect(page.getByLabel('Height (px)')).toHaveValue('75');
  await expect(page.getByLabel('Resized image')).toContainText('100 × 75');
  await page.getByRole('radio', { name: 'JPEG' }).click();
  await expect(page.getByLabel('Resized image')).toContainText('JPEG');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('grad-100x75.jpg');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('Resized image')).toContainText('1200 × 800');
  await clean(g);
});

test('favicon generator makes an ICO and PNGs', async ({ page }) => {
  const g = await open(page, '/favicon-generator/');
  await expect(page.locator('h1')).toHaveText('Favicon generator');
  await page.getByLabel('Choose an image').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: makePng(256, 256) });
  await expect(page.locator('[data-file]')).toHaveCount(6);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download favicon.ico' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('favicon.ico');
  const bytes = await new Promise<Buffer>(async (resolve) => {
    const s = await file.createReadStream();
    const parts: Buffer[] = [];
    s.on('data', (d: Buffer) => parts.push(d));
    s.on('end', () => resolve(Buffer.concat(parts)));
  });
  expect([...bytes.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
  expect([bytes[6], bytes[22], bytes[38]]).toEqual([16, 32, 48]);
  expect(await editorText(page, 'Link tags')).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
  await page.getByRole('radio', { name: 'Color' }).click();
  await expect.poll(() => editorText(page, 'Web manifest')).toContain('"background_color": "#ffffff"');
  // An SVG source is drawn too
  await page.getByRole('button', { name: 'Remove' }).click();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="red"/></svg>';
  await page.getByLabel('Choose an image').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
  await expect(page.locator('[data-file="android-chrome-512x512.png"]')).toContainText('512 × 512');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByText('example-logo.png')).toBeVisible();
  await clean(g);
});

test('svg optimizer cleans markup and strips scripts', async ({ page }) => {
  const g = await open(page, '/svg-optimizer/');
  await expect(page.locator('h1')).toHaveText('SVG optimizer');
  const input =
    '<?xml version="1.0"?>\n<!-- hi -->\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 24 24">\n  <script>alert(1)</script>\n  <g inkscape:label="L1" onload="alert(2)">\n    <path d="M 1.23456,2.5 L 10.00001,20" fill="#000"/>\n  </g>\n  <g></g>\n  <a href="javascript:alert(3)"><rect width="4" height="4" x="0"/></a>\n</svg>';
  await page.getByLabel('SVG input', { exact: true }).fill(input);
  await expect
    .poll(() => editorText(page, 'Optimized SVG'))
    .toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M1.23 2.5L10 20"/></g><a><rect width="4" height="4"/></a></svg>');
  await expect(page.getByLabel('What changed')).toContainText('Stripped 1 script, 1 event handler attribute, 1 javascript: link');
  await expect(page.getByLabel('SVG status')).toContainText('smaller');
  await expect(page.getByRole('img', { name: /after/ })).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await page.getByLabel('SVG input', { exact: true }).fill('<svg><g></svg>');
  await expect(page.getByLabel('Status')).not.toContainText('smaller');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'Optimized SVG')).toContain('<title>Check badge</title>');
  await expect.poll(() => editorText(page, 'Optimized SVG')).not.toContain('inkscape');
  await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
  await clean(g);
});
