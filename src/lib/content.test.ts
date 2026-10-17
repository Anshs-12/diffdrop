import { describe, expect, it } from 'vitest';
import { PAGES } from '@/site';
import { TOOL_CONTENT } from '@/tools/content';
import { markdownToHtml } from './markdown';
import { gradientCss } from './color';
import { jsonToYaml, pathString } from './jsonTools';
import { parseJson } from './jsonValue';
import { lorem } from './generate';
import { titleCase } from './textCase';

describe('page metadata', () => {
  it('keeps titles to 60 characters and descriptions to 155, in plain ASCII', () => {
    for (const p of PAGES) {
      expect(p.title.length, p.id).toBeLessThanOrEqual(60);
      expect(p.description.length, p.id).toBeLessThanOrEqual(155);
      expect(p.description, p.id).toMatch(/^[\x20-\x7e]+$/);
      expect(p.description, p.id).not.toContain('"');
    }
  });

  it('says "no sign-up" in the titles of the most searched tools', () => {
    for (const id of ['jwt-decoder', 'password-generator', 'word-counter', 'base64', 'json-formatter']) {
      expect(PAGES.find((p) => p.id === id)!.title, id).toMatch(/no sign-up/i);
    }
  });
});

describe('worked examples show the tools’ real output', () => {
  it('markdown preview', () => {
    const ex = TOOL_CONTENT['markdown-preview'].example!;
    expect(markdownToHtml(ex.input)).toBe(ex.output);
  });

  it('css gradient', () => {
    const ex = TOOL_CONTENT['css-gradient'].example!;
    expect(`background: ${gradientCss('linear', 90, [{ color: '#ff7e5f', at: 0 }, { color: '#feb47b', at: 100 }])};`).toBe(ex.output);
  });

  it('json to yaml', () => {
    const ex = TOOL_CONTENT['json-to-yaml'].example!;
    expect(jsonToYaml(parseJson(ex.input))).toBe(ex.output);
  });

  it('json viewer', () => {
    const ex = TOOL_CONTENT['json-viewer'].example!;
    expect([pathString(['users', 0, 'email']), pathString(['users', 1, 'first-name'])].join('\n')).toBe(ex.output);
  });

  it('lorem ipsum', () => {
    const ex = TOOL_CONTENT['lorem-ipsum'].example!;
    expect(lorem('words', 8, { classic: true }).join(' ')).toBe(ex.output);
  });

  it('title case', () => {
    const ex = TOOL_CONTENT['title-case'].example!;
    expect([titleCase(ex.input, 'chicago'), titleCase(ex.input, 'ap')].join('\n')).toBe(ex.output);
  });

  it('the six shortest pages all have an example and common mistakes', () => {
    for (const id of ['markdown-preview', 'css-gradient', 'json-viewer', 'lorem-ipsum', 'json-to-yaml', 'title-case'] as const) {
      expect(TOOL_CONTENT[id].example, id).toBeTruthy();
      expect(TOOL_CONTENT[id].mistakes!.length, id).toBeGreaterThanOrEqual(4);
    }
  });
});
