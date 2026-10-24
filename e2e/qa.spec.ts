import { expect, test } from '@playwright/test';

test('segmented controls show which option is selected', async ({ page }) => {
  await page.goto('/diff-checker/');
  const separate = page.getByRole('radio', { name: 'Show changes in a separate panel' });
  const inEditor = page.getByRole('radio', { name: 'Highlight changes in the editors' });
  await expect(separate).toHaveAttribute('data-state', 'on');
  await expect(inEditor).toHaveAttribute('data-state', 'off');
  await inEditor.click();
  await expect(inEditor).toHaveAttribute('data-state', 'on');
  // Selected and unselected look different
  const bg = (l: typeof inEditor) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg(inEditor)).not.toBe(await bg(separate));

  await page.goto('/regex-tester/');
  // Flags are a multi-select group: buttons with aria-pressed
  await expect(page.getByRole('button', { name: 'global (g)' })).toHaveAttribute('data-state', 'on');
  await expect(page.getByRole('button', { name: 'ignore case (i)' })).toHaveAttribute('data-state', 'off');
});

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tool editors wrap instead of scrolling sideways', async ({ page }) => {
    for (const [path, label] of [
      ['/json-formatter/', 'JSON input'],
      ['/base64-encode-decode/', 'Text to encode'],
      ['/code-beautifier/', 'Code to format'],
    ] as const) {
      await page.goto(path);
      const editor = page.getByLabel(label, { exact: true });
      // The placeholder isn't clipped
      const ph = page.locator('.cm-placeholder').first();
      expect(await ph.evaluate((el) => el.scrollWidth <= el.parentElement!.clientWidth + 1), path).toBe(true);
      await editor.fill('{"a_long_key_without_any_spaces_at_all":"' + 'x'.repeat(200) + '"}');
      const scroller = page.locator('.cm-scroller').first();
      expect(await scroller.evaluate((el) => el.scrollWidth - el.clientWidth), path).toBeLessThanOrEqual(1);
    }
  });

  test('diff toolbar buttons keep their labels', async ({ page }) => {
    await page.goto('/diff-checker/');
    for (const name of ['In editor', 'Separate', 'Split', 'Unified', 'Swap', 'Share', 'Summary']) {
      await expect(page.locator('.toolbar').getByText(name, { exact: true })).toBeVisible();
    }
  });
});

test('guides and tools carry a breadcrumb in their structured data', async ({ request }) => {
  for (const [path, name] of [
    ['/guides/compare-json-files/', 'Comparing JSON files'],
    ['/json-viewer/', 'JSON viewer'],
  ]) {
    const html = await (await request.get(path)).text();
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]!);
    const crumb = ld['@graph'].find((g: { '@type': string }) => g['@type'] === 'BreadcrumbList');
    expect(crumb.itemListElement.map((i: { name: string }) => i.name)).toEqual(['toolspace', name]);
    expect(crumb.itemListElement[1].item).toMatch(new RegExp(`${path}$`));
  }
});

test('the shortest tool pages have a worked example and common mistakes', async ({ request }) => {
  for (const path of ['/markdown-preview/', '/css-gradient-generator/', '/json-viewer/', '/lorem-ipsum-generator/', '/json-to-yaml/', '/title-case-converter/']) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain('Worked example');
    expect(html, path).toContain('Common mistakes');
  }
});

test('real icon files and the manifest are linked, served and allowed by the security policy', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  for (const [sel, path, type] of [
    ['link[rel="icon"][href="/favicon.ico"]', '/favicon.ico', 'image/'],
    ['link[rel="icon"][href="/icon.svg"]', '/icon.svg', 'image/svg+xml'],
    ['link[rel="apple-touch-icon"]', '/apple-touch-icon.png', 'image/png'],
    ['link[rel="manifest"]', '/site.webmanifest', ''],
  ] as const) {
    await expect(page.locator(sel)).toHaveCount(1);
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    if (type) expect(res.headers()['content-type'], path).toContain(type);
  }
  const manifest = await (await request.get('/site.webmanifest')).json();
  expect(manifest.name).toBe('toolspace');
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  expect(errors.filter((e) => /Content Security Policy|manifest/i.test(e))).toEqual([]);
});

test('home page shows the "featured on" badges, linking out in a new tab', async ({ page }) => {
  await page.goto('/');
  // Same size for every badge, logos served from this site
  const sizes = await page.getByRole('list', { name: 'Featured on' }).getByRole('link').evaluateAll((els) => els.map((e) => `${e.getBoundingClientRect().width}x${e.getBoundingClientRect().height}`));
  expect(new Set(sizes).size).toBe(1);
  for (const src of await page.getByRole('list', { name: 'Featured on' }).locator('img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))) {
    expect(new URL(src).pathname).toMatch(/^\/badges\/[a-z]+\.png$/);
  }
  // The home page never states how many tools there are
  expect(await page.locator('main').innerText()).not.toMatch(/\b\d+\s+tools\b/i);
  const badges = page.getByRole('list', { name: 'Featured on' });
  const link = badges.getByRole('link', { name: 'Featured on CodeHype' });
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.codehype\.ai\/product\/toolspace/);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(badges.getByRole('link', { name: 'Featured on FindAlternate' })).toHaveAttribute('href', 'https://www.findalternate.com/toolspace');
  await expect(badges.getByRole('link', { name: 'Featured on DevHunt' })).toHaveAttribute('href', 'https://devhunt.org/tool/toolspace');
  await expect(badges.getByRole('link', { name: 'Featured on ScrollLaunch' })).toHaveAttribute('href', /^https:\/\/www\.scrolllaunch\.com\/products\/toolspace/);
});
