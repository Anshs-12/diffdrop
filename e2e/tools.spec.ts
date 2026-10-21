import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

/** Text of a CodeMirror editor by its aria-label (all lines are rendered for small documents). */
async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

const TOOLS = [
  { path: '/json-formatter/', h1: 'JSON formatter', title: /^JSON formatter/ },
  { path: '/json-validator/', h1: 'JSON validator', title: /^JSON validator/ },
  { path: '/json-to-csv/', h1: 'JSON to CSV converter', title: /^JSON to CSV/ },
  { path: '/json-to-yaml/', h1: 'JSON to YAML converter', title: /^JSON to YAML/ },
  { path: '/json-viewer/', h1: 'JSON viewer', title: /^JSON viewer/ },
];

for (const tool of TOOLS) {
  test(`${tool.path} has its own title, canonical URL and content`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(tool.path);
    await expect(page).toHaveTitle(tool.title);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(new RegExp(`${tool.path}$`));
    expect(await page.locator('meta[name="google-site-verification"]').count()).toBe(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tool.h1);
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    // Links to every other page
    const tools = page.getByRole('navigation', { name: 'Tools' });
    await expect(tools.getByRole('link')).toHaveCount(23); // every other tool and guide
    expect(errors).toEqual([]);
  });

  test(`${tool.path} serves its content and FAQ data in the static HTML`, async ({ request }) => {
    const html = await (await request.get(tool.path)).text();
    expect(html).toContain(`>${tool.h1}</h1>`);
    expect(html).toContain('How it works');
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]!);
    const types = ld['@graph'].map((g: { '@type': string }) => g['@type']);
    expect(types).toEqual(['SoftwareApplication', 'FAQPage', 'BreadcrumbList']);
    // Each FAQ answer is on the page itself
    for (const q of ld['@graph'][1].mainEntity) expect(html).toContain(q.name.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'));
  });
}

test('formatter keeps numbers exactly and warns about duplicate keys', async ({ page }) => {
  await page.goto('/json-formatter/');
  await page.getByLabel('JSON input', { exact: true }).fill('{"id":12345678901234567890,"price":1.10,"id":2}');
  await expect.poll(() => editorText(page, 'Formatted JSON')).toBe('{\n  "id": 2,\n  "price": 1.10\n}\n');
  await expect(page.getByLabel('JSON status')).toContainText('Duplicate key "id" at line 1, column 41');
  await page.getByLabel('JSON input', { exact: true }).fill('[12345678901234567890, 1.0, 1e5]');
  await page.getByRole('radio', { name: 'Minify' }).click();
  await expect.poll(() => editorText(page, 'Formatted JSON')).toBe('[12345678901234567890,1.0,1e5]');
});

test('formatter beautifies, minifies and sorts keys', async ({ page }) => {
  await page.goto('/json-formatter/');
  await page.getByLabel('JSON input', { exact: true }).fill('{"b":1,"a":{"d":[1,2],"c":null}}');
  await expect.poll(() => editorText(page, 'Formatted JSON')).toBe('{\n  "b": 1,\n  "a": {\n    "d": [\n      1,\n      2\n    ],\n    "c": null\n  }\n}\n');
  await page.getByRole('radio', { name: 'Minify' }).click();
  await page.getByLabel('Sort keys').click();
  await expect.poll(() => editorText(page, 'Formatted JSON')).toBe('{"a":{"c":null,"d":[1,2]},"b":1}');
});

test('validator explains errors and jumps to them', async ({ page }) => {
  await page.goto('/json-validator/');
  await page.getByRole('button', { name: 'Example with an error' }).click();
  const status = page.getByLabel('JSON status');
  await expect(status).toContainText('Trailing comma before "]" at line 27, column 23');
  await expect(page.locator('.cm-error-line')).toHaveCount(1);
  await page.getByRole('button', { name: 'Go to error' }).click();
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(status).toContainText('Valid JSON');
  await expect(status).toContainText('6 objects, 4 arrays, 27 keys, depth 3');
  await page.getByLabel('JSON input', { exact: true }).fill('{"a":tru}');
  await expect(status).toContainText('Invalid value "tru" (did you mean true?) at line 1, column 6');
});

test('JSON to CSV flattens objects and switches delimiter', async ({ page }) => {
  await page.goto('/json-to-csv/');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.getByLabel('JSON status')).toContainText('3 rows, 9 columns');
  await expect
    .poll(async () => (await editorText(page, 'CSV output')).split('\n')[0])
    .toBe('id,name,email,active,address.city,address.country,roles,lastLogin,note');
  await page.getByRole('radio', { name: 'Semicolon' }).click();
  await expect.poll(async () => (await editorText(page, 'CSV output')).split('\n')[1]).toBe(
    '1;Ada Lovelace;ada@example.com;true;London;UK;"[""admin"",""editor""]";2026-10-14T09:12:00Z;',
  );
});

