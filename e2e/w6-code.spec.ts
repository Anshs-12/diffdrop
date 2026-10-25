import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

const status = (page: Page) => page.getByLabel('Status', { exact: true });

/** Each language page: real input, its exact formatted output, and input that must be rejected. */
const LANGUAGE_PAGES = [
  {
    path: '/java-beautifier/',
    h1: 'Java beautifier',
    lang: 'java',
    input: 'record Point(int x,int y){}\nclass A{static String kind(Object o){return switch(o){case Integer i when i>10->"big";default->"other";};}}',
    output:
      'record Point(int x, int y) {}\nclass A {\n    static String kind(Object o) {\n        return switch (o) {\n            case Integer i when i > 10 -> "big";\n            default -> "other";\n        };\n    }\n}\n',
    bad: 'class Broken { void f() { if (x) { g(); }\n}',
    error: '{ is never closed',
  },
  {
    path: '/javascript-beautifier/',
    h1: 'JavaScript beautifier',
    lang: 'javascript',
    input: 'const total=items.filter(i=>i.inStock).reduce((sum,i)=>sum+i.price*i.qty,0);console.log(`Total: ${total}`)',
    output: 'const total = items\n  .filter((i) => i.inStock)\n  .reduce((sum, i) => sum + i.price * i.qty, 0);\nconsole.log(`Total: ${total}`);\n',
    bad: 'function broken( { return 1 }',
    error: 'JavaScript:',
  },
  {
    path: '/css-beautifier/',
    h1: 'CSS beautifier',
    lang: 'css',
    input: '.grid{display:grid;gap:var(--gap)}@media (min-width:768px){.grid{grid-template-columns:200px 1fr}}',
    output: '.grid {\n  display: grid;\n  gap: var(--gap);\n}\n@media (min-width: 768px) {\n  .grid {\n    grid-template-columns: 200px 1fr;\n  }\n}\n',
    bad: '.a{color:red',
    error: 'Unclosed block',
  },
  {
    path: '/html-beautifier/',
    h1: 'HTML beautifier',
    lang: 'html',
    input: '<nav><ul><li><a href="/">Home</a></li><li><a href="/blog">Blog</a></li></ul></nav>',
    output: '<nav>\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/blog">Blog</a></li>\n  </ul>\n</nav>\n',
    bad: '<div><span>text</div>',
    error: 'Unexpected closing tag',
  },
  {
    path: '/python-formatter/',
    h1: 'Python formatter',
    lang: 'python',
    input: 'from dataclasses import dataclass\n@dataclass\nclass User:\n  name:str\n  def greet(self)->str:return f"Hi {self.name}"\nmatch x:\n  case [a,*rest]:print(a)',
    output:
      'from dataclasses import dataclass\n\n\n@dataclass\nclass User:\n    name: str\n\n    def greet(self) -> str:\n        return f"Hi {self.name}"\n\n\nmatch x:\n    case [a, *rest]:\n        print(a)\n',
    bad: 'def f(x):\n  return x +\n',
    error: 'Python:',
  },
  {
    path: '/sql-formatter/',
    h1: 'SQL formatter',
    lang: 'sql',
    input: "select c.name,sum(o.total) as revenue from customers c join orders o on o.customer_id=c.id where o.status='paid' group by c.name",
    output: "SELECT\n  c.name,\n  sum(o.total) AS revenue\nFROM\n  customers c\n  JOIN orders o ON o.customer_id = c.id\nWHERE\n  o.status = 'paid'\nGROUP BY\n  c.name\n",
    bad: 'select a from (select b from t',
    error: 'ends too early',
  },
  {
    path: '/xml-formatter/',
    h1: 'XML formatter',
    lang: 'xml',
    input: '<?xml version="1.0"?><order id="7"><item sku="A1"/><note>Leave at the  door</note></order>',
    output: '<?xml version="1.0"?>\n<order id="7">\n  <item sku="A1"/>\n  <note>Leave at the  door</note>\n</order>\n',
    bad: '<a><b></a>',
    error: 'Closing tag </a> doesn’t match <b>',
  },
];

