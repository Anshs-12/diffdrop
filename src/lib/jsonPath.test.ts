import { describe, expect, it } from 'vitest';
import { compileIRegexp } from './iregexp';
import { jsonPath, type JsonPathResult } from './jsonPath';
import { parseJson, stringify } from './jsonValue';

const ok = (r: JsonPathResult) => {
  if (!r.ok) throw new Error(`${r.error} at ${r.pos}`);
  return r;
};
const values = (doc: unknown, expr: string) => ok(jsonPath(doc, expr)).matches.map((m) => m.value);
const paths = (doc: unknown, expr: string) => ok(jsonPath(doc, expr)).matches.map((m) => m.path);
const err = (expr: string, doc: unknown = {}) => {
  const r = jsonPath(doc, expr);
  if (r.ok) throw new Error(`expected an error for ${expr}`);
  return r;
};

// RFC 9535 section 1.5
const STORE = {
  store: {
    book: [
      { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
      { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
      { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99 },
      { category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', isbn: '0-395-19395-8', price: 22.99 },
    ],
    bicycle: { color: 'red', price: 399 },
  },
};

describe('RFC 9535 bookstore examples (1.5)', () => {
  it('selects authors', () => {
    const authors = ['Nigel Rees', 'Evelyn Waugh', 'Herman Melville', 'J. R. R. Tolkien'];
    expect(values(STORE, '$.store.book[*].author')).toEqual(authors);
    expect(values(STORE, '$..author')).toEqual(authors);
    expect(paths(STORE, '$..author')[0]).toBe("$['store']['book'][0]['author']");
  });
  it('selects all things in the store and their prices', () => {
    expect(values(STORE, '$.store.*')).toEqual([STORE.store.book, STORE.store.bicycle]);
    // The RFC allows any order of siblings; this one visits members in document order
    expect(values(STORE, '$.store..price')).toEqual([8.95, 12.99, 8.99, 22.99, 399]);
  });
  it('indexes, slices and unions', () => {
    expect(values(STORE, '$..book[2]')).toEqual([STORE.store.book[2]]);
    expect(values(STORE, '$..book[2].author')).toEqual(['Herman Melville']);
    expect(values(STORE, '$..book[2].publisher')).toEqual([]);
    expect(values(STORE, '$..book[-1]')).toEqual([STORE.store.book[3]]);
    expect(paths(STORE, '$..book[0,1]')).toEqual(["$['store']['book'][0]", "$['store']['book'][1]"]);
    expect(paths(STORE, '$..book[:2]')).toEqual(["$['store']['book'][0]", "$['store']['book'][1]"]);
  });
  it('filters', () => {
    expect(values(STORE, '$..book[?@.isbn]').map((b) => (b as { title: string }).title)).toEqual(['Moby Dick', 'The Lord of the Rings']);
    expect(values(STORE, '$..book[?@.price<10]').map((b) => (b as { title: string }).title)).toEqual(['Sayings of the Century', 'Moby Dick']);
  });
  it('$..* returns every member value and element', () => {
    // store, book, bicycle, 4 books, 4+4+5+5 book fields, color, price
    expect(values(STORE, '$..*')).toHaveLength(1 + 2 + 4 + 18 + 2);
  });
});

describe('RFC 9535 selector examples', () => {
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  it('slices (2.3.4.3)', () => {
    expect(values(letters, '$[1:3]')).toEqual(['b', 'c']);
    expect(values(letters, '$[5:]')).toEqual(['f', 'g']);
    expect(values(letters, '$[1:5:2]')).toEqual(['b', 'd']);
    expect(values(letters, '$[5:1:-2]')).toEqual(['f', 'd']);
    expect(values(letters, '$[::-1]')).toEqual([...letters].reverse());
    expect(values(letters, '$[::0]')).toEqual([]);
    expect(values(letters, '$[-2:]')).toEqual(['f', 'g']);
    expect(values(letters, '$[-100:100]')).toEqual(letters);
    expect(values(letters, '$[ 1 : 3 ]')).toEqual(['b', 'c']);
  });
  it('indexes (2.3.3.3)', () => {
    expect(paths(['a', 'b'], '$[1]')).toEqual(['$[1]']);
    expect(values(['a', 'b'], '$[-2]')).toEqual(['a']);
    expect(values(['a', 'b'], '$[2]')).toEqual([]);
    expect(values({ 0: 'x' }, '$[0]')).toEqual([]);
  });
  it('names (2.3.1.3)', () => {
    const doc = { o: { 'j j': { 'k.k': 3 } }, "'": { '@': 2 } };
    expect(values(doc, "$.o['j j']")).toEqual([{ 'k.k': 3 }]);
    expect(values(doc, `$.o['j j']['k.k']`)).toEqual([3]);
    expect(values(doc, `$.o["j j"]["k.k"]`)).toEqual([3]);
    expect(values(doc, `$["'"]["@"]`)).toEqual([2]);
    expect(paths(doc, `$["'"]["@"]`)).toEqual(["$['\\'']['@']"]);
  });
  it('wildcards (2.3.2.3)', () => {
    const doc = { o: { j: 1, k: 2 }, a: [5, 3] };
    expect(values(doc, '$[*]')).toEqual([{ j: 1, k: 2 }, [5, 3]]);
    expect(values(doc, '$.o[*]')).toEqual([1, 2]);
    expect(values(doc, '$.o[*, *]')).toEqual([1, 2, 1, 2]);
    expect(values(doc, '$.a[*]')).toEqual([5, 3]);
  });
  it('descendants (2.5.2.3)', () => {
    const doc = { o: { j: 1, k: 2 }, a: [5, 3, [{ j: 4 }, { k: 6 }]] };
    expect(paths(doc, '$..j')).toEqual(["$['o']['j']", "$['a'][2][0]['j']"]);
    expect(values(doc, '$..[0]')).toEqual([5, { j: 4 }]);
    expect(values(doc, '$..*')).toHaveLength(11);
    expect(values(doc, '$..[*]')).toEqual(values(doc, '$..*'));
    expect(values(doc, '$..o')).toEqual([{ j: 1, k: 2 }]);
    expect(values(doc, '$.o..[*, *]')).toEqual([1, 2, 1, 2]);
    expect(paths(doc, '$.a..[0, 1]')).toEqual(["$['a'][0]", "$['a'][1]", "$['a'][2][0]", "$['a'][2][1]"]);
  });
  it('null is a value, not nothing (2.6.1)', () => {
    const doc = { a: null, b: [null], c: [{}], null: 1 };
    expect(values(doc, '$.a')).toEqual([null]);
    expect(values(doc, '$.a[0]')).toEqual([]);
    expect(values(doc, '$.a.d')).toEqual([]);
    expect(values(doc, '$.b[0]')).toEqual([null]);
    expect(values(doc, '$.b[*]')).toEqual([null]);
    expect(values(doc, '$.b[?@]')).toEqual([null]);
    expect(values(doc, '$.b[?@==null]')).toEqual([null]);
    expect(values(doc, '$.c[?@.d==null]')).toEqual([]);
    expect(values(doc, '$.null')).toEqual([1]);
  });
});

describe('RFC 9535 filter examples (2.3.5.3)', () => {
  const doc = {
    a: [3, 5, 1, 2, 4, 6, { b: 'j' }, { b: 'k' }, { b: {} }, { b: 'kilo' }],
    o: { p: 1, q: 2, r: 3, s: 5, t: { u: 6 } },
    e: 'f',
  };
  it('matches the RFC table', () => {
    expect(paths(doc, "$.a[?@.b == 'kilo']")).toEqual(["$['a'][9]"]);
    expect(paths(doc, "$.a[?(@.b == 'kilo')]")).toEqual(["$['a'][9]"]);
    expect(values(doc, '$.a[?@>3.5]')).toEqual([5, 4, 6]);
    expect(paths(doc, '$.a[?@.b]')).toEqual(["$['a'][6]", "$['a'][7]", "$['a'][8]", "$['a'][9]"]);
    expect(paths(doc, '$[?@.*]')).toEqual(["$['a']", "$['o']"]);
    expect(paths(doc, '$[?@[?@.b]]')).toEqual(["$['a']"]);
    expect(values(doc, '$.o[?@<3, ?@<3]')).toEqual([1, 2, 1, 2]);
    expect(values(doc, '$.a[?@<2 || @.b == "k"]')).toEqual([1, { b: 'k' }]);
    expect(values(doc, '$.a[?match(@.b, "[jk]")]')).toEqual([{ b: 'j' }, { b: 'k' }]);
    expect(values(doc, '$.a[?search(@.b, "[jk]")]')).toEqual([{ b: 'j' }, { b: 'k' }, { b: 'kilo' }]);
    expect(values(doc, '$.o[?@>1 && @<4]')).toEqual([2, 3]);
    expect(paths(doc, '$.o[?@.u || @.x]')).toEqual(["$['o']['t']"]);
    expect(values(doc, '$.a[?@.b == $.x]')).toEqual([3, 5, 1, 2, 4, 6]);
    expect(values(doc, '$.a[?@ == @]')).toHaveLength(10);
  });
  it('negation and parentheses', () => {
    expect(values(doc, '$.a[?!@.b]')).toEqual([3, 5, 1, 2, 4, 6]);
    expect(values(doc, '$.a[?!(@ > 2)]')).toEqual([1, 2, { b: 'j' }, { b: 'k' }, { b: {} }, { b: 'kilo' }]);
    expect(values(doc, '$.a[?(@ > 1 || @ < 0) && @ != 5]')).toEqual([3, 2, 4, 6]);
  });
});

describe('RFC 9535 comparisons (2.3.5.3)', () => {
  const doc = { obj: { x: 'y' }, arr: [2, 3], probe: [0] };
  const holds = (expr: string) => values(doc, `$.probe[?${expr}]`).length === 1;
  it.each([
    ['$.absent1 == $.absent2', true],
    ['$.absent1 <= $.absent2', true],
    ["$.absent == 'g'", false],
    ['$.absent1 != $.absent2', false],
    ["$.absent != 'g'", true],
    ['1 <= 2', true],
    ['1> 2', false],
    ["13 == '13'", false],
    ["'a' <= 'b'", true],
    ["'a' > 'b'", false],
    ['$.obj == $.arr', false],
    ['$.obj != $.arr', true],
    ['$.obj == $.obj', true],
    ['$.obj != $.obj', false],
    ['$.arr == $.arr', true],
    ['$.arr != $.arr', false],
    ['$.obj == 17', false],
    ['$.obj != 17', true],
    ['$.obj <= $.arr', false],
    ['$.obj < $.arr', false],
    ['$.obj <= $.obj', true],
    ['$.arr <= $.arr', true],
    ['1 <= $.arr', false],
    ['1 >= $.arr', false],
    ['1 > $.arr', false],
    ['1 < $.arr', false],
    ['true <= true', true],
    ['true > true', false],
  ])('%s is %s', (expr, expected) => {
    expect(holds(expr)).toBe(expected);
  });
  it('compares numbers by value and strings by code point', () => {
    expect(holds('1 == 1.0')).toBe(true);
    expect(holds('1e2 == 100')).toBe(true);
    expect(holds('-0 == 0')).toBe(true);
    // U+FFFF sorts before U+1F600 by code point, though not by UTF-16 unit
    expect(holds("'￿' < '😀'")).toBe(true);
    expect(holds("'ab' < 'abc'")).toBe(true);
    expect(holds("'abc' < 'ab'")).toBe(false);
  });
  it('treats JsonNumber values like numbers', () => {
    const big = parseJson('{"items":[{"n":1.0},{"n":12345678901234567890},{"n":2}]}');
    expect(values(big, '$.items[?@.n == 1]').map((v) => stringify(v))).toEqual(['{"n":1.0}']);
    expect(values(big, '$.items[?@.n > 100]').map((v) => stringify(v))).toEqual(['{"n":12345678901234567890}']);
  });
});

describe('functions (2.4)', () => {
  const doc = [
    { name: 'ada', tags: ['x', 'y'], tz: 'Europe/London', color: 'red' },
    { name: 'grace', tags: ['x'], tz: 'America/New_York', nested: { color: 'red' } },
    { name: 'alan', tags: [], tz: 'Europe/Paris' },
  ];
  it('length()', () => {
    expect(values(doc, '$[?length(@.tags) >= 1].name')).toEqual(['ada', 'grace']);
    expect(values(doc, '$[?length(@.name) == 3].name')).toEqual(['ada']);
    expect(values(['😀é', 'ab', 'abc'], '$[?length(@) == 2]')).toEqual(['😀é', 'ab']);
    expect(values(doc, '$[?length(@) == 3].name')).toEqual(['alan']);
    expect(values(doc, '$[?length(@.missing) == 0]')).toEqual([]);
  });
  it('count()', () => {
    expect(values(doc, '$[?count(@.tags[*]) == 1].name')).toEqual(['grace']);
    expect(values(doc, '$[?count(@..color) > 0].name')).toEqual(['ada', 'grace']);
  });
  it('match() and search()', () => {
    expect(values(doc, "$[?match(@.tz, 'Europe/.*')].name")).toEqual(['ada', 'alan']);
    expect(values(doc, "$[?match(@.tz, 'Europe')].name")).toEqual([]);
    expect(values(doc, "$[?search(@.tz, 'New')].name")).toEqual(['grace']);
    expect(values(doc, "$[?!match(@.name, 'a.*')].name")).toEqual(['grace']);
    expect(values(doc, "$[?match(@.missing, '.*')]")).toEqual([]);
  });
  it('value()', () => {
    expect(values(doc, '$[?value(@..color) == "red"].name')).toEqual(['ada', 'grace']);
  });
  it('an invalid I-Regexp matches nothing, with a warning', () => {
    const r = ok(jsonPath(doc, "$[?match(@.name, '(a')]"));
    expect(r.matches).toEqual([]);
    expect(r.warnings[0]).toContain('isn’t a valid I-Regexp');
  });
  it('rejects badly typed calls (2.4.9 examples)', () => {
    expect(jsonPath([], '$[?length(@) < 3]').ok).toBe(true);
    expect(err('$[?length(@.*) < 3]').error).toContain('single value');
    expect(jsonPath([], '$[?count(@.*) == 1]').ok).toBe(true);
    expect(err('$[?count(1) == 1]').error).toContain('takes a query');
    expect(jsonPath([], '$[?count(foo(@.*)) == 1]').ok).toBe(false);
    expect(jsonPath([], "$[?match(@.timezone, 'Europe/.*')]").ok).toBe(true);
    expect(err("$[?match(@.timezone, 'Europe/.*') == true]").error).toContain('can’t be compared');
    expect(jsonPath([], '$[?value(@..color) == "red"]').ok).toBe(true);
    expect(err('$[?value(@..color)]').error).toContain('returns a value');
    expect(err('$[?bar(@.a)]').error).toContain('Unknown function bar()');
    expect(err('$[?length(@.a, @.b) == 1]').error).toContain('takes 1 argument');
    expect(err('$[?length(@.a == 1) == 1]').error).toContain('not a test');
  });
});

describe('errors', () => {
  it.each([
    ['', 0, 'starting with $'],
    ['store.book', 0, 'must start with $'],
    ['@.a', 0, '@ is only used inside a filter'],
    [' $.a', 0, 'space at the start'],
    ['$.a ', 3, 'space at the end'],
    ['$.a[0', 5, 'Missing “]”'],
    ['$[name]', 2, "['name']"],
    ['$.1', 2, '[1]'],
    ['$[01]', 2, 'leading zeros'],
    ['$[-0]', 2, '-0'],
    ['$[1.5]', 2, 'whole numbers'],
    ['$[9007199254740992]', 2, 'too large'],
    ["$['abc]", 2, 'no closing quote'],
    ["$['a\\x']", 4, 'isn’t a valid escape'],
    ['$["a\\\'"]', 4, 'isn’t a valid escape'],
    ['$[?@.a = 1]', 7, 'Use =='],
    ['$[?@.a == ]', 10, 'Expected @, $, a literal'],
    ['$[?foo]', 3, 'Unknown name “foo”'],
    ['$[?True]', 3, 'lowercase'],
    ['$[?1]', 3, 'literal on its own'],
    ['$[?@.* == 1]', 3, 'single-value queries'],
    ['$[?(@.a]', 7, 'Expected “)”'],
    ['$[?!@.a == 1]', 7, 'wrap the comparison'],
    ['$..', 3, 'after “..”'],
    ['$.', 2, 'after “.”'],
    ['$[]', 2, 'Empty brackets'],
    ['$[1 2]', 4, 'Expected “,” or “]”'],
    ["$['\\ud800']", 3, 'low one'],
  ])('%s', (expr, pos, message) => {
    const r = err(expr);
    expect(r.error).toContain(message);
    expect(r.pos).toBe(pos);
  });

  it('caps nesting instead of overflowing the stack', () => {
    const expr = `$[?${'('.repeat(500)}@${')'.repeat(500)}]`;
    expect(err(expr).error).toContain('nested too deeply');
  });
});

describe('strings, unicode and normalized paths', () => {
  it('decodes escapes', () => {
    const doc = { 'a\nb': 1, 'é': 2, '😀': 3, 'q"': 4, '\u0001': 5 };
    expect(values(doc, "$['a\\nb']")).toEqual([1]);
    expect(values(doc, "$['\\u00e9']")).toEqual([2]);
    expect(values(doc, '$.é')).toEqual([2]);
    expect(values(doc, '$.😀')).toEqual([3]);
    expect(values(doc, "$['\\ud83d\\ude00']")).toEqual([3]);
    expect(values(doc, '$["q\\""]')).toEqual([4]);
    expect(paths(doc, '$.*')).toEqual(["$['a\\nb']", "$['é']", "$['😀']", `$['q"']`, "$['\\u0001']"]);
  });
  it('does not see inherited properties', () => {
    expect(values({}, '$.constructor')).toEqual([]);
    expect(values({}, '$.__proto__')).toEqual([]);
    expect(values(JSON.parse('{"__proto__": 1}'), '$.__proto__')).toEqual([1]);
  });
  it('handles the root and scalars', () => {
    expect(paths(5, '$')).toEqual(['$']);
    expect(values(5, '$.a')).toEqual([]);
    expect(values('str', '$[0]')).toEqual([]);
    expect(values(null, '$..*')).toEqual([]);
  });
});

describe('large input', () => {
  it('searches 100,000 items quickly', () => {
    const doc = { items: Array.from({ length: 100_000 }, (_, i) => ({ id: i, even: i % 2 === 0, name: `item ${i}` })) };
    const t = performance.now();
    expect(values(doc, '$.items[?@.even == true && @.id >= 99990].id')).toEqual([99990, 99992, 99994, 99996, 99998]);
    expect(values(doc, '$..id')).toHaveLength(100_000);
    // In I-Regexp "$" is an ordinary character, so match() is the way to anchor at the end
    expect(values(doc, "$.items[?search(@.name, '9999$')].id")).toEqual([]);
    expect(values(doc, "$.items[?match(@.name, '.*9999')].id")).toEqual([9999, 19999, 29999, 39999, 49999, 59999, 69999, 79999, 89999, 99999]);
    expect(performance.now() - t).toBeLessThan(5000);
  });
  it('handles a deeply nested document', () => {
    let doc: unknown = 'leaf';
    for (let i = 0; i < 5000; i++) doc = { a: doc };
    const r = ok(jsonPath(doc, '$..a'));
    expect(r.matches).toHaveLength(5000);
    expect(r.matches[4999]!.path.length).toBe(1 + 5000 * 5);
  });
});

it('matches the page’s worked example', async () => {
  const { default: content } = await import('../tools/content/jsonpath-tester');
  const r = ok(jsonPath(STORE, content.example!.input));
  expect(r.matches.map((m) => `${m.path}  ${JSON.stringify(m.value)}`).join('\n')).toBe(content.example!.output);
});

describe('I-Regexp', () => {
  it('matches whole strings or substrings', () => {
    const re = compileIRegexp('a[bc]+d?');
    expect(re.matches('abcbd')).toBe(true);
    expect(re.matches('abcbdx')).toBe(false);
    expect(re.search('xxabx')).toBe(true);
    expect(compileIRegexp('').matches('')).toBe(true);
    expect(compileIRegexp('').search('abc')).toBe(true);
  });
  it('supports the I-Regexp syntax', () => {
    expect(compileIRegexp('\\p{Lu}\\p{Ll}+').matches('Émile')).toBe(true);
    expect(compileIRegexp('\\P{L}+').matches('123 !')).toBe(true);
    expect(compileIRegexp('[^0-9]{2,3}').matches('abc')).toBe(true);
    expect(compileIRegexp('[^0-9]{2,3}').matches('abcd')).toBe(false);
    expect(compileIRegexp('x{2,}').matches('xxxxx')).toBe(true);
    expect(compileIRegexp('x{2,}').matches('x')).toBe(false);
    expect(compileIRegexp('(cat|dog)s?').matches('dogs')).toBe(true);
    expect(compileIRegexp('a.c').matches('a\nc')).toBe(false);
    expect(compileIRegexp('a.c').matches('a😀c')).toBe(true);
    expect(compileIRegexp('[-a]+').matches('-a-')).toBe(true);
    expect(compileIRegexp('\\.\\*').matches('.*')).toBe(true);
    expect(compileIRegexp('^$').matches('^$')).toBe(true);
    expect(() => compileIRegexp('\\$')).toThrow('isn’t an I-Regexp escape');
  });
  it('rejects what I-Regexp leaves out', () => {
    for (const p of ['(a', 'a)', '*a', 'a**', '\\d', '\\w', '(?:a)', '[a', '[z-a]', 'a{3,1}', 'a{2000}', '\\p{Foo}', 'a+?']) {
      expect(() => compileIRegexp(p), p).toThrow();
    }
  });
  it('stays linear on patterns that make backtracking engines hang', () => {
    const t = performance.now();
    const evil = 'a'.repeat(30_000) + '!';
    expect(compileIRegexp('(a+)+$').matches(evil)).toBe(false);
    expect(compileIRegexp('(a|a)*b').search(evil)).toBe(false);
    expect(compileIRegexp('(a*)*b').matches(evil)).toBe(false);
    expect(performance.now() - t).toBeLessThan(3000);
  });
  it('refuses patterns that would be too large', () => {
    expect(() => compileIRegexp('((a{1000}){1000}){1000}')).toThrow('too large');
  });
});
