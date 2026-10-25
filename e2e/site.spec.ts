import { expect, test } from '@playwright/test';

test('Cmd/Ctrl+K opens a palette that searches by name and keyword and jumps to the tool', async ({ page }) => {
  await page.goto('/json-formatter/');
  await page.locator('header[data-ready]').waitFor();
  await page.keyboard.press('ControlOrMeta+k');
  const input = page.getByRole('combobox', { name: 'Search tools' });
  await expect(input).toBeFocused();
  await input.fill('hex to rgb');
  await expect(page.getByRole('option').first()).toContainText('Color converter');
  await input.fill('epoch');
  await expect(page.getByRole('option').first()).toContainText('Timestamp converter');
  await input.fill('jwt');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/jwt-decoder\/$/);
});

test('the palette works on mobile from the header search button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Search tools' }).click();
  await page.getByRole('combobox', { name: 'Search tools' }).fill('qr');
  await page.getByRole('option', { name: /QR code generator/ }).click();
  await expect(page).toHaveURL(/\/qr-code-generator\/$/);
});

test('home page filters tools by category and by text', async ({ page }) => {
  await page.goto('/');
  const grid = page.getByRole('tabpanel');
  await page.getByRole('tab', { name: 'Design' }).click();
  await expect(grid.getByRole('link')).toHaveCount(6); // converter, gradient, palette, contrast, aspect ratio, px to rem
  await expect(grid).toContainText('Color converter');
  await page.getByRole('tab', { name: 'All' }).click();
  const filter = page.getByRole('searchbox', { name: 'Filter tools' });
  await filter.fill('password');
  await expect(grid.getByRole('link')).toHaveCount(1);
  await expect(grid).toContainText('Password generator');
  await filter.fill('zzzz');
  await expect(page.locator('#tools')).toContainText('No tool matches');
});

test('contact page shows the email as a mailto link and copyable text, with no form', async ({ page, request }) => {
  await page.goto('/contact/');
  await expect(page.getByRole('link', { name: 'Send an email' })).toHaveAttribute('href', 'mailto:anshxcookies@gmail.com');
  await expect(page.getByLabel('Email address')).toHaveText('anshxcookies@gmail.com');
  expect(await page.locator('form').count()).toBe(0);
  await expect(page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact/');
  const html = await (await request.get('/contact/')).text();
  expect(html).toMatch(/"@type":"ContactPage"/);
});

test('about page explains toolspace in collapsible sections', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About toolspace');
  const free = page.locator('details', { hasText: 'How can it be free?' });
  await expect(free).not.toHaveAttribute('open');
  await free.locator('summary').click();
  await expect(free).toHaveAttribute('open');
  await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
});

test('the sidebar keeps its scroll position from page to page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/json-formatter/');
  await page.locator('header[data-ready]').waitFor();
  const sidebar = page.getByRole('complementary', { name: 'Tools' });
  await sidebar.evaluate((el) => (el.scrollTop = el.scrollHeight));
  const before = await sidebar.evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(100);
  // A link near the bottom, in view without scrolling
  await sidebar.getByRole('link', { name: 'XML formatter' }).click();
  await expect(page).toHaveURL(/\/xml-formatter\/$/);
  await page.locator('header[data-ready]').waitFor();
  const after = await page.getByRole('complementary', { name: 'Tools' }).evaluate((el) => el.scrollTop);
  expect(Math.abs(after - before)).toBeLessThan(40);
  await expect(page.getByRole('complementary', { name: 'Tools' }).getByRole('link', { name: 'XML formatter' })).toBeInViewport();
});


test('mobile menu lists every category and the site pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/base64-encode-decode/');
  await page.getByRole('button', { name: 'Menu' }).click();
  for (const label of ['compare', 'json', 'encode', 'text', 'generate', 'design', 'code']) await expect(page.getByRole('menu').getByText(label, { exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Contact' }).click();
  await expect(page).toHaveURL(/\/contact\/$/);
});
