import { expect, test } from '@playwright/test';
import { editorText, fillEditors, trackErrors } from './helpers';

test.describe('search and sharing', () => {
  test('home page has a descriptive title, canonical URL and preview card', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('toolspace - free, open source developer tools');
    const meta = (sel: string) => page.locator(sel).first().getAttribute('content');
    expect(await meta('meta[name="description"]')).toContain('Free, open source developer tools');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/^https:\/\/.+\/$/);
    expect(await meta('meta[property="og:image"]')).toMatch(/^https:\/\/.+\/og\.png$/);
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
  });

  test('serves robots.txt, sitemap.xml and the preview image', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toMatch(/Allow: \/[\s\S]*Sitemap: https:\/\/.+\/sitemap\.xml/);

    const sitemap = await request.get('/sitemap.xml');
    const xml = await sitemap.text();
    expect(xml).toContain('<urlset');
    for (const path of ['/', '/diff-checker/', '/json-diff/', '/json-formatter/', '/json-validator/', '/json-to-csv/', '/json-to-yaml/', '/json-viewer/']) {
      expect(xml).toContain(`${path}</loc>`);
    }

    const og = await request.get('/og.png');
    expect(og.headers()['content-type']).toBe('image/png');
  });

  test('ships a 404 page that is not indexed', async ({ request }) => {
    const res = await request.get('/404.html');
    const html = await res.text();
    expect(html).toContain('This page doesn');
    expect(html).toContain('<meta name="robots" content="noindex" />');
  });

  test('header and footer link to GitHub, issues and the JSON page', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('navigation', { name: 'Footer' });
    await expect(footer.getByRole('link', { name: 'report a bug / request a feature' })).toHaveAttribute('href', /github\.com\/.+\/issues$/);
    await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: 'toolspace on GitHub' })).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByRole('banner').getByRole('link', { name: 'open source', exact: true })).toHaveAttribute('href', /github\.com\/Anshs-12\/diffdrop$/);
    await expect(page.getByRole('heading', { level: 1 }).getByRole('link', { name: 'Open source.' })).toHaveAttribute('href', /github\.com\/Anshs-12\/diffdrop$/);
    await expect(page.getByRole('navigation', { name: 'Tools' }).getByRole('link', { name: 'JSON diff' })).toHaveAttribute('href', '/json-diff/');
  });

  test('home page is a hub with a card for every tool', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every developer tool you need, in one place.');
    // Popular tools up top, and the sidebar lists every tool
    await expect(page.getByRole('heading', { name: 'Popular tools' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Tools' }).getByRole('link', { name: 'All tools' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 }).getByRole('link', { name: 'Open source.' })).toHaveAttribute('href', /github\.com\/Anshs-12\/diffdrop$/);
    const tools = page.locator('#tools');
    for (const path of ['/diff-checker/', '/json-diff/', '/json-formatter/', '/json-validator/', '/json-to-csv/', '/json-to-yaml/', '/json-viewer/']) {
      await expect(tools.locator(`a[href="${path}"]`)).toBeVisible();
    }
    await tools.getByRole('link', { name: /JSON viewer/ }).click();
    await expect(page).toHaveURL(/\/json-viewer\/$/);
    // The logo leads back home
    await page.getByRole('link', { name: 'toolspace home' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
  });

  test('home page content is in the static HTML', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('Every developer tool you need, in one place.');
    for (const name of ['Diff checker', 'JSON formatter', 'QR code generator', 'Markdown preview']) expect(html).toContain(name);
  });

  for (const [path, h1, how] of [
    ['/diff-checker/', 'Diff checker', 'How to compare two texts'],
    ['/json-diff/', 'JSON diff', 'How to compare two JSON files'],
  ] as const) {
    test(`${path} ships its heading, how-to, FAQ and FAQ data in the static HTML`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain(`>${h1}</h1>`);
      expect(html).toContain(how);
      const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]!);
      const faq = ld['@graph'].find((g: { '@type': string }) => g['@type'] === 'FAQPage');
      expect(faq.mainEntity.length).toBeGreaterThan(0);
      for (const q of faq.mainEntity) expect(html).toContain(q.name.replace(/'/g, '&#x27;'));
      expect(html).not.toMatch(/offline/i);
    });
  }

  test('links shared before the move still open in the diff checker', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/diff-checker/');
    await fillEditors(page, 'old line\n', 'new line\n');
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page).toHaveURL(/#.+/);
    const hash = new URL(page.url()).hash;
    const old = await context.newPage();
    await old.goto(`/${hash}`);
    await expect(old).toHaveURL(new RegExp(`/diff-checker/${hash.replace(/[.*+?^${}()|[\]\\$]/g, '\\$&')}$`));
    await expect.poll(() => editorText(old, 'Changed text')).toBe('new line\n');
    // Plain section links on the home page don't redirect
    await old.goto('/#why');
    await expect(old).toHaveURL(/\/#why$/);
  });
});

test.describe('/json-diff', () => {
  test('has its own title, canonical URL and heading', async ({ page }) => {
    await page.goto('/json-diff/');
    await expect(page).toHaveTitle(/^JSON diff - compare two JSON files online/);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/json-diff\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('JSON diff');
    await expect(page.getByRole('complementary', { name: 'Tools' }).getByRole('link', { name: 'JSON diff' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'How to compare two JSON files' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Tools' }).getByRole('link', { name: 'Diff checker' })).toHaveAttribute('href', '/diff-checker/');
  });

  test('flags invalid JSON with its line and column', async ({ page }) => {
    await page.goto('/json-diff/');
    await fillEditors(page, '{\n  "a": 1,\n}\n', '{"a": 2}\n');
    const status = page.getByLabel('JSON status');
    await expect(status).toContainText('a: Trailing comma before "}" at line 3, column 1');
    await expect(status).toContainText('b: valid JSON');
  });

  test('formatting and sorting keys leaves only real changes', async ({ page }) => {
    await page.goto('/json-diff/');
    await fillEditors(page, '{\n  "b": 1,\n  "a": [1, 2]\n}\n', '{"a":[1,2],"b":1}');
    await expect(page.getByText('a and b are identical')).toHaveCount(0);

    await page.getByRole('button', { name: /Format JSON/ }).click();
    await expect(page.getByText('a and b are identical')).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('a and b are identical')).toHaveCount(0);
  });

  test('loads a JSON example', async ({ page }) => {
    await page.goto('/json-diff/');
    await page.getByRole('button', { name: 'Load a JSON example' }).click();
    await expect(page.getByLabel('JSON status')).toContainText('b: valid JSON');
    await page.getByRole('button', { name: /Format JSON/ }).click();
    const summary = page.getByLabel('Change summary');
    await expect(summary).toBeVisible();
  });
});
