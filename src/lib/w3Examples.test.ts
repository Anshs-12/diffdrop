import { describe, expect, it } from 'vitest';
import { TOOL_CONTENT } from '@/tools/content';
import { jsonToTs } from './jsonToTs';
import { parseJson } from './jsonValue';
import { checkYaml } from './yamlCheck';
import { cleanLines } from './lines';
import { linesToItems, toSqlIn } from './sqlList';
import { formatRows, generateRows, seedFromText, type MockField } from './mockData';

describe('worked examples show the tools’ real output (data tools)', () => {
  it('json to typescript', () => {
    const ex = TOOL_CONTENT['json-to-typescript'].example!;
    const r = jsonToTs(parseJson(ex.input));
    expect(r.ok && r.code).toBe(ex.output);
  });
  it('yaml validator', () => {
    const ex = TOOL_CONTENT['yaml-validator'].example!;
    const r = checkYaml(ex.input);
    expect(r.status === 'valid' && r.json).toBe(ex.output);
    expect(r.status === 'valid' && r.warnings.map((w) => w.line)).toEqual([1, 4]);
  });
  it('line cleaner', () => {
    const ex = TOOL_CONTENT['line-cleaner'].example!;
    expect(cleanLines(ex.input, { dedupe: true, ignoreCase: true, trim: true, dropEmpty: true, sort: 'az' }).text).toBe(ex.output);
  });
  it('list to sql', () => {
    const ex = TOOL_CONTENT['list-to-sql'].example!;
    expect(toSqlIn(linesToItems(ex.input, { trim: true, skipEmpty: true, dedupe: true }))).toBe(ex.output);
  });
  it('mock data', () => {
    const ex = TOOL_CONTENT['mock-json'].example!;
    const fields: MockField[] = [
      { key: 'id', type: 'id' },
      { key: 'name', type: 'fullName' },
      { key: 'email', type: 'email' },
      { key: 'active', type: 'boolean' },
    ];
    expect(formatRows(generateRows(fields, { rows: 2, seed: seedFromText('demo') }), fields, 'json')).toBe(ex.output);
  });
  it('every data tool page has steps, FAQ, mistakes and related links', () => {
    for (const id of ['json-to-typescript', 'yaml-validator', 'line-cleaner', 'list-to-sql', 'mock-json'] as const) {
      const c = TOOL_CONTENT[id];
      expect(c.lede, id).not.toBe('TODO');
      expect(c.steps, id).toHaveLength(3);
      expect(c.faq.length, id).toBeGreaterThanOrEqual(3);
      expect(c.mistakes, id).toHaveLength(4);
      expect(c.related!.length, id).toBeGreaterThanOrEqual(2);
    }
  });
});
