import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

/** Open a page with nothing saved, check its h1, and start watching for requests and errors. */
async function open(page: Page, path: string, h1: string) {
  const errors = trackErrors(page);
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toHaveText(h1);
  // From here on, using the tool must not make any request
  const outgoing = trackOutgoing(page);
  return { outgoing, errors };
}

function clean({ outgoing, errors }: { outgoing: string[]; errors: string[] }) {
  expect(outgoing).toEqual([]);
  expect(errors).toEqual([]);
}

test('JSON to TypeScript: interfaces, Zod, optional keys and the starter-schema note', async ({ page }) => {
  const t = await open(page, '/json-to-typescript/', 'JSON to TypeScript');
  await expect(page.getByLabel('Note')).toContainText('Inferred starter schema: review before use.');
  await page.getByLabel('JSON input', { exact: true }).fill('{"users":[{"id":1,"email":null},{"id":2,"email":"a@example.com","first-name":"Ada"}],"tags":[]}');
  await expect.poll(() => editorText(page, 'TypeScript output')).toBe(
    'export interface Root {\n  users: User[];\n  tags: unknown[];\n}\n\nexport interface User {\n  id: number;\n  email: string | null;\n  "first-name"?: string;\n}\n',
  );
  await page.getByRole('radio', { name: 'Zod' }).click();
  await expect.poll(() => editorText(page, 'TypeScript output')).toContain('  email: z.string().nullable(),');
  await expect.poll(() => editorText(page, 'TypeScript output')).toContain('  tags: z.array(z.unknown()),');
  await page.getByLabel('JSON input', { exact: true }).fill('{"a":');
  await expect(page.getByLabel('JSON status')).toContainText('line 1');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'TypeScript output')).toContain('addressSchema');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Download schema.ts' })).toBeEnabled();
  clean(t);
});

test('YAML validator: errors with line, duplicate keys, multi-document JSON', async ({ page }) => {
  const t = await open(page, '/yaml-validator/', 'YAML validator');
  const input = page.getByLabel('YAML input', { exact: true });
  await input.fill('a: 1\nb: [1, 2\n');
  await expect(page.getByLabel('YAML status')).toContainText('line');
  await expect(page.getByRole('button', { name: /Go to line/ })).toBeVisible();
  await input.fill('a: 1\nb: 2\na: 3\n');
  await expect(page.getByLabel('YAML status')).toContainText('Valid YAML 1.2');
  await expect(page.getByLabel('YAML status')).toContainText('line 3, column 1');
  await input.fill('x: 1\n---\ny: two\n');
  await expect(page.getByLabel('YAML status')).toContainText('2 documents');
  await expect.poll(() => editorText(page, 'Parsed JSON')).toBe('[\n  {\n    "x": 1\n  },\n  {\n    "y": "two"\n  }\n]\n');
  await input.fill('country: NO\n');
  await page.getByRole('radio', { name: 'YAML 1.1' }).click();
  await expect.poll(() => editorText(page, 'Parsed JSON')).toBe('{\n  "country": false\n}\n');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'Parsed JSON')).toContain('"service": "worker"');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeEnabled();
  clean(t);
});

test('Line cleaner: dedupe ignoring case, sort, counts, CRLF', async ({ page }) => {
  const t = await open(page, '/line-cleaner/', 'Line cleaner');
  await page.getByLabel('Lines to clean', { exact: true }).fill('pear\r\nApple\r\n  banana\r\napple\r\n\r\nPear');
  await page.getByText('Ignore case', { exact: true }).click();
  await page.getByLabel('Sort').selectOption('az');
  await expect.poll(() => editorText(page, 'Cleaned lines')).toBe('Apple\nbanana\npear');
  const counts = page.getByLabel('Line counts');
  await expect(counts).toContainText('before: 6 lines, 4 unique');
  await expect(counts).toContainText('after: 3 lines');
  await expect(counts).toContainText('2 duplicates removed');
  await expect(counts).toContainText('1 blank line removed');
  await page.getByLabel('Sort').selectOption('numeric');
  await page.getByLabel('Lines to clean', { exact: true }).fill('b 10\nnone\na 2\nc -1');
  await expect.poll(() => editorText(page, 'Cleaned lines')).toBe('c -1\na 2\nb 10\nnone');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'Cleaned lines')).toContain('item 10');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeEnabled();
  clean(t);
});

