import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

const PAGES = [
  { path: '/case-converter/', h1: 'Case converter' },
  { path: '/title-case-converter/', h1: 'Title case converter' },
  { path: '/word-counter/', h1: 'Word counter' },
  { path: '/password-generator/', h1: 'Password generator' },
  { path: '/lorem-ipsum-generator/', h1: 'Lorem ipsum generator' },
  { path: '/qr-code-generator/', h1: 'QR code generator' },
  { path: '/color-converter/', h1: 'Color converter' },
  { path: '/css-gradient-generator/', h1: 'CSS gradient generator' },
  { path: '/code-beautifier/', h1: 'Code beautifier' },
  { path: '/markdown-preview/', h1: 'Markdown preview' },
];

for (const p of PAGES) {
  test(`${p.path} loads with heading, FAQ and FAQ data, without errors or requests`, async ({ page, request }) => {
    const errors = trackErrors(page);
    await page.goto(p.path, { waitUntil: 'networkidle' });
    const requests = trackOutgoing(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1);
    await expect(page.getByRole('heading', { name: 'Questions' })).toBeVisible();
    const example = page.getByRole('button', { name: 'Load example' });
    if (await example.count()) await example.click();
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
    const html = await (await request.get(p.path)).text();
    expect(html).toContain(`>${p.h1}</h1>`);
    expect(html).toMatch(/"@type":"FAQPage"/);
  });
}

test('case converter switches between cases', async ({ page }) => {
  await page.goto('/case-converter/');
  await page.getByLabel('Text to convert').fill('parseHTTPRequest now');
  await page.getByRole('radio', { name: 'snake_case' }).click();
  await expect.poll(() => editorText(page, 'Converted text')).toBe('parse_http_request_now');
  await page.getByRole('radio', { name: 'UPPER CASE' }).click();
  await expect.poll(() => editorText(page, 'Converted text')).toBe('PARSEHTTPREQUEST NOW');
});

test('title case follows the chosen style guide', async ({ page }) => {
  await page.goto('/title-case-converter/');
  await page.getByLabel('Titles', { exact: true }).fill('the war between them');
  await expect.poll(() => editorText(page, 'Title case')).toBe('The War between Them');
  await page.getByRole('radio', { name: 'AP', exact: true }).click();
  await expect.poll(() => editorText(page, 'Title case')).toBe('The War Between Them');
});

test('word counter counts as you type', async ({ page }) => {
  await page.goto('/word-counter/');
  await page.getByLabel('Text to count').fill('One two three. Four five!\n\nSix.');
  const counts = page.getByLabel('Counts');
  await expect(counts.locator('[data-stat="Words"]')).toHaveText('6');
  await expect(counts.locator('[data-stat="Sentences"]')).toHaveText('3');
  await expect(counts.locator('[data-stat="Paragraphs"]')).toHaveText('2');
});

test('password generator respects length and character sets', async ({ page }) => {
  await page.goto('/password-generator/');
  const out = page.getByLabel('Generated password');
  await expect(out).toHaveText(/^.{20}$/);
  await page.getByRole('button', { name: '32', exact: true }).click();
  await expect(out).toHaveText(/^.{32}$/);
  for (const label of ['Uppercase (A–Z)', 'Lowercase (a–z)', 'Symbols (!@#…)']) await page.getByLabel(label).click();
  await expect(out).toHaveText(/^\d{32}$/);
  const before = await out.textContent();
  await page.getByRole('button', { name: 'Generate a new password' }).click();
  await expect(out).not.toHaveText(before!);
});

test('lorem ipsum generates the requested amount', async ({ page }) => {
  await page.goto('/lorem-ipsum-generator/');
  await expect.poll(() => editorText(page, 'Lorem ipsum text')).toMatch(/^Lorem ipsum dolor sit amet/);
  await page.getByRole('radio', { name: 'Words' }).click();
  await page.getByLabel('How many').fill('5');
  await expect.poll(() => editorText(page, 'Lorem ipsum text')).toBe('Lorem ipsum dolor sit amet');
  await page.getByLabel('HTML').click();
  await expect.poll(() => editorText(page, 'Lorem ipsum text')).toBe('<p>Lorem ipsum dolor sit amet</p>');
});

