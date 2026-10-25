import { describe, expect, it } from 'vitest';
import { checkYaml } from './yamlCheck';

describe('checkYaml', () => {
  it('empty input', () => {
    expect(checkYaml('')).toEqual({ status: 'empty' });
    expect(checkYaml('  \n')).toEqual({ status: 'empty' });
  });

  it('valid YAML becomes JSON', () => {
    const r = checkYaml('name: toolspace\nlist:\n  - 1\n  - two\nnested:\n  ok: true\n');
    expect(r.status).toBe('valid');
    if (r.status !== 'valid') return;
    expect(JSON.parse(r.json)).toEqual({ name: 'toolspace', list: [1, 'two'], nested: { ok: true } });
    expect(r.documents).toBe(1);
    expect(r.warnings).toEqual([]);
  });

  it('reports syntax errors with line and column', () => {
    const r = checkYaml('a: 1\nb: [1, 2\nc: 3\n');
    expect(r.status).toBe('invalid');
    if (r.status !== 'invalid') return;
    expect(r.errors[0]!.line).toBeGreaterThan(0);
    expect(r.errors[0]!.column).toBeGreaterThan(0);
    expect(r.errors[0]!.message).not.toMatch(/at line/);
  });

  it('bad indentation is an error at its line', () => {
    const r = checkYaml('a: b\n  c: d\n');
    expect(r.status).toBe('invalid');
    if (r.status === 'invalid') expect(r.errors[0]!.line).toBe(1);
  });

  it('warns about duplicate keys but still shows the result', () => {
    const r = checkYaml('a: 1\nb: 2\na: 3\n');
    expect(r.status).toBe('valid');
    if (r.status !== 'valid') return;
    expect(r.warnings[0]).toMatchObject({ line: 3, column: 1 });
    expect(r.warnings[0]!.message).toMatch(/unique/);
  });

  it('multi-document files become a JSON array', () => {
    const r = checkYaml('a: 1\n---\nb: 2\n---\n- x\n');
    expect(r.status).toBe('valid');
    if (r.status !== 'valid') return;
    expect(r.documents).toBe(3);
    expect(JSON.parse(r.json)).toEqual([{ a: 1 }, { b: 2 }, ['x']]);
  });

  it('YAML 1.1 reads no/on/y as booleans; 1.2 keeps them and warns', () => {
    const src = 'country: NO\nswitch: on\nanswer: y\nreal: true\nquoted: "no"\n';
    const v12 = checkYaml(src, '1.2');
    const v11 = checkYaml(src, '1.1');
    if (v12.status !== 'valid' || v11.status !== 'valid') throw new Error('expected valid');
    expect(JSON.parse(v12.json)).toEqual({ country: 'NO', switch: 'on', answer: 'y', real: true, quoted: 'no' });
    expect(JSON.parse(v11.json)).toEqual({ country: false, switch: true, answer: true, real: true, quoted: 'no' });
    expect(v12.warnings.map((w) => w.line)).toEqual([1, 2, 3]);
    expect(v11.warnings).toEqual([]);
  });

  it('comment-only files are valid with no documents', () => {
    const r = checkYaml('# just a comment\n');
    expect(r).toMatchObject({ status: 'valid', documents: 0, json: '' });
  });

  it('infinity becomes null with a warning', () => {
    const r = checkYaml('a: .inf\n');
    if (r.status !== 'valid') throw new Error('expected valid');
    expect(JSON.parse(r.json)).toEqual({ a: null });
    expect(r.warnings[0]!.message).toMatch(/infinity/);
  });

  it('a self-referencing alias is reported, not thrown', () => {
    const r = checkYaml('&a [*a]\n');
    expect(r.status).toBe('invalid');
  });

  it('unicode keys and values', () => {
    const r = checkYaml('名前: 東京\nemoji: "🎉"\n');
    if (r.status !== 'valid') throw new Error('expected valid');
    expect(JSON.parse(r.json)).toEqual({ 名前: '東京', emoji: '🎉' });
  });

  it('large input', () => {
    const src = Array.from({ length: 20_000 }, (_, i) => `key${i}: value ${i}`).join('\n');
    const r = checkYaml(src);
    expect(r.status).toBe('valid');
    if (r.status === 'valid') expect(Object.keys(JSON.parse(r.json))).toHaveLength(20_000);
  });

  it('too many aliases (a "billion laughs" file) is an error, not a hang', () => {
    const lines = ['a: &a [x, x, x, x, x, x, x, x, x, x]'];
    for (let i = 0; i < 8; i++) lines.push(`${'bcdefghij'[i]}: &${'bcdefghij'[i]} [${Array(10).fill(`*${i === 0 ? 'a' : 'bcdefghij'[i - 1]}`).join(', ')}]`);
    const r = checkYaml(lines.join('\n'));
    expect(r.status).toBe('invalid');
  });
});
