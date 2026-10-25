import { describe, expect, it } from 'vitest';
import { EXAMPLE_YAML, yamlToJson } from './yamlJson';
import { jsonToYaml } from './jsonTools';
import { parseJson } from './jsonValue';

const ok = (text: string) => {
  const r = yamlToJson(text);
  if (!r.ok) throw new Error(`${r.message} at ${r.line}:${r.column}`);
  return r;
};

describe('yamlToJson', () => {
  it('converts mappings, sequences and scalars', () => {
    const r = ok('name: web\nreplicas: 3\nenabled: true\nratio: 0.5\nnothing: null\nports:\n  - 80\n  - 443\nenv:\n  MODE: prod\n');
    expect(r.json).toBe(
      '{\n  "name": "web",\n  "replicas": 3,\n  "enabled": true,\n  "ratio": 0.5,\n  "nothing": null,\n  "ports": [\n    80,\n    443\n  ],\n  "env": {\n    "MODE": "prod"\n  }\n}\n',
    );
    expect(r.documents).toBe(1);
    expect(r.warnings).toEqual([]);
  });

  it('reads YAML 1.2: yes/no/on/off stay strings, quoted values stay strings', () => {
    expect(ok('a: yes\nb: off\nc: "1.10"\nd: 1.10\ne: 0755\n').value).toEqual({ a: 'yes', b: 'off', c: '1.10', d: 1.1, e: 755 });
  });

  it('keeps long integers exact', () => {
    expect(ok('id: 12345678901234567890\nsmall: 42\n').json).toBe('{\n  "id": 12345678901234567890,\n  "small": 42\n}\n');
  });

  it('expands anchors and aliases, block strings and flow collections', () => {
    const r = ok('base: &b {x: 1, y: [a, b]}\ncopy: *b\ntext: |\n  line one\n  line two\nfolded: >\n  a\n  b\n');
    expect(r.value).toEqual({ base: { x: 1, y: ['a', 'b'] }, copy: { x: 1, y: ['a', 'b'] }, text: 'line one\nline two\n', folded: 'a b\n' });
  });

  it('turns several documents into an array', () => {
    const r = ok('a: 1\n---\nb: 2\n');
    expect(r.value).toEqual([{ a: 1 }, { b: 2 }]);
    expect(r.documents).toBe(2);
  });

  it('writes infinity and NaN as null, with a warning', () => {
    const r = ok('a: .inf\nb: .nan\n');
    expect(r.value).toEqual({ a: null, b: null });
    expect(r.warnings).toEqual(['JSON has no infinity; written as null', 'JSON has no NaN; written as null']);
  });

  it('turns non-string keys into strings', () => {
    expect(ok('1: one\ntrue: yes\n').value).toEqual({ '1': 'one', true: 'yes' });
  });

  it('keeps a __proto__ key as data', () => {
    const r = ok('__proto__:\n  polluted: 1\n');
    expect(r.json).toBe('{\n  "__proto__": {\n    "polluted": 1\n  }\n}\n');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('reads unicode and a byte order mark', () => {
    expect(ok('\uFEFF名前: "Zoë 😀"\nemoji: 🎉\n').value).toEqual({ 名前: 'Zoë 😀', emoji: '🎉' });
  });

  it('returns null for an empty document', () => {
    expect(ok('').json).toBe('null\n');
    expect(ok('# just a comment\n').json).toBe('null\n');
  });

  it('reports errors with line and column', () => {
    expect(yamlToJson('a: 1\na: 2\n')).toEqual({ ok: false, message: 'Map keys must be unique', line: 2, column: 1 });
    expect(yamlToJson('a:\n\tb: 1\n')).toMatchObject({ ok: false, message: 'Tabs are not allowed as indentation', line: 2, column: 1 });
    const r = yamlToJson('list: [1, 2\nnext: 3\n');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.line).toBeGreaterThan(0);
  });

  it('refuses alias bombs instead of hanging', () => {
    const bomb = ['a: &a ["x","x","x","x","x","x","x","x","x"]'];
    for (let i = 1; i < 9; i++) bomb.push(`${String.fromCharCode(97 + i)}: &${String.fromCharCode(97 + i)} [${Array(9).fill('*' + String.fromCharCode(96 + i)).join(',')}]`);
    const r = yamlToJson(bomb.join('\n'));
    expect(r.ok).toBe(false);
  });

  it('reads back what JSON to YAML writes', () => {
    const input = '{"name":"web","enabled":"yes","version":"1.10","n":1,"nested":{"list":[1,"two",null,{"a":[]}]},"s":"a: b # c","u":"Zoë 😀"}';
    const value = parseJson(input);
    expect(ok(jsonToYaml(value)).value).toEqual(value);
  });

  it('converts a large document', () => {
    const yaml = Array.from({ length: 20_000 }, (_, i) => `- id: ${i}\n  name: user ${i}`).join('\n');
    const r = ok(yaml);
    expect((r.value as unknown[]).length).toBe(20_000);
  });

  it('indents with a tab when asked', () => {
    const r = yamlToJson('a: 1\n', '\t');
    expect(r.ok && r.json).toBe('{\n\t"a": 1\n}\n');
  });
});

describe('EXAMPLE_YAML', () => {
  it('converts, with the merge key applied', () => {
    const r = ok(EXAMPLE_YAML);
    expect(r.value).toMatchObject({
      name: 'web',
      enabled: 'yes',
      version: '1.10',
      ports: [80, 443],
      staging: { timeout: 30, retries: 2, host: 'staging.example.com' },
      notes: 'First line\nSecond line, with "quotes" and ünïcödé\n',
    });
  });
});
