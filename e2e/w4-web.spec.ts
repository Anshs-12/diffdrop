import { expect, test, type Page } from '@playwright/test';
import { trackErrors, trackOutgoing } from './helpers';

/** Text of a CodeMirror editor by its aria-label (all lines are rendered for small documents). */
async function editorText(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).evaluate((el) =>
    [...el.querySelectorAll('.cm-line')].map((l) => (l.querySelector('.cm-placeholder') ? '' : l.textContent)).join('\n'),
  );
}

/** trackOutgoing already ignores the site's own static files. */
const outside = (out: string[]) => out;

test.describe('meta tag generator', () => {
  test('builds escaped tags, previews without loading the image', async ({ page }) => {
    const out = trackOutgoing(page);
    const errors = trackErrors(page);
    await page.goto('/meta-tag-generator/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meta tag generator');
    await page.getByLabel('Title', { exact: true }).fill('Tom & Jerry "live"');
    await page.getByLabel('Description', { exact: true }).fill('A <b>short</b> description');
    await page.getByLabel('Image URL').fill('https://cdn.example.org/card.png');
    await page.getByRole('switch', { name: 'Let search engines index it' }).click();
    await expect.poll(() => editorText(page, 'Meta tags')).toContain('<title>Tom &amp; Jerry &quot;live&quot;</title>');
    const tags = await editorText(page, 'Meta tags');
    expect(tags).toContain('<meta name="description" content="A &lt;b&gt;short&lt;/b&gt; description">');
    expect(tags).toContain('<meta name="robots" content="noindex, follow">');
    expect(tags).toContain('<meta property="og:image" content="https://cdn.example.org/card.png">');
    await expect(page.getByLabel('Social card preview')).toContainText('https://cdn.example.org/card.png');
    await expect(page.getByLabel('Social card preview').locator('img')).toHaveCount(0);
    await expect(page.getByLabel('Search result preview')).toContainText('Tom & Jerry "live"');

    await page.getByRole('button', { name: 'Load example' }).click();
    await expect.poll(() => editorText(page, 'Meta tags')).toContain('<meta property="og:type" content="article">');
    await expect(page.getByRole('button', { name: 'Copy' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download meta-tags.html' })).toBeVisible();
    expect(outside(out)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe('robots.txt generator', () => {
  test('builds a file and tests paths against it', async ({ page }) => {
    const out = trackOutgoing(page);
    const errors = trackErrors(page);
    await page.goto('/robots-txt-generator/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Robots.txt generator');
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect.poll(() => editorText(page, 'robots.txt output')).toBe(
      'User-agent: *\nDisallow: /cart/\nDisallow: /account/\nAllow: /account/help/\n\nSitemap: https://example.com/sitemap.xml\n',
    );
    await expect(page.getByLabel('Test result')).toContainText('Allowed');
    await page.getByLabel('URL or path to test').fill('https://example.com/account/settings');
    await expect(page.getByLabel('Test result')).toContainText('Blocked');
    await expect(page.getByLabel('Test result')).toContainText('Disallow: /account/ (line 3');

    await page.getByRole('button', { name: 'Block AI crawlers' }).click();
    await expect.poll(() => editorText(page, 'robots.txt output')).toContain('User-agent: GPTBot');
    await page.getByLabel('Crawler user-agent').fill('GPTBot');
    await page.getByLabel('URL or path to test').fill('/blog');
    await expect(page.getByLabel('Test result')).toContainText('Blocked');
    await page.getByLabel('Crawler user-agent').fill('Bingbot');
    await expect(page.getByLabel('Test result')).toContainText('Allowed');

    await page.getByRole('radio', { name: 'a pasted file' }).click();
    await page.getByLabel('Pasted robots.txt', { exact: true }).fill('User-agent: *\nDisallow: /*.pdf$\nAllow: /');
    await page.getByLabel('URL or path to test').fill('/files/report.pdf');
    await expect(page.getByLabel('Test result')).toContainText('Blocked');
    await page.getByLabel('URL or path to test').fill('/files/report.pdf?dl=1');
    await expect(page.getByLabel('Test result')).toContainText('Allowed');
    await page.getByRole('button', { name: 'Edit in builder' }).click();
    await expect.poll(() => editorText(page, 'robots.txt output')).toBe('User-agent: *\nDisallow: /*.pdf$\nAllow: /\n');

    await expect(page.getByRole('button', { name: 'Download robots.txt' })).toBeVisible();
    expect(outside(out)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe('HTTP status codes', () => {
  test('searches, filters and links to a code', async ({ page }) => {
    const out = trackOutgoing(page);
    const errors = trackErrors(page);
    await page.goto('/http-status-codes/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('HTTP status codes');
    await page.getByLabel('Search status codes').fill('429');
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.locator('article[id="429"]')).toContainText('Too Many Requests');
    await page.getByLabel('Search status codes').fill('teapot');
    await expect(page.locator('article[id="418"]')).toContainText('April Fools');
    await page.getByLabel('Search status codes').fill('');
    await page.getByRole('radio', { name: /^5xx/ }).click();
    expect(await page.locator('article').evaluateAll((els) => els.every((e) => e.id.startsWith('5')))).toBe(true);
    await expect(page.getByLabel('Unofficial codes')).toContainText('Cloudflare');
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.locator('article[id="308"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy 308 Permanent Redirect' })).toBeVisible();

    await page.goto('/http-status-codes/#404');
    await expect(page.locator('article[id="404"]')).toBeInViewport();
    expect(outside(out)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe('subnet calculator', () => {
  test('calculates a subnet and splits it', async ({ page }) => {
    const out = trackOutgoing(page);
    const errors = trackErrors(page);
    await page.goto('/subnet-calculator/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Subnet calculator');
    const field = (name: string) => page.locator(`[data-field="${name}"]`);
    await page.getByLabel('IPv4 address or CIDR').fill('10.1.5.9/22');
    await expect(field('Network')).toHaveText('10.1.4.0');
    await expect(field('Broadcast')).toHaveText('10.1.7.255');
    await expect(field('Usable hosts')).toHaveText('1,022');
    await expect(field('Range')).toContainText('Private (RFC 1918)');

    await page.getByLabel('IPv4 address or CIDR').fill('192.168.1.10');
    await page.getByLabel('Subnet mask (optional)').fill('255.255.255.252');
    await expect(field('Network')).toHaveText('192.168.1.8');
    await expect(field('Usable hosts')).toHaveText('2');
    await page.getByLabel('Subnet mask (optional)').fill('255.0.255.0');
    await expect(page.getByLabel('Status')).toContainText('isn’t a valid subnet mask');
    await page.getByLabel('Subnet mask (optional)').fill('');
    await page.getByLabel('IPv4 address or CIDR').fill('256.1.1.1/24');
    await expect(page.getByLabel('Status')).toContainText('256 is out of range');
    await page.getByLabel('IPv4 address or CIDR').fill('10.0.0.1/31');
    await expect(field('Usable hosts')).toHaveText('2');

    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(field('Network')).toHaveText('172.20.32.0');
    await expect(page.getByLabel('Subnets').locator('tbody tr')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Copy network' })).toBeVisible();
    expect(outside(out)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe('chmod calculator', () => {
  test('keeps the grid, octal and symbolic in sync', async ({ page }) => {
    const out = trackOutgoing(page);
    const errors = trackErrors(page);
    await page.goto('/chmod-calculator/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chmod calculator');
    await page.getByLabel('Octal mode').fill('4755');
    await expect(page.getByLabel('Symbolic mode')).toHaveValue('rwsr-xr-x');
    await expect(page.getByLabel('Setuid')).toBeChecked();
    await page.getByLabel('Symbolic mode').fill('rw-r-----');
    await expect(page.getByLabel('Octal mode')).toHaveValue('640');
    await page.getByLabel('Others (o) read').check();
    await expect(page.getByLabel('Octal mode')).toHaveValue('644');
    await expect(page.getByLabel('Symbolic mode')).toHaveValue('rw-r--r--');
    await page.getByLabel('Octal mode').fill('789');
    await expect(page.getByLabel('Status')).toContainText('8 and 9');
    await page.getByRole('button', { name: /^777/ }).click();
    await expect(page.getByLabel('Status')).toContainText('777 lets every user');

    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.locator('[data-command="Octal"]')).toHaveText('chmod 755 deploy.sh');
    await expect(page.locator('[data-command="Symbolic"]')).toHaveText('chmod u=rwx,g=rx,o=rx deploy.sh');
    await expect(page.getByRole('button', { name: 'Copy Octal command' })).toBeVisible();
    expect(outside(out)).toEqual([]);
    expect(errors).toEqual([]);
  });
});
