import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT } from '@/tools/content';
import { PAGES } from '@/site';

const IDS = [
  'lorem-ipsum',
  'css-gradient',
  'qr-code',
  'regex-tester',
  'unix-timestamp',
  'url-encoder',
  'base64',
  'password-generator',
  'jwt-decoder',
  'case-converter',
] as const;

describe('related links on the text, encoding and generator pages', () => {
  it('each page links two to four other real pages', () => {
    const ids = new Set(PAGES.map((p) => p.id));
    for (const id of IDS) {
      const related = TOOL_CONTENT[id].related ?? [];
      expect(related.length, id).toBeGreaterThanOrEqual(2);
      expect(related.length, id).toBeLessThanOrEqual(4);
      expect(new Set(related).size, id).toBe(related.length);
      for (const r of related) {
        expect(ids.has(r), `${id} → ${r}`).toBe(true);
        expect(r, id).not.toBe(id);
      }
    }
  });
});