test('JSON to CSV downloads with a BOM, escapes formulas and unwraps API responses', async ({ page }) => {
  await page.goto('/json-to-csv/');
  await page.getByLabel('JSON input', { exact: true }).fill('{"total":2,"data":[{"name":"=1+1","city":"Zürich"},{"name":"Bo"}]}');
  await expect(page.getByLabel('JSON status')).toContainText('2 rows, 2 columns, from the "data" array');
  // Escaped by default; switching it off keeps the raw text
  await expect.poll(() => editorText(page, 'CSV output')).toBe("name,city\n'=1+1,Zürich\nBo,\n");
  await page.getByLabel('Escape formulas').click();
  await expect.poll(() => editorText(page, 'CSV output')).toBe('name,city\n=1+1,Zürich\nBo,\n');
  await page.getByLabel('Escape formulas').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download data.csv' }).click()]);
  const bytes = await import('node:fs').then((fs) => download.path().then((p) => fs.readFileSync(p)));
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  expect(bytes.subarray(3).toString('utf8')).toBe("name,city\n'=1+1,Zürich\nBo,\n");
});

test('JSON to CSV keeps 64-bit numbers exact in the input and the output', async ({ page }) => {
  await page.goto('/json-to-csv/');
  const input = '[{"id":9007199254740993,"big":-9223372036854775807}]';
  await page.getByLabel('JSON input', { exact: true }).fill(input);
  await expect.poll(() => editorText(page, 'CSV output')).toBe('id,big\n9007199254740993,-9223372036854775807\n');
  expect(await editorText(page, 'JSON input')).toBe(input);
});

test('JSON to YAML writes valid, readable YAML', async ({ page }) => {
  await page.goto('/json-to-yaml/');
  await page.getByLabel('JSON input', { exact: true }).fill('{"name":"toolspace","version":"1.5.0","enabled":"yes","tags":["a","b"]}');
  await expect.poll(() => editorText(page, 'YAML output')).toBe('name: toolspace\nversion: "1.5.0"\nenabled: "yes"\ntags:\n- a\n- b\n');
});

test('viewer expands, searches and copies paths', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', "Playwright can't grant clipboard access in WebKit");
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/json-viewer/');
  await page.getByRole('button', { name: 'Load example' }).click();
  const tree = page.getByRole('tree', { name: 'JSON tree' });
  await expect(tree.getByRole('treeitem')).toHaveCount(4); // root + 3 users
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(tree.getByText('"Grace Hopper"')).toBeVisible();
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await page.getByLabel('Search keys and values').fill('manchester');
  await expect(page.getByText('1 match', { exact: true })).toBeVisible();
  const hit = tree.locator('.tree-row.is-hit');
  await expect(hit).toContainText('"Manchester"');
  // Searching filters the tree to matches and the path to them
  await expect(tree.getByRole('treeitem')).toHaveCount(4); // $, [2], address, city
  await hit.locator('.tree-label').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('$[2].address.city');
});

test('viewer does not offer to expand empty objects and arrays', async ({ page }) => {
  await page.goto('/json-viewer/');
  await page.getByLabel('JSON input', { exact: true }).fill('{"a":{},"b":[],"c":[1]}');
  const tree = page.getByRole('tree', { name: 'JSON tree' });
  await expect(tree.getByRole('treeitem')).toHaveCount(4);
  await expect(tree.getByRole('button', { name: 'Expand' })).toHaveCount(1);
});

test('sidebar links to every tool on desktop, the menu on mobile', async ({ page }) => {
  await page.goto('/json-to-yaml/');
  const sidebar = page.getByRole('complementary', { name: 'Tools' });
  await expect(sidebar.getByRole('link', { name: 'JSON to YAML' })).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('link', { name: 'JSON viewer' }).click();
  await expect(page).toHaveURL(/\/json-viewer\/$/);
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(sidebar).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('menuitem')).toHaveCount(28); // 24 tools and guides, home, why free, contact, GitHub
  await page.getByRole('menuitem', { name: /Diff checker/ }).click();
  await expect(page).toHaveURL(/\/diff-checker\/$/);
});

test('tool pages make no network requests while working', async ({ page }) => {
  await page.goto('/json-to-csv/', { waitUntil: 'networkidle' });
  const requests = trackOutgoing(page);
  await page.getByRole('button', { name: 'Load example' }).click();
  await page.getByRole('radio', { name: 'Tab' }).click();
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
});
