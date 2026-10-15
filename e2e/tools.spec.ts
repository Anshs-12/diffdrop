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
    await expect(tools.getByRole('link')).toHaveCount(6);
    expect(errors).toEqual([]);
  });
}

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
  await page.getByRole('button', { name: 'Load example' }).click();
  const status = page.getByLabel('JSON status');
  await expect(status).toContainText('Trailing comma before "]" at line 27, column 23');
  await expect(page.locator('.cm-error-line')).toHaveCount(1);
  await page.getByRole('button', { name: 'Go to error' }).click();
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(status).toContainText('Valid JSON');
  await expect(status).toContainText('6 objects, 4 arrays, 27 keys, depth 4');
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

test('JSON to YAML writes valid, readable YAML', async ({ page }) => {
  await page.goto('/json-to-yaml/');
  await page.getByLabel('JSON input', { exact: true }).fill('{"name":"diffdrop","version":"1.5.0","enabled":"yes","tags":["a","b"]}');
  await expect.poll(() => editorText(page, 'YAML output')).toBe('name: diffdrop\nversion: "1.5.0"\nenabled: "yes"\ntags:\n- a\n- b\n');
});

test('viewer expands, searches and copies paths', async ({ page, context }) => {
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
  await hit.locator('.tree-label').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('$[2].address.city');
});

test('tool pages make no network requests while working', async ({ page }) => {
  await page.goto('/json-to-csv/', { waitUntil: 'networkidle' });
  const requests = trackOutgoing(page);
  await page.getByRole('button', { name: 'Load example' }).click();
  await page.getByRole('radio', { name: 'Tab' }).click();
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
});
