import { expect, test } from '@playwright/test';

/**
 * Time from pasting two texts until the diff is on screen (counts shown and rows
 * painted), plus how long one scroll frame takes afterwards. Only the visible
 * rows are rendered, so these should stay flat as files grow.
 *
 * Measured on an M-series laptop: 5k ≈ 0.4 s, 20k ≈ 0.3 s, 100k ≈ 0.4 s,
 * 500k ≈ 1.1–2.4 s (about 0.27 s of each is the deliberate typing debounce).
 * Before virtualization: 100k took 37.8 s and 500k never finished.
 * Limits are roughly 2.5× the measurements, to absorb slower machines.
 */
const CASES = [
  { lines: 5_000, budgetMs: 1_500 },
  { lines: 20_000, budgetMs: 1_500 },
  { lines: 100_000, budgetMs: 2_000 },
  { lines: 500_000, budgetMs: 6_000 },
];

test.describe.configure({ mode: 'serial' });

for (const { lines, budgetMs } of CASES) {
  test(`shows a ${lines.toLocaleString()}-line diff within ${budgetMs.toLocaleString()} ms`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/diff-checker/');
    const edits = Math.ceil(lines / 40);

    const ms = await page.evaluate(async (n) => {
      const a = Array.from({ length: n }, (_, i) => `line ${i} value = ${i * 3};`).join('\n');
      const b = a
        .split('\n')
        .map((l, i) => (i % 40 === 0 ? `${l} // edited` : l))
        .join('\n');
      const paste = (label: string, text: string) => {
        const el = document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
        el.focus();
        const data = new DataTransfer();
        data.setData('text/plain', text);
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      };
      const t0 = performance.now();
      paste('Original text', a);
      paste('Changed text', b);
      const expected = `+${Math.ceil(n / 40).toLocaleString()}`;
      await new Promise<void>((done) => {
        const check = () => {
          const summary = document.querySelector('[aria-label="Change summary"]')?.textContent ?? '';
          const rows = document.querySelectorAll('.diff-table tbody tr[data-row]').length;
          if (summary.includes(expected) && rows > 10) done();
          else requestAnimationFrame(check);
        };
        check();
      });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return performance.now() - t0;
    }, lines);

    // Only the visible rows exist in the page
    const rendered = await page.locator('.diff-table tbody tr[data-row]').count();
    expect(rendered).toBeLessThan(200);

    // One scroll jump to the middle should paint within a couple of frames
    const scrollMs = await page.evaluate(async () => {
      const el = document.querySelector('.diff-scroll')!;
      const t0 = performance.now();
      el.scrollTop = el.scrollHeight / 2;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return performance.now() - t0;
    });

    console.log(
      `${lines.toLocaleString()} lines (${edits.toLocaleString()} edits): on screen in ${Math.round(ms)} ms, ` +
        `scroll frame ${Math.round(scrollMs)} ms, ${rendered} rows in the DOM`,
    );
    test.info().annotations.push({ type: 'render-ms', description: `${Math.round(ms)}` });
    expect(ms).toBeLessThan(budgetMs);
    expect(scrollMs).toBeLessThan(100);
  });
}

test('typing in a 100,000-line document stays fast', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/diff-checker/');
  const keystrokeMs = await page.evaluate(async () => {
    const text = Array.from({ length: 100_000 }, (_, i) => `line ${i} value = ${i * 3};`).join('\n');
    const el = document.querySelector<HTMLElement>('[aria-label="Original text"]')!;
    el.focus();
    const data = new DataTransfer();
    data.setData('text/plain', text);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 1000));
    // Cursor sits at the end of the pasted text; time a few keystrokes there
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      document.execCommand('insertText', false, 'x');
      await frame();
      times.push(performance.now() - t0);
    }
    return Math.max(...times);
  });
  console.log(`slowest keystroke in a 100k-line document: ${Math.round(keystrokeMs)} ms`);
  expect(keystrokeMs).toBeLessThan(100);
});