for (const p of LANGUAGE_PAGES) {
  test(`${p.path} formats ${p.lang}, rejects broken input and loads its example`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(p.path);
    const requests = trackOutgoing(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1);
    // The language list is there, set to this page's language
    await expect(page.getByLabel('Language')).toHaveValue(p.lang);
    await expect(page.getByRole('link', { name: 'Code beautifier' }).last()).toBeVisible();

    await page.getByLabel('Code to format').fill(p.input);
    await expect.poll(() => editorText(page, 'Formatted code'), { timeout: 20_000 }).toBe(p.output);
    await expect(status(page)).toContainText('Formatted as');

    await page.getByLabel('Code to format').fill(p.bad);
    await expect(status(page)).toContainText(p.error, { timeout: 20_000 });
    await expect(status(page)).toContainText('line');

    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(status(page)).toContainText('Formatted as', { timeout: 20_000 });
    expect((await editorText(page, 'Formatted code')).length).toBeGreaterThan(20);
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: /^Download formatted\./ })).toBeEnabled();

    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}

test('minify mode for CSS, HTML, XML and JSON keeps what matters', async ({ page }) => {
  const errors = trackErrors(page);
  const cases: [string, string | null, string, string][] = [
    ['/css-beautifier/', null, 'a {\n  width: calc(100% - 8px);\n}\n.b :hover { content: "a  b"; }', 'a{width:calc(100% - 8px)}.b :hover{content:"a  b"}'],
    ['/html-beautifier/', null, '<ul>\n  <li><a href="/">Home</a></li>\n  <li>Two</li>\n</ul>\n<!-- note -->\n<pre>  x\n y</pre>', '<ul> <li><a href="/">Home</a></li> <li>Two</li> </ul> <pre>  x\n y</pre>'],
    ['/xml-formatter/', null, '<r>\n  <a k="1">  t  </a>\n  <!-- c -->\n  <p>mixed <b>x</b> y</p>\n  <s xml:space="preserve"> <i/> </s>\n</r>', '<r><a k="1">  t  </a><p>mixed <b>x</b> y</p><s xml:space="preserve"> <i/> </s></r>'],
    ['/code-beautifier/', 'json', '{\n  "price": 1.50,\n  "tags": ["a", "b"]\n}', '{"price":1.50,"tags":["a","b"]}'],
  ];
  for (const [path, lang, input, expected] of cases) {
    await page.goto(path);
    if (lang) await page.getByLabel('Language').selectOption(lang);
    await page.getByLabel('Code to format').fill(input);
    await page.getByRole('radio', { name: 'Minify' }).click();
    await expect.poll(() => editorText(page, 'Formatted code'), { message: path, timeout: 20_000 }).toBe(expected);
    await expect(status(page)).toContainText('Minified as');
    await expect(status(page)).toContainText('→');
    await expect(page.getByRole('button', { name: /^Download minified\./ })).toBeEnabled();
  }
  // No Minify where it isn't safe
  for (const path of ['/javascript-beautifier/', '/python-formatter/', '/java-beautifier/', '/sql-formatter/']) {
    await page.goto(path);
    await expect(page.getByRole('radio', { name: 'Format', exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Minify' })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('XML errors carry the line and jump to it', async ({ page }) => {
  await page.goto('/xml-formatter/');
  await page.getByLabel('Code to format').fill('<config>\n  <item key="a" key="b"/>\n</config>');
  await expect(status(page)).toContainText('Attribute key appears twice in <item> (line 2, column 17)');
  await page.getByLabel('Code to format').fill('<root>\n  <a>\n    <b>\n  </a>\n</root>');
  await expect(status(page)).toContainText('Closing tag </a> doesn’t match <b> from line 3 (line 4');
  await page.getByRole('button', { name: 'Go to line 4' }).click();
  // A malformed document is never shown as formatted
  expect(await editorText(page, 'Formatted code')).toBe('');
  await page.getByLabel('Code to format').fill('<p>Tom & Jerry</p>');
  await expect(status(page)).toContainText('A bare & must be written &amp;');
});

test('SQL dialect and keyword case', async ({ page }) => {
  await page.goto('/sql-formatter/');
  const input = "insert into p (sku) values ('A1') on conflict (sku) do update set price=excluded.price returning id";
  await page.getByLabel('Code to format').fill(input);
  await page.getByLabel('SQL dialect').selectOption('postgresql');
  await page.getByRole('radio', { name: 'lower' }).click();
  await expect
    .poll(() => editorText(page, 'Formatted code'))
    .toBe("insert into\n  p (sku)\nvalues\n  ('A1')\non conflict (sku) do update\nset\n  price = excluded.price\nreturning\n  id\n");
  // Standard SQL can't read PostgreSQL casts, and says which setting to change
  await page.getByLabel('SQL dialect').selectOption('sql');
  await page.getByLabel('Code to format').fill('select a::int from t');
  await expect(status(page)).toContainText('choose its dialect');
});

test('the formatter keeps input and options after a reload', async ({ page }) => {
  await page.goto('/sql-formatter/');
  await page.getByLabel('Code to format').fill('select 1');
  await page.getByRole('radio', { name: 'lower' }).click();
  await expect.poll(() => editorText(page, 'Formatted code')).toBe('select\n  1\n');
  await page.waitForTimeout(600);
  await page.reload();
  await expect.poll(() => editorText(page, 'Code to format')).toBe('select 1');
  await expect(page.getByRole('radio', { name: 'lower' })).toHaveAttribute('data-state', 'on');
});

test('markdown editor downloads the Markdown and a standalone HTML page', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/markdown-preview/');
  const requests = trackOutgoing(page);
  await page.getByLabel('Markdown', { exact: true }).fill('# Trip notes\n\n- [x] Book train\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n<script>alert(1)</script>');
  await expect(page.getByLabel('Rendered Markdown').getByRole('heading', { level: 1 })).toHaveText('Trip notes');

  const [html] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download HTML page' }).click()]);
  expect(html.suggestedFilename()).toBe('document.html');
  const doc = fs.readFileSync((await html.path())!, 'utf8');
  expect(doc).toMatch(/^<!doctype html>/);
  expect(doc).toContain('<title>Trip notes</title>');
  expect(doc).toContain('<h1>Trip notes</h1>');
  expect(doc).toContain('<table>');
  expect(doc).not.toContain('<script>');

  const [md] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download document.md' }).click()]);
  expect(md.suggestedFilename()).toBe('document.md');
  expect(fs.readFileSync((await md.path())!, 'utf8')).toContain('# Trip notes');
  await expect(page.getByRole('button', { name: 'Copy Markdown' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy HTML' })).toBeEnabled();
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

test('word counter checks a character limit and copies the stats', async ({ page }) => {
  await page.goto('/word-counter/');
  await page.getByLabel('Text to count').fill('x'.repeat(290));
  await page.getByRole('button', { name: '280 (X post)' }).click();
  await expect(page.locator('[data-limit-status]')).toHaveText('10 over the limit');
  await page.getByLabel('Custom character limit').fill('300');
  await expect(page.locator('[data-limit-status]')).toHaveText('10 left');
  await expect(page.getByRole('button', { name: 'Copy stats' })).toBeEnabled();
});

for (const width of [1440, 390]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the color picker is visible next to the color input', async ({ page }) => {
      await page.goto('/color-converter/');
      await expect(page.getByText('Pick a color', { exact: true })).toBeVisible();
      const picker = page.getByLabel('Pick a color');
      await expect(picker).toBeVisible();
      const [a, b] = [await picker.boundingBox(), await page.getByLabel('Color', { exact: true }).boundingBox()];
      // Beside the input on desktop, right above it on a phone
      expect(Math.abs(a!.y - b!.y) < 60 || Math.abs(a!.x - b!.x) < 40).toBe(true);
      await picker.fill('#ff7f50');
      await expect(page.locator('[data-format="RGB"]')).toHaveText('rgb(255 127 80)');
      await expect(page.getByRole('link', { name: 'Color palette generator' }).last()).toBeVisible();
    });

    test('formatter pages fit the screen', async ({ page }) => {
      for (const p of LANGUAGE_PAGES) {
        await page.goto(p.path);
        await page.getByRole('button', { name: 'Load example' }).click();
        await expect(status(page)).toContainText('Formatted as', { timeout: 20_000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), p.path).toBeLessThanOrEqual(0);
      }
    });
  });
}