test('QR generator makes Wi-Fi codes and downloads SVG and PNG', async ({ page }) => {
  await page.goto('/qr-code-generator/');
  await expect(page.getByAltText('QR code')).toBeVisible();
  await page.getByRole('radio', { name: 'Wi-Fi' }).click();
  await page.getByLabel('Network name (SSID)').fill('Home');
  await page.getByLabel('Password').fill('secret123');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('modules');
  const [svg] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'SVG' }).click()]);
  expect(svg.suggestedFilename()).toBe('qr-code.svg');
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG' }).click()]);
  expect(png.suggestedFilename()).toBe('qr-code.png');
});

test('color converter converts and checks contrast', async ({ page }) => {
  await page.goto('/color-converter/');
  await page.getByLabel('Color', { exact: true }).fill('coral');
  const formats = page.getByLabel('Formats');
  await expect(formats.locator('[data-format="HEX"]')).toHaveText('#ff7f50');
  await expect(formats.locator('[data-format="RGB"]')).toHaveText('rgb(255 127 80)');
  await expect(page.getByText(/:1 (AA|AAA|AA large|Fail)/).first()).toBeVisible();
  await page.getByLabel('Color', { exact: true }).fill('nope');
  await expect(page.getByLabel('Status', { exact: true })).toContainText("That isn't a color");
});

test('gradient generator writes CSS for each type', async ({ page }) => {
  await page.goto('/css-gradient-generator/');
  const css = page.getByLabel('Gradient CSS');
  await expect(css).toContainText('linear-gradient(135deg');
  await page.getByRole('radio', { name: 'Radial' }).click();
  await expect(css).toContainText('radial-gradient(circle');
  await page.getByRole('button', { name: 'Add stop' }).click();
  await expect(page.getByLabel('Stop 4 color')).toBeVisible();
});

test('code beautifier formats many languages with Prettier, under the site security policy', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/code-beautifier/');
  const status = page.getByLabel('Status', { exact: true });
  await page.getByLabel('Code to format').fill('a{color:red;margin:0}');
  await expect(status).toContainText('Formatted as CSS (detected)');
  await expect.poll(() => editorText(page, 'Formatted code')).toBe('a {\n  color: red;\n  margin: 0;\n}\n');
  await page.getByLabel('Minify').click();
  await expect.poll(() => editorText(page, 'Formatted code')).toBe('a{color:red;margin:0}');
  await page.getByLabel('Code to format').fill('const x:number=1');
  await expect(status).toContainText('Formatted as TypeScript (detected)');
  await expect.poll(() => editorText(page, 'Formatted code')).toBe('const x: number = 1;\n');
  await page.getByLabel('Code to format').fill('select a from t where b=1');
  await expect.poll(() => editorText(page, 'Formatted code')).toBe('SELECT\n  a\nFROM\n  t\nWHERE\n  b = 1\n');
  await page.getByLabel('Language').selectOption('javascript');
  await page.getByLabel('Code to format').fill('function (');
  await expect(status).toContainText('JavaScript:');
  await expect(page.getByRole('button', { name: /Go to line 1/ })).toBeVisible();
  expect(errors.filter((e) => /Content Security Policy|unsafe-eval/i.test(e))).toEqual([]);
});


test('markdown preview renders and sanitizes', async ({ page }) => {
  await page.goto('/markdown-preview/');
  await page.getByLabel('Markdown', { exact: true }).fill('# Hi\n\n<img src=x onerror="window.pwned=1">\n\n<script>window.pwned=2</script>\n\n[x](javascript:alert(1))');
  const preview = page.getByLabel('Rendered Markdown');
  await expect(preview.getByRole('heading', { level: 1 })).toHaveText('Hi');
  expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined();
  expect(await preview.innerHTML()).not.toMatch(/onerror|<script|javascript:/);
});

