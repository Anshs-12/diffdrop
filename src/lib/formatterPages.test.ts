import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT } from '@/tools/content';
import { formatCode, minifyCode, type FormatOptions } from './beautify';

const o: FormatOptions = { indent: 2, printWidth: 80, singleQuote: false };

describe('formatter pages: worked examples show the real output', () => {
  it('JavaScript', async () => {
    const ex = TOOL_CONTENT['javascript-beautifier'].example!;
    expect(await formatCode(ex.input, 'javascript', o)).toEqual({ ok: true, text: ex.output });
  });

  it('CSS (minify)', async () => {
    const ex = TOOL_CONTENT['css-beautifier'].example!;
    expect(await minifyCode(ex.input, 'css')).toEqual({ ok: true, text: ex.output });
  });

  it('HTML', async () => {
    const ex = TOOL_CONTENT['html-beautifier'].example!;
    expect(await formatCode(ex.input, 'html', o)).toEqual({ ok: true, text: ex.output });
  });

  it('SQL', async () => {
    const ex = TOOL_CONTENT['sql-formatter'].example!;
    expect(await formatCode(ex.input, 'sql', o)).toEqual({ ok: true, text: ex.output });
  });

  it('XML', async () => {
    const ex = TOOL_CONTENT['xml-formatter'].example!;
    expect(await formatCode(ex.input, 'xml', o)).toEqual({ ok: true, text: ex.output });
  });
});

describe('formatter pages: content', () => {
  const ids = ['java-beautifier', 'javascript-beautifier', 'css-beautifier', 'html-beautifier', 'python-formatter', 'sql-formatter', 'xml-formatter'] as const;

  it('each page is filled in and links back to the code beautifier', () => {
    for (const id of ids) {
      const c = TOOL_CONTENT[id];
      expect(c.lede, id).not.toBe('TODO');
      expect(c.steps.length, id).toBe(3);
      expect(c.faq.length, id).toBeGreaterThanOrEqual(3);
      expect(c.mistakes?.length, id).toBe(4);
      expect(c.related, id).toContain('code-beautifier');
    }
  });

  it('no sentence is repeated across the pages', () => {
    const seen = new Map<string, string>();
    for (const id of ids) {
      const c = TOOL_CONTENT[id];
      const texts = [c.lede, ...c.steps.flatMap((s) => [s.title, s.body]), ...c.faq.flatMap((f) => [f.q, f.a]), ...(c.mistakes ?? []).flatMap((m) => [m.title, m.body])];
      for (const t of texts) {
        expect(seen.get(t), `${id}: "${t}" also on ${seen.get(t)}`).toBeUndefined();
        seen.set(t, id);
      }
    }
  });
});
