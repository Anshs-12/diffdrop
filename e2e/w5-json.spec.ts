import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

/** Text of a CodeMirror editor by its aria-label (all lines are rendered for small documents). */
async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

/** Opens a page with outgoing-request and error tracking, and checks its h1. */
async function open(page: Page, path: string, h1: string) {
  const errors = trackErrors(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
  const all = trackOutgoing(page);
  // Same-origin GETs are the page's own code (the dev server serves it from /src, not /assets);
  // what matters is that nothing goes to another origin and nothing is posted
  const origin = new URL(page.url()).origin;
  const requests = {
    get list() {
      return all.filter((r) => !(r.startsWith('GET ') && new URL(r.slice(4)).origin === origin));
    },
  };
  return { errors, requests };
}

test.describe('JSON viewer', () => {
  test('switches the output between tree, table and text, and copies the full JSON', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', "Playwright can't grant clipboard access in WebKit");
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { errors, requests } = await open(page, '/json-viewer/', 'JSON viewer');
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.getByRole('tree', { name: 'JSON tree' }).getByRole('treeitem')).toHaveCount(4);

    const output = page.getByRole('radiogroup', { name: 'Output view' });
    await output.getByRole('radio', { name: 'Table' }).click();
    const table = page.getByRole('table', { name: 'JSON table' });
    await expect(table.getByRole('columnheader')).toHaveText(['#', 'id', 'name', 'email', 'active', 'address', 'roles', 'lastLogin', 'note']);
    await expect(table.getByRole('row')).toHaveCount(4); // header + 3 users
    const ada = table.getByRole('row').nth(1);
    await expect(ada.getByRole('cell').nth(4)).toHaveText('{"city":"London","country":"UK"}');
    await expect(ada.getByRole('cell').nth(5)).toHaveText('["admin","editor"]');
    // Grace has no note: the cell is empty
    await expect(table.getByRole('row').nth(2).getByRole('cell').nth(7)).toHaveText('');
    // A cell copies its path
    await ada.getByRole('button', { name: 'London' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('$[0].address');

    await output.getByRole('radio', { name: 'Text' }).click();
    await expect.poll(async () => (await editorText(page, 'Pretty-printed JSON')).split('\n').slice(0, 3)).toEqual(['[', '  {', '    "id": 1,']);

    await page.getByRole('button', { name: 'Copy full JSON' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(JSON.parse(copied)[2].name).toBe('Alan Turing');
    expect(copied.startsWith('[\n  {\n    "id": 1,')).toBe(true);
    await expect(page.getByRole('button', { name: 'Download data.json' })).toBeEnabled();
    expect(requests.list).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the input side shows a tree or table of what was typed', async ({ page }) => {
    const { errors } = await open(page, '/json-viewer/', 'JSON viewer');
    await page.getByLabel('JSON input', { exact: true }).fill('{"名前":"Zoë 😀","list":[1,2]}');
    const input = page.getByRole('radiogroup', { name: 'Input view' });
    await input.getByRole('radio', { name: 'Tree' }).click();
    const tree = page.getByRole('tree', { name: 'Input tree' });
    await expect(tree.getByRole('treeitem')).toHaveCount(3);
    await expect(tree).toContainText('"名前": "Zoë 😀"');
    await input.getByRole('radio', { name: 'Table' }).click();
    const table = page.getByRole('table', { name: 'Input table' });
    await expect(table.getByRole('rowheader')).toHaveText(['名前', 'list']);
    await expect(table.getByRole('cell')).toHaveText(['Zoë 😀', '[1,2]']);
    // Back to text: the input is still there
    await input.getByRole('radio', { name: 'Text' }).click();
    await expect.poll(() => editorText(page, 'JSON input')).toBe('{"名前":"Zoë 😀","list":[1,2]}');
    expect(errors).toEqual([]);
  });

  test('empty and invalid input, and a large array in the table', async ({ page }) => {
    const { errors } = await open(page, '/json-viewer/', 'JSON viewer');
    await page.getByRole('radiogroup', { name: 'Output view' }).getByRole('radio', { name: 'Table' }).click();
    await expect(page.getByText('The table appears here once the JSON is valid.')).toBeVisible();
    await page.getByLabel('JSON input', { exact: true }).fill('{"a": tru}');
    await expect(page.getByLabel('JSON status')).toContainText('Invalid value "tru"');
    await expect(page.getByRole('button', { name: 'Copy full JSON' })).toBeDisabled();
    await page.getByRole('radiogroup', { name: 'Input view' }).getByRole('radio', { name: 'Tree' }).click();
    await expect(page.getByText('The JSON has an error, so it can’t be shown this way.')).toBeVisible();
    await page.getByRole('button', { name: 'Edit as text' }).click();
    const big = JSON.stringify(Array.from({ length: 20_000 }, (_, i) => ({ id: i, name: `user ${i}` })));
    await page.getByLabel('JSON input', { exact: true }).fill(big);
    await expect(page.getByText('Showing the first 1,000 of 20,000 rows.')).toBeVisible();
    await expect(page.getByRole('table', { name: 'JSON table' }).getByRole('row')).toHaveCount(1001);
    expect(errors).toEqual([]);
  });
});

test.describe('JSON to YAML page', () => {
  test('converts YAML to JSON, with the example and copy', async ({ page }) => {
    const { errors, requests } = await open(page, '/json-to-yaml/', 'JSON to YAML converter');
    await page.getByRole('radio', { name: 'YAML → JSON' }).click();
    await expect(page.getByLabel('YAML status')).toContainText('Paste YAML');
    await page.getByLabel('YAML input', { exact: true }).fill('name: web\nenabled: yes\nid: 12345678901234567890\nports: [80, 443]\nu: "Zoë 😀"\n');
    await expect.poll(() => editorText(page, 'JSON output')).toBe(
      '{\n  "name": "web",\n  "enabled": "yes",\n  "id": 12345678901234567890,\n  "ports": [\n    80,\n    443\n  ],\n  "u": "Zoë 😀"\n}\n',
    );
    await expect(page.getByLabel('YAML status')).toContainText('Valid YAML');
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect.poll(async () => (await editorText(page, 'JSON output')).includes('"host": "staging.example.com"')).toBe(true);
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Download data.json' })).toBeEnabled();
    expect(requests.list).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('shows YAML errors with line and column, and keeps the JSON direction as it was', async ({ page }) => {
    const { errors } = await open(page, '/json-to-yaml/', 'JSON to YAML converter');
    await page.getByRole('radio', { name: 'YAML → JSON' }).click();
    await page.getByLabel('YAML input', { exact: true }).fill('a: 1\na: 2\n');
    await expect(page.getByLabel('YAML status')).toContainText('Map keys must be unique at line 2, column 1');
    await expect(page.locator('.cm-error-line')).toHaveCount(1);
    await page.getByRole('button', { name: 'Go to error' }).click();
    await page.getByRole('radio', { name: 'JSON → YAML' }).click();
    await page.getByLabel('JSON input', { exact: true }).fill('{"enabled":"yes","version":"1.10"}');
    await expect.poll(() => editorText(page, 'YAML output')).toBe('enabled: "yes"\nversion: "1.10"\n');
    // The YAML input was kept while away
    await page.getByRole('radio', { name: 'YAML → JSON' }).click();
    await expect.poll(() => editorText(page, 'YAML input')).toBe('a: 1\na: 2\n');
    expect(errors).toEqual([]);
  });
});

test.describe('JSON to CSV page', () => {
  test('converts CSV to JSON with quotes, types and nesting', async ({ page }) => {
    const { errors, requests } = await open(page, '/json-to-csv/', 'JSON to CSV converter');
    await page.getByRole('radio', { name: 'CSV → JSON' }).click();
    await expect(page.getByLabel('CSV status')).toContainText('Paste CSV');
    await page.getByLabel('CSV input', { exact: true }).fill('id;name;address.city;n\n007;"Zoë; ""Z""";Zürich;42\n');
    await expect(page.getByLabel('CSV status')).toContainText('1 row, 4 columns');
    await expect(page.getByLabel('CSV status')).toContainText('semicolon-separated (detected)');
    await expect.poll(() => editorText(page, 'JSON output')).toBe(
      '[\n  {\n    "id": "007",\n    "name": "Zoë; \\"Z\\"",\n    "address.city": "Zürich",\n    "n": "42"\n  }\n]\n',
    );
    await page.getByLabel('Detect numbers and true/false').click();
    await page.getByLabel('Nest dotted keys').click();
    await expect.poll(() => editorText(page, 'JSON output')).toBe(
      '[\n  {\n    "id": "007",\n    "name": "Zoë; \\"Z\\"",\n    "address": {\n      "city": "Zürich"\n    },\n    "n": 42\n  }\n]\n',
    );
    await page.getByLabel('Header row').click();
    await expect.poll(async () => (await editorText(page, 'JSON output')).split('\n').slice(0, 3)).toEqual(['[', '  [', '    "id",']);
    expect(requests.list).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('loads the CSV example, reports an unclosed quote, and keeps JSON → CSV as it was', async ({ page }) => {
    const { errors } = await open(page, '/json-to-csv/', 'JSON to CSV converter');
    await page.getByRole('radio', { name: 'CSV → JSON' }).click();
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.getByLabel('CSV status')).toContainText('3 rows, 9 columns');
    await expect.poll(async () => (await editorText(page, 'JSON output')).includes('"name": "Grace Hopper"')).toBe(true);
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled();
    await page.getByLabel('CSV input', { exact: true }).fill('a,b\n1,"open\n');
    await expect(page.getByLabel('CSV status')).toContainText('This quoted field is never closed (a " is missing) at line 2, column 3');
    await expect(page.getByRole('button', { name: 'Go to error' })).toBeVisible();
    await page.getByRole('radio', { name: 'JSON → CSV' }).click();
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.getByLabel('JSON status')).toContainText('3 rows, 9 columns');
    await expect.poll(async () => (await editorText(page, 'CSV output')).split('\n')[0]).toBe('id,name,email,active,address.city,address.country,roles,lastLogin,note');
    expect(errors).toEqual([]);
  });
});

test.describe('options are saved, and travel in share links', () => {
  test('formatter indentation survives a reload', async ({ page }) => {
    const { errors } = await open(page, '/json-formatter/', 'JSON formatter');
    await page.getByLabel('JSON input', { exact: true }).fill('{"b":1,"a":2}');
    await page.getByRole('radio', { name: '4 spaces' }).click();
    await page.getByLabel('Sort keys').click();
    await expect.poll(() => editorText(page, 'Formatted JSON')).toBe('{\n    "a": 2,\n    "b": 1\n}\n');
    await page.waitForTimeout(600); // saving is debounced
    await page.reload();
    await expect.poll(() => editorText(page, 'Formatted JSON')).toBe('{\n    "a": 2,\n    "b": 1\n}\n');
    await expect(page.getByRole('radio', { name: '4 spaces' })).toHaveAttribute('data-state', 'on');
    expect(errors).toEqual([]);
  });

  test('a share link carries the CSV direction and options', async ({ page, context }) => {
    await open(page, '/json-to-csv/', 'JSON to CSV converter');
    await page.getByRole('radio', { name: 'CSV → JSON' }).click();
    await page.getByLabel('CSV input', { exact: true }).fill('a,b\n1,true\n');
    await page.getByLabel('Detect numbers and true/false').click();
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: 'Share' }).click();
    const url = await page.getByLabel('Link with your input').inputValue();
    expect(url).toContain('#s=');
    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect.poll(() => editorText(fresh, 'JSON output')).toBe('[\n  {\n    "a": 1,\n    "b": true\n  }\n]\n');
  });

  test('the validator copies formatted and minified JSON', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', "Playwright can't grant clipboard access in WebKit");
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { errors } = await open(page, '/json-validator/', 'JSON validator');
    await expect(page.getByRole('button', { name: 'Copy minified JSON' })).toBeDisabled();
    await page.getByLabel('JSON input', { exact: true }).fill('{ "a": [1, 2], "b": "ü" }');
    await page.getByRole('button', { name: 'Copy minified JSON' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('{"a":[1,2],"b":"ü"}');
    await page.getByRole('button', { name: 'Copy formatted JSON' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('{\n  "a": [\n    1,\n    2\n  ],\n  "b": "ü"\n}\n');
    expect(errors).toEqual([]);
  });
});

test('dropping a file onto the input opens it', async ({ page }) => {
  const { errors } = await open(page, '/json-to-csv/', 'JSON to CSV converter');
  await page.getByRole('radio', { name: 'CSV → JSON' }).click();
  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(['x,y\n1,2\n'], 'data.csv', { type: 'text/csv' }));
    return d;
  });
  const target = page.getByLabel('CSV input', { exact: true });
  await target.dispatchEvent('dragover', { dataTransfer: dt });
  await target.dispatchEvent('drop', { dataTransfer: dt });
  await expect.poll(() => editorText(page, 'JSON output')).toBe('[\n  {\n    "x": "1",\n    "y": "2"\n  }\n]\n');
  expect(errors).toEqual([]);
});

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ['/json-viewer/', '/json-to-yaml/', '/json-to-csv/', '/json-formatter/', '/json-validator/']) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('button', { name: 'Load example' }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
  }
});