test('code beautifier formats real programming languages with their own formatters', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/code-beautifier/');
  const cases: [string, string, string][] = [
    ['python', 'def f( a,b ):\n  return {"x":a+b}', 'def f(a, b):\n    return {"x": a + b}\n'],
    ['java', 'class A{void f(){int x=1;if(x>0){g();}}}', 'class A {\n    void f() {\n        int x = 1;\n        if (x > 0) {\n            g();\n        }\n    }\n}\n'],
    ['cpp', 'int main(){std::vector<int> v{1,2};for(auto x:v){std::cout<<x;}return 0;}', 'int main() {\n    std::vector<int> v{1, 2};\n    for (auto x : v) {\n        std::cout << x;\n    }\n    return 0;\n}\n'],
    ['c', 'int main(void){int a=1;return a;}', 'int main(void) {\n    int a = 1;\n    return a;\n}\n'],
    ['csharp', 'class P{static void Main(){int x=1;if(x>0){F();}}}', 'class P\n{\n    static void Main()\n    {\n        int x = 1;\n        if (x > 0)\n        {\n            F();\n        }\n    }\n}\n'],
    ['go', 'package main\nfunc main(){x:=1\nif x>0{println(x)}}', 'package main\n\nfunc main() {\n\tx := 1\n\tif x > 0 {\n\t\tprintln(x)\n\t}\n}\n'],
    ['php', '<?php function f($a,$b){return $a+$b;}', '<?php\n\nfunction f($a, $b)\n{\n    return $a + $b;\n}\n'],
    ['lua', 'local function f(a,b) return a+b end', 'local function f(a, b)\n  return a + b\nend\n'],
    ['shell', 'if [ -f x ];then\necho hi;fi', 'if [ -f x ]; then\n  echo hi\nfi\n'],
  ];
  for (const [lang, input, expected] of cases) {
    await page.getByLabel('Language').selectOption(lang);
    await page.getByLabel('Code to format').fill(input);
    await expect.poll(() => editorText(page, 'Formatted code'), { message: lang, timeout: 15_000 }).toBe(expected);
  }
  // A syntax error is reported, not thrown
  await page.getByLabel('Language').selectOption('python');
  await page.getByLabel('Code to format').fill('def f(:\n  pass');
  await expect(page.getByLabel('Status', { exact: true })).toContainText('Python:');
  expect(errors).toEqual([]);
});

test('code beautifier: every language has its own example and honours 2 vs 4 spaces', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/code-beautifier/');
  const status = page.getByLabel('Status', { exact: true });
  const langs = await page.getByLabel('Language').evaluate((s) => [...(s as HTMLSelectElement).options].map((o) => o.value).filter((v) => v !== 'auto'));
  expect(langs.length).toBe(18);
  for (const lang of langs) {
    await page.getByLabel('Language').selectOption(lang);
    await page.getByRole('button', { name: 'Load example' }).click();
    await page.getByRole('radio', { name: '2 spaces' }).click();
    await expect(status, lang).toContainText('Formatted as', { timeout: 15_000 });
    await expect.poll(async () => (await editorText(page, 'Formatted code')).split('\n').some((l) => /^  \S/.test(l)), { message: `${lang} 2 spaces`, timeout: 15_000 }).toBe(true);
    await page.getByRole('radio', { name: '4 spaces' }).click();
    await expect.poll(async () => (await editorText(page, 'Formatted code')).split('\n').some((l) => /^    \S/.test(l)), { message: `${lang} 4 spaces`, timeout: 15_000 }).toBe(true);
  }
});

test('code beautifier: switching language swaps the example', async ({ page }) => {
  await page.goto('/code-beautifier/');
  await page.getByLabel('Language').selectOption('python');
  await expect.poll(() => editorText(page, 'Code to format')).toContain('def area(');
  await page.getByLabel('Language').selectOption('go');
  await expect.poll(() => editorText(page, 'Code to format')).toContain('package main');
  // Your own code is never replaced
  await page.getByLabel('Code to format').fill('print("mine")');
  await page.getByLabel('Language').selectOption('java');
  await expect.poll(() => editorText(page, 'Code to format')).toBe('print("mine")');
});
