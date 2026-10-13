import { expect, test } from '@playwright/test';

/**
 * Time from text landing in the editors to the diff table being on screen.
 * Measured today: ~0.7 s for 5k lines and ~2.7 s for 20k lines (almost all of it
 * DOM rendering; the diff itself takes ~15 ms). These limits only guard against
 * regressions; tighten them once the table renders only visible rows.
 */
function fixture(lines: number) {
  const a = Array.from({ length: lines }, (_, i) => `line ${i} value = ${i * 3};`).join('\n');
  const b = a
    .split('\n')
    .map((l, i) => (i % 40 === 0 ? `${l} // edited` : l))
    .join('\n');
  return { a, b };
}

for (const [lines, budgetMs] of [
  [5_000, 2_500],
  [20_000, 8_000],
] as const) {
  test(`renders a ${lines.toLocaleString()}-line diff within ${budgetMs} ms`, async ({ page }) => {
    await page.goto('/');
    const { a, b } = fixture(lines);
    const ms = await page.evaluate(
      async ({ a, b, lines }) => {
        const set = (el: HTMLTextAreaElement, v: string) => {
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const [left, right] = document.querySelectorAll('textarea');
        const t0 = performance.now();
        set(left!, a);
        set(right!, b);
        await new Promise<void>((done) => {
          const check = () =>
            document.querySelectorAll('.diff-table tbody tr').length >= lines ? done() : requestAnimationFrame(check);
          check();
        });
        // Wait for the frame after the table is in the DOM to be painted
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return performance.now() - t0;
      },
      { a, b, lines },
    );
    test.info().annotations.push({ type: 'render-ms', description: `${Math.round(ms)}` });
    console.log(`${lines} lines rendered in ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(budgetMs);
  });
}