test('List to SQL IN: escaping, numbers, warning, split back', async ({ page }) => {
  const t = await open(page, '/list-to-sql-in/', 'List to SQL IN');
  await expect(page.getByRole('note')).toContainText('Don’t paste untrusted input into production SQL.');
  const input = page.getByLabel('List input', { exact: true });
  await input.fill("O'Brien\nZoë\nO'Brien\n\n");
  await expect.poll(() => editorText(page, 'List output')).toBe("IN ('O''Brien', 'Zoë')");
  await input.fill('3\n1\n2');
  await page.getByRole('button', { name: 'Use no quotes' }).click();
  await expect.poll(() => editorText(page, 'List output')).toBe('IN (3, 1, 2)');
  await page.getByRole('radio', { name: 'Split line' }).click();
  await input.fill("IN ('O''Brien', 'a, b', 'c')");
  await expect.poll(() => editorText(page, 'List output')).toBe("O'Brien\na, b\nc");
  await page.getByRole('radio', { name: 'Join lines' }).click();
  await input.fill('a\nb');
  await expect.poll(() => editorText(page, 'List output')).toBe('a, b');
  await page.getByRole('radio', { name: 'SQL IN' }).click();
  await page.getByRole('radio', { name: "'single'" }).click();
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect.poll(() => editorText(page, 'List output')).toContain("'O''Brien'");
  await expect(page.getByRole('button', { name: 'Copy' })).toBeEnabled();
  clean(t);
});

test('Mock data generator: fields, seed, formats', async ({ page }) => {
  const t = await open(page, '/mock-data-generator/', 'Mock data generator');
  await page.getByLabel('Rows').fill('3');
  await page.getByLabel('Seed').fill('demo');
  const read = async () => JSON.parse(await editorText(page, 'Generated data'));
  await expect.poll(async () => (await read()).length).toBe(3);
  const first = await read();
  expect(Object.keys(first[0])).toEqual(['id', 'name', 'email', 'city', 'active', 'createdAt']);
  expect(first[0].email).toMatch(/@example\.(com|org|net)$/);
  // Same seed, same data (after the input is saved, which waits for a short pause)
  await page.waitForTimeout(800);
  clean(t);
  await page.reload({ waitUntil: 'networkidle' });
  const t2 = { outgoing: trackOutgoing(page), errors: t.errors };
  await expect.poll(read).toEqual(first);
  // Rename, remove and reorder fields
  await page.getByLabel('Key name 2').fill('fullName');
  await page.getByRole('button', { name: 'Remove city' }).click();
  await page.getByRole('button', { name: 'Move active up' }).click();
  await expect.poll(async () => Object.keys((await read())[0])).toEqual(['id', 'fullName', 'active', 'email', 'createdAt']);
  await page.getByRole('button', { name: 'Add field' }).click();
  await page.getByLabel('Type 6').selectOption('ip');
  await expect.poll(async () => (await read())[0].field).toMatch(/^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$/);
  await page.getByRole('radio', { name: 'CSV' }).click();
  await expect.poll(() => editorText(page, 'Generated data')).toMatch(/^id,fullName,active,email,createdAt,field\n1,/);
  await page.getByRole('button', { name: 'Load example' }).click();
  // Minified, so the whole output is one line (the editor only draws lines in view)
  await page.getByRole('radio', { name: 'Minified' }).click();
  await expect.poll(async () => (await read()).length).toBe(5);
  await expect.poll(async () => Object.keys((await read())[0])).toContain('signedUp');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeEnabled();
  clean(t2);
});
