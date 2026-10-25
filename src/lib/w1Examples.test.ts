import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT } from '@/tools/content';
import { PAGES } from '@/site';
import { explainCron, parseCron } from './cron';
import { hashBytes, toHex } from './hash';
import { encodeEntities } from './htmlEntities';
import { formatInBase, parseInBase } from './numberBase';
import { DEFAULT_SLUG, slugify } from './slug';

const IDS = ['uuid-generator', 'hash-generator', 'number-base-converter', 'html-entities', 'slug-generator', 'cron-generator'] as const;

describe('worked examples show the tools’ real output (encoding tools)', () => {
  it('hash generator', async () => {
    const ex = TOOL_CONTENT['hash-generator'].example!;
    const data = new TextEncoder().encode(ex.input);
    expect([toHex(await hashBytes('MD5', data)), toHex(await hashBytes('SHA-256', data))].join('\n')).toBe(ex.output);
  });
  it('number base converter', () => {
    const ex = TOOL_CONTENT['number-base-converter'].example!;
    const r = parseInBase(ex.input, 10);
    expect(r.ok).toBe(true);
    const v = r.ok === true ? r.value : 0n;
    expect([formatInBase(v, 16), formatInBase(v, 36)].join('\n').toUpperCase()).toBe(ex.output);
  });
  it('html entities', () => {
    const ex = TOOL_CONTENT['html-entities'].example!;
    expect(encodeEntities(ex.input, { style: 'named', nonAscii: false })).toBe(ex.output);
  });
  it('slug generator', () => {
    const ex = TOOL_CONTENT['slug-generator'].example!;
    expect(slugify(ex.input, DEFAULT_SLUG)).toBe(ex.output);
  });
  it('cron generator', () => {
    const ex = TOOL_CONTENT['cron-generator'].example!;
    const r = parseCron(ex.input);
    expect(r.ok && explainCron(r.schedule)).toBe(ex.output);
  });
  it('every page has steps, FAQ, mistakes and related links', () => {
    const ids = new Set(PAGES.map((p) => p.id));
    for (const id of IDS) {
      const c = TOOL_CONTENT[id];
      expect(c.lede, id).not.toBe('TODO');
      expect(c.steps, id).toHaveLength(3);
      expect(c.faq.length, id).toBeGreaterThanOrEqual(3);
      expect(c.mistakes, id).toHaveLength(4);
      expect(c.related!.length, id).toBeGreaterThanOrEqual(2);
      for (const r of c.related!) expect(ids.has(r), `${id} → ${r}`).toBe(true);
    }
  });
});
