import { expect, test } from '@playwright/test';
import { PAGES } from '../src/site';

test('every page is prerendered with its own title, description, canonical and h1, and is in the sitemap', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const page of PAGES) {
    const html = await (await request.get(page.path)).text();
    const title = /<title>(.*?)<\/title>/.exec(html)?.[1];
    const description = /<meta name="description" content="(.*?)"/.exec(html)?.[1];
    expect(title, page.path).toBeTruthy();
    expect(titles.has(title!), `${page.path} title is unique`).toBe(false);
    expect(descriptions.has(description!), `${page.path} description is unique`).toBe(false);
    titles.add(title!);
    descriptions.add(description!);
    expect(html, page.path).toContain(`<link rel="canonical" href="https://toolspace.tech${page.path}"`);
    // The heading and how-to are in the static HTML, not only rendered by script
    expect(html, page.path).toMatch(/<h1[^>]*>[^<]+/);
    expect(html, page.path).not.toContain('TODO');
    expect(sitemap, page.path).toContain(`<loc>https://toolspace.tech${page.path}</loc>`);
  }
});

test('the home page links to every tool', async ({ page }) => {
  await page.goto('/');
  const tools = page.locator('#tools');
  for (const p of PAGES.filter((p) => !['home', 'about', 'contact'].includes(p.id) && !p.id.startsWith('guide-'))) {
    await expect(tools.locator(`a[href="${p.path}"]`), p.path).toHaveCount(1);
  }
});

test('works offline after one visit, and is installable', async ({ context, page }) => {
  await page.goto('/');
  const manifest = await (await page.request.get('/site.webmanifest')).json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  // Browsers under automation skip the automatic registration (public/sw-register.js), so register here
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.goto('/case-converter/');
  await page.getByLabel('Text to convert', { exact: true }).fill('hello offline world');
  await expect(page.getByLabel('Converted text', { exact: true })).toContainText('Hello Offline World');
  await page.goto('/json-formatter/');
  await page.getByLabel('JSON input', { exact: true }).fill('{"a":1}');
  await expect(page.getByLabel('Formatted JSON', { exact: true })).toContainText('"a": 1');
  await page.goto('/diff-checker/');
  await expect(page.getByLabel('Original text', { exact: true })).toBeVisible();
  // A page that doesn't exist gets the saved 404 page
  await page.goto('/no-such-page/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('This page doesn');
});

test('the diff checker keeps both texts across a reload, and Forget input clears them', async ({ page }) => {
  await page.goto('/diff-checker/');
  await page.getByLabel('Original text', { exact: true }).fill('alpha\nbeta');
  await page.getByLabel('Changed text', { exact: true }).fill('alpha\ngamma');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('toolspace-input:diff-checker'))).toContain('gamma');
  await page.reload();
  await expect(page.getByLabel('Original text', { exact: true })).toContainText('beta');
  await expect(page.getByLabel('Changed text', { exact: true })).toContainText('gamma');
  await page.getByRole('button', { name: 'Forget input' }).click();
  await expect(page.getByLabel('Changed text', { exact: true })).not.toContainText('gamma');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('toolspace-input:diff-checker'))).toBeNull();
});
