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
