/**
 * JSONPath as standardised in RFC 9535: parse an expression once, then run it
 * against a parsed JSON value to get the matching nodes and their normalized
 * paths ($['store']['book'][0]).
 *
 * Supported: $, @, .name, ['name'], [index], negative indexes, [start:end:step],
 * *, .., unions [a,b], and ?filters with comparisons, &&, ||, !, parentheses and
 * existence tests, plus the five standard functions length(), count(),
 * match(), search() and value(). match() and search() use I-Regexp (RFC 9485)
 * run on a backtracking-free matcher (see iregexp.ts).
 *
 * Numbers parsed by parseJson may be JsonNumber objects (to keep 1.0 or big
 * integers exact); they compare by numeric value here.
 */
import { compileIRegexp, type IRegexp } from './iregexp';
import { JsonNumber } from './jsonValue';

export class JsonPathError extends Error {
  /** 0-based offset in the expression. */
  readonly pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.pos = pos;
  }
}

// ---------- Syntax tree ----------

type Selector =
  | { t: 'name'; name: string }
  | { t: 'wild' }
  | { t: 'index'; index: number }
  | { t: 'slice'; start: number | null; end: number | null; step: number | null }
  | { t: 'filter'; expr: Logical };

interface Segment {
  descendant: boolean;
  selectors: Selector[];
}

interface Query {
  root: '$' | '@';
  segments: Segment[];
  /** Only name and index selectors, one per segment, no "..": yields at most one node. */
  singular: boolean;
}

type FnName = 'length' | 'count' | 'match' | 'search' | 'value';
type ParamType = 'value' | 'nodes';
type ResultType = 'value' | 'logical';

const FUNCTIONS: Record<FnName, { params: ParamType[]; result: ResultType }> = {
  length: { params: ['value'], result: 'value' },
  count: { params: ['nodes'], result: 'value' },
  match: { params: ['value', 'value'], result: 'logical' },
  search: { params: ['value', 'value'], result: 'logical' },
  value: { params: ['nodes'], result: 'value' },
};

interface FnCall {
  name: FnName;
  args: Primary[];
  pos: number;
}

type Primary = { t: 'lit'; value: unknown; pos: number } | { t: 'query'; query: Query; pos: number } | { t: 'fn'; fn: FnCall; pos: number };

type CmpOp = '==' | '!=' | '<' | '<=' | '>' | '>=';

type Logical =
  | { t: 'or'; items: Logical[] }
  | { t: 'and'; items: Logical[] }
  | { t: 'not'; expr: Logical }
  | { t: 'exists'; query: Query }
  | { t: 'test'; fn: FnCall }
  | { t: 'cmp'; op: CmpOp; left: Primary; right: Primary };

/** A filter piece that may still become a function argument: a bare literal, query or call. */
type Parsed = Logical | { t: 'raw'; p: Primary };

export interface CompiledPath {
  readonly source: string;
  readonly query: Query;
}

// ---------- Parser ----------

const MAX_INT = 2 ** 53 - 1;
const MAX_DEPTH = 64;

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';
const isAlpha = (c: string | undefined) => c !== undefined && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));
const isBlank = (c: string | undefined) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

/** name-first in the RFC: a letter, "_", or any non-ASCII character. */
function isNameFirst(s: string, i: number): boolean {
  const c = s[i];
  if (c === undefined) return false;
  if (isAlpha(c) || c === '_') return true;
  const cp = s.codePointAt(i)!;
  // Lone surrogates aren't characters
  if (cp >= 0xd800 && cp <= 0xdfff) return false;
  return cp >= 0x80;
}

const describe = (s: string, i: number) => (i >= s.length ? 'the end' : `“${String.fromCodePoint(s.codePointAt(i)!)}”`);

class Parser {
  i = 0;
  depth = 0;
  constructor(readonly s: string) {}

  fail(msg: string, pos = this.i): never {
    throw new JsonPathError(msg, pos);
  }

  ws() {
    while (isBlank(this.s[this.i])) this.i++;
  }

  enter() {
    if (++this.depth > MAX_DEPTH) this.fail('The expression is nested too deeply');
  }

  parseRoot(): Query {
    if (!this.s.length) this.fail('Enter an expression starting with $');
    if (isBlank(this.s[0])) this.fail('Remove the space at the start: the expression must begin with $');
    if (this.s[0] !== '$') {
      this.fail(this.s[0] === '@' ? 'The expression must start with $; @ is only used inside a filter' : 'The expression must start with $', 0);
    }
    this.i = 1;
    const q = this.parseQueryRest('$');
    if (this.i < this.s.length) {
      if (isBlank(this.s[this.i])) {
        const at = this.i;
        this.ws();
        if (this.i >= this.s.length) this.fail('Remove the space at the end of the expression', at);
      }
      this.fail(`Unexpected ${describe(this.s, this.i)}`);
    }
    return q;
  }

  /** The segments after $ or @. */
  parseQueryRest(root: '$' | '@'): Query {
    const segments: Segment[] = [];
    for (;;) {
      const save = this.i;
      this.ws();
      const c = this.s[this.i];
      if (c === '[') {
        segments.push({ descendant: false, selectors: this.parseBracket() });
      } else if (c === '.' && this.s[this.i + 1] === '.') {
        this.i += 2;
        const d = this.s[this.i];
        if (d === '[') segments.push({ descendant: true, selectors: this.parseBracket() });
        else if (d === '*') {
          this.i++;
          segments.push({ descendant: true, selectors: [{ t: 'wild' }] });
        } else if (isNameFirst(this.s, this.i)) segments.push({ descendant: true, selectors: [{ t: 'name', name: this.parseShorthand() }] });
        else this.fail(isBlank(d) ? 'No space is allowed after “..”' : 'Expected a name, * or [ after “..”');
      } else if (c === '.') {
        this.i++;
        const d = this.s[this.i];
        if (d === '*') {
          this.i++;
          segments.push({ descendant: false, selectors: [{ t: 'wild' }] });
        } else if (isNameFirst(this.s, this.i)) segments.push({ descendant: false, selectors: [{ t: 'name', name: this.parseShorthand() }] });
        else if (isDigit(d)) this.fail(`Use brackets for an index: [${this.s.slice(this.i).match(/^\d+/)![0]}]`);
        else if (d === '"' || d === "'") this.fail('Use brackets for a quoted name: [\'name\']');
        else this.fail(isBlank(d) ? 'No space is allowed after “.”' : 'Expected a name or * after “.”');
      } else {
        this.i = save;
        break;
      }
    }
    const singular = segments.every((sg) => !sg.descendant && sg.selectors.length === 1 && (sg.selectors[0]!.t === 'name' || sg.selectors[0]!.t === 'index'));
    return { root, segments, singular };
  }

  parseShorthand(): string {
    const start = this.i;
    while (this.i < this.s.length && (isNameFirst(this.s, this.i) || isDigit(this.s[this.i]))) {
      this.i += this.s.codePointAt(this.i)! > 0xffff ? 2 : 1;
    }
    return this.s.slice(start, this.i);
  }

  parseBracket(): Selector[] {
    this.i++; // [
    this.ws();
    const selectors = [this.parseSelector()];
    for (;;) {
      this.ws();
      const c = this.s[this.i];
      if (c === ',') {
        this.i++;
        this.ws();
        selectors.push(this.parseSelector());
      } else if (c === ']') {
        this.i++;
        return selectors;
      } else if (c === undefined) {
        this.fail('Missing “]”');
      } else {
        this.fail(`Expected “,” or “]” but found ${describe(this.s, this.i)}`);
      }
    }
  }

  parseSelector(): Selector {
    const c = this.s[this.i];
    if (c === "'" || c === '"') return { t: 'name', name: this.parseString() };
    if (c === '*') {
      this.i++;
      return { t: 'wild' };
    }
    if (c === '?') {
      this.i++;
      this.ws();
      this.enter();
      const expr = this.toLogical(this.parseOr());
      this.depth--;
      return { t: 'filter', expr };
    }
    if (c === '-' || isDigit(c) || c === ':') {
      const start = c === ':' ? null : this.parseInt();
      this.ws();
      if (this.s[this.i] !== ':') {
        if (start === null) this.fail('Expected an index');
        return { t: 'index', index: start };
      }
      this.i++;
      this.ws();
      const end = this.s[this.i] === '-' || isDigit(this.s[this.i]) ? this.parseInt() : null;
      this.ws();
      let step: number | null = null;
      if (this.s[this.i] === ':') {
        this.i++;
        this.ws();
        step = this.s[this.i] === '-' || isDigit(this.s[this.i]) ? this.parseInt() : null;
      }
      return { t: 'slice', start, end, step };
    }
    if (c === undefined) this.fail('Missing “]”');
    if (c === ']') this.fail('Empty brackets: put a name, index, slice, * or filter inside');
    if (isNameFirst(this.s, this.i)) {
      const at = this.i;
      const name = this.parseShorthand();
      this.fail(`Names in brackets need quotes: ['${name}']`, at);
    }
    this.fail(`Expected a selector (a quoted name, index, slice, * or ?filter) but found ${describe(this.s, this.i)}`);
  }

  parseInt(): number {
    const start = this.i;
    let neg = false;
    if (this.s[this.i] === '-') {
      neg = true;
      this.i++;
    }
    const digitsStart = this.i;
    while (isDigit(this.s[this.i])) this.i++;
    const digits = this.s.slice(digitsStart, this.i);
    if (!digits) this.fail('Expected a number after “-”');
    if (digits.length > 1 && digits[0] === '0') this.fail('Numbers can’t have leading zeros', start);
    if (neg && digits === '0') this.fail('-0 isn’t a valid index; use 0', start);
    if (this.s[this.i] === '.' && isDigit(this.s[this.i + 1])) this.fail('Indexes must be whole numbers', start);
    const n = Number(digits);
    if (n > MAX_INT) this.fail('The number is too large for an index', start);
    return neg ? -n : n;
  }

  parseString(): string {
    const quote = this.s[this.i]!;
    const start = this.i;
    this.i++;
    let out = '';
    for (;;) {
      const c = this.s[this.i];
      if (c === undefined) this.fail('This string has no closing quote', start);
      if (c === quote) {
        this.i++;
        return out;
      }
      if (c === '\\') {
        const e = this.s[this.i + 1];
        const simple: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '/': '/', '\\': '\\' };
        if (e !== undefined && e in simple) {
          out += simple[e];
          this.i += 2;
        } else if (e === quote) {
          out += quote;
          this.i += 2;
        } else if (e === 'u') {
          const hi = this.hex4(this.i + 2);
          this.i += 6;
          if (hi >= 0xdc00 && hi <= 0xdfff) this.fail('A low surrogate \\u escape must follow a high one', this.i - 6);
          if (hi >= 0xd800 && hi <= 0xdbff) {
            if (this.s[this.i] !== '\\' || this.s[this.i + 1] !== 'u') this.fail('A high surrogate \\u escape must be followed by a low one', this.i - 6);
            const lo = this.hex4(this.i + 2);
            if (lo < 0xdc00 || lo > 0xdfff) this.fail('A high surrogate \\u escape must be followed by a low one', this.i);
            this.i += 6;
            out += String.fromCharCode(hi, lo);
          } else {
            out += String.fromCharCode(hi);
          }
        } else {
          this.fail(e === undefined ? 'This string has no closing quote' : `“\\${e}” isn’t a valid escape in a ${quote === "'" ? 'single' : 'double'}-quoted string`);
        }
        continue;
      }
      if (c.charCodeAt(0) < 0x20) this.fail('Control characters such as tabs and newlines must be escaped in strings');
      out += c;
      this.i++;
    }
  }

  hex4(at: number): number {
    const h = this.s.slice(at, at + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(h)) this.fail('\\u needs four hex digits', at - 2);
    return parseInt(h, 16);
  }

  // ----- Filters -----

  parseOr(): Parsed {
    const first = this.parseAnd();
    this.ws();
    if (!this.s.startsWith('||', this.i)) return first;
    const items = [this.toLogical(first)];
    while (this.s.startsWith('||', this.i)) {
      this.i += 2;
      this.ws();
      items.push(this.toLogical(this.parseAnd()));
      this.ws();
    }
    return { t: 'or', items };
  }

  parseAnd(): Parsed {
    const first = this.parseBasic();
    this.ws();
    if (!this.s.startsWith('&&', this.i)) return first;
    const items = [this.toLogical(first)];
    while (this.s.startsWith('&&', this.i)) {
      this.i += 2;
      this.ws();
      items.push(this.toLogical(this.parseBasic()));
      this.ws();
    }
    return { t: 'and', items };
  }

  parseBasic(): Parsed {
    this.ws();
    const c = this.s[this.i];
    if (c === '!') {
      this.i++;
      this.ws();
      if (this.s[this.i] === '(') return { t: 'not', expr: this.parseParen() };
      const p = this.parsePrimary();
      const save = this.i;
      this.ws();
      if (this.peekOp()) this.fail('“!” applies to a test, not a comparison: wrap the comparison in parentheses, as in !(@.a == 1)', save);
      this.i = save;
      return { t: 'not', expr: this.toTest(p) };
    }
    if (c === '(') return this.parseParen();
    const left = this.parsePrimary();
    const save = this.i;
    this.ws();
    const op = this.peekOp();
    if (!op) {
      if (this.s[this.i] === '=') this.fail('Use == to compare');
      this.i = save;
      return { t: 'raw', p: left };
    }
    this.i += op.length;
    this.ws();
    const right = this.parsePrimary();
    this.checkComparable(left);
    this.checkComparable(right);
    return { t: 'cmp', op, left, right };
  }

  parseParen(): Logical {
    const open = this.i;
    this.i++; // (
    this.enter();
    this.ws();
    const e = this.toLogical(this.parseOr());
    this.ws();
    if (this.s[this.i] !== ')') this.fail(this.i >= this.s.length ? 'Missing “)”' : `Expected “)” but found ${describe(this.s, this.i)}`, this.i >= this.s.length ? open : this.i);
    this.i++;
    this.depth--;
    return e;
  }

  peekOp(): CmpOp | null {
    for (const op of ['==', '!=', '<=', '>=', '<', '>'] as const) if (this.s.startsWith(op, this.i)) return op;
    return null;
  }

  parsePrimary(): Primary {
    const pos = this.i;
    const c = this.s[this.i];
    if (c === '@' || c === '$') {
      this.i++;
      this.enter();
      const query = this.parseQueryRest(c);
      this.depth--;
      return { t: 'query', query, pos };
    }
    if (c === "'" || c === '"') return { t: 'lit', value: this.parseString(), pos };
    if (c === '-' || isDigit(c)) {
      const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?/.exec(this.s.slice(this.i, this.i + 400));
      if (!m) this.fail('Expected a number');
      this.i += m[0].length;
      if (isDigit(this.s[this.i]) || this.s[this.i] === '.') this.fail('Invalid number (no leading zeros, and digits after the dot)', pos);
      return { t: 'lit', value: Number(m[0]), pos };
    }
    if (isAlpha(c)) {
      const m = /^[a-zA-Z][a-zA-Z0-9_]*/.exec(this.s.slice(this.i, this.i + 200))!;
      const word = m[0];
      if (this.s[this.i + word.length] === '(') return { t: 'fn', fn: this.parseCall(word), pos };
      if (word === 'true' || word === 'false' || word === 'null') {
        this.i += word.length;
        return { t: 'lit', value: word === 'true' ? true : word === 'false' ? false : null, pos };
      }
      if (/^(?:True|False|TRUE|FALSE|Null|NULL)$/.test(word)) this.fail(`Literals are lowercase: ${word.toLowerCase()}`);
      this.fail(`Unknown name “${word}”: queries start with @ or $, and strings need quotes`);
    }
    if (c === undefined) this.fail('The filter is incomplete');
    this.fail(`Expected @, $, a literal or a function but found ${describe(this.s, this.i)}`);
  }

  parseCall(name: string): FnCall {
    const pos = this.i;
    if (!(name in FUNCTIONS)) {
      this.fail(`Unknown function ${name}(); the standard ones are length(), count(), match(), search() and value()`);
    }
    const fnName = name as FnName;
    const def = FUNCTIONS[fnName];
    this.i += name.length + 1;
    this.enter();
    this.ws();
    const args: Primary[] = [];
    if (this.s[this.i] !== ')') {
      for (;;) {
        const argPos = this.i;
        const a = this.parseOr();
        if (a.t !== 'raw') this.fail(`${name}() takes ${def.params.length === 1 ? 'a value or query' : 'values'}, not a test`, argPos);
        args.push(a.p);
        this.ws();
        if (this.s[this.i] === ',') {
          this.i++;
          this.ws();
          continue;
        }
        if (this.s[this.i] === ')') break;
        this.fail(this.i >= this.s.length ? `Missing “)” for ${name}()` : `Expected “,” or “)” but found ${describe(this.s, this.i)}`);
      }
    }
    this.i++; // )
    this.depth--;
    if (args.length !== def.params.length) {
      const n = def.params.length;
      this.fail(`${name}() takes ${n} argument${n === 1 ? '' : 's'}, not ${args.length}`, pos);
    }
    def.params.forEach((type, k) => {
      const a = args[k]!;
      if (type === 'nodes') {
        if (a.t !== 'query') this.fail(`${name}() takes a query, such as ${name}(@.items[*])`, a.pos);
      } else if (a.t === 'query' && !a.query.singular) {
        this.fail(
          `${name}() needs a single value, but this query can match many nodes (it uses *, .., a slice, a filter or a union)${name === 'length' ? '; count() counts nodes' : ''}`,
          a.pos,
        );
      } else if (a.t === 'fn' && FUNCTIONS[a.fn.name].result !== 'value') {
        this.fail(`${a.fn.name}() returns true or false, which can’t be passed to ${name}()`, a.pos);
      }
    });
    return { name: fnName, args, pos };
  }

  checkComparable(p: Primary) {
    if (p.t === 'query' && !p.query.singular) {
      this.fail('Only single-value queries (names and indexes) can be compared; this one can match many nodes. Try count() or value()', p.pos);
    }
    if (p.t === 'fn' && FUNCTIONS[p.fn.name].result !== 'value') {
      this.fail(`${p.fn.name}() returns true or false and can’t be compared; use it on its own`, p.pos);
    }
  }

  toTest(p: Primary): Logical {
    if (p.t === 'query') return { t: 'exists', query: p.query };
    if (p.t === 'fn') {
      if (FUNCTIONS[p.fn.name].result === 'logical') return { t: 'test', fn: p.fn };
      this.fail(`${p.fn.name}() returns a value, not true or false: compare it, as in ${p.fn.name}(…) > 0`, p.pos);
    }
    this.fail('A literal on its own isn’t a test; compare it with something, as in @.active == true', p.pos);
  }

  toLogical(e: Parsed): Logical {
    return e.t === 'raw' ? this.toTest(e.p) : e;
  }
}

export function compileJsonPath(expression: string): CompiledPath {
  return { source: expression, query: new Parser(expression).parseRoot() };
}

// ---------- Evaluation ----------

interface PathNode {
  value: unknown;
  parent: PathNode | null;
  key: string | number | null;
  path?: string;
}

const NOTHING: unique symbol = Symbol('nothing');
type Val = unknown | typeof NOTHING;

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof JsonNumber);
const isNum = (v: unknown): v is number | JsonNumber => typeof v === 'number' || v instanceof JsonNumber;
const num = (v: number | JsonNumber) => (typeof v === 'number' ? v : Number(v.source));

function children(n: PathNode, out: PathNode[]) {
  const v = n.value;
  if (Array.isArray(v)) {
    for (let k = 0; k < v.length; k++) out.push({ value: v[k], parent: n, key: k });
  } else if (isObject(v)) {
    for (const k of Object.keys(v)) out.push({ value: v[k], parent: n, key: k });
  }
}

class Evaluator {
  readonly regexCache = new Map<string, IRegexp | null>();
  readonly warnings = new Set<string>();
  constructor(readonly root: PathNode) {}

  query(q: Query, current: PathNode): PathNode[] {
    let nodes = [q.root === '$' ? this.root : current];
    for (const seg of q.segments) {
      const out: PathNode[] = [];
      for (const n of nodes) {
        if (!seg.descendant) {
          for (const sel of seg.selectors) this.select(sel, n, out);
          continue;
        }
        // The node itself, then its descendants, each before its own children, arrays in order
        const stack = [n];
        while (stack.length) {
          const d = stack.pop()!;
          for (const sel of seg.selectors) this.select(sel, d, out);
          const kids: PathNode[] = [];
          children(d, kids);
          for (let k = kids.length - 1; k >= 0; k--) stack.push(kids[k]!);
        }
      }
      nodes = out;
    }
    return nodes;
  }

  select(sel: Selector, n: PathNode, out: PathNode[]) {
    const v = n.value;
    switch (sel.t) {
      case 'name':
        if (isObject(v) && hasOwn(v, sel.name)) out.push({ value: v[sel.name], parent: n, key: sel.name });
        return;
      case 'wild':
        children(n, out);
        return;
      case 'index': {
        if (!Array.isArray(v)) return;
        const k = sel.index < 0 ? v.length + sel.index : sel.index;
        if (k >= 0 && k < v.length) out.push({ value: v[k], parent: n, key: k });
        return;
      }
      case 'slice': {
        if (!Array.isArray(v)) return;
        const len = v.length;
        const step = sel.step ?? 1;
        if (step === 0) return;
        const norm = (i: number) => (i >= 0 ? i : len + i);
        if (step > 0) {
          const lower = Math.min(Math.max(norm(sel.start ?? 0), 0), len);
          const upper = Math.min(Math.max(norm(sel.end ?? len), 0), len);
          for (let k = lower; k < upper; k += step) out.push({ value: v[k], parent: n, key: k });
        } else {
          const upper = Math.min(Math.max(norm(sel.start ?? len - 1), -1), len - 1);
          const lower = Math.min(Math.max(sel.end === null ? -1 : norm(sel.end), -1), len - 1);
          for (let k = upper; lower < k; k += step) out.push({ value: v[k], parent: n, key: k });
        }
        return;
      }
      case 'filter': {
        const kids: PathNode[] = [];
        children(n, kids);
        for (const c of kids) if (this.test(sel.expr, c)) out.push(c);
        return;
      }
    }
  }

  test(e: Logical, cur: PathNode): boolean {
    switch (e.t) {
      case 'or':
        return e.items.some((x) => this.test(x, cur));
      case 'and':
        return e.items.every((x) => this.test(x, cur));
      case 'not':
        return !this.test(e.expr, cur);
      case 'exists':
        return this.query(e.query, cur).length > 0;
      case 'test':
        return this.call(e.fn, cur) === true;
      case 'cmp':
        return compare(e.op, this.value(e.left, cur), this.value(e.right, cur));
    }
  }

  value(p: Primary, cur: PathNode): Val {
    if (p.t === 'lit') return p.value;
    if (p.t === 'query') {
      const nodes = this.query(p.query, cur);
      return nodes.length ? nodes[0]!.value : NOTHING;
    }
    return this.call(p.fn, cur);
  }

  call(fn: FnCall, cur: PathNode): Val {
    const [a, b] = fn.args;
    switch (fn.name) {
      case 'length': {
        const v = this.value(a!, cur);
        if (typeof v === 'string') return [...v].length;
        if (Array.isArray(v)) return v.length;
        if (isObject(v)) return Object.keys(v).length;
        return NOTHING;
      }
      case 'count':
        return a!.t === 'query' ? this.query(a!.query, cur).length : NOTHING;
      case 'value': {
        if (a!.t !== 'query') return NOTHING;
        const nodes = this.query(a!.query, cur);
        return nodes.length === 1 ? nodes[0]!.value : NOTHING;
      }
      case 'match':
      case 'search': {
        const s = this.value(a!, cur);
        const pattern = this.value(b!, cur);
        if (typeof s !== 'string' || typeof pattern !== 'string') return false;
        const re = this.regex(pattern, fn.name);
        if (!re) return false;
        return fn.name === 'match' ? re.matches(s) : re.search(s);
      }
    }
  }

  regex(pattern: string, fn: string): IRegexp | null {
    if (this.regexCache.has(pattern)) return this.regexCache.get(pattern)!;
    let re: IRegexp | null = null;
    try {
      re = compileIRegexp(pattern);
    } catch (e) {
      this.warnings.add(`${fn}(): “${pattern.length > 40 ? `${pattern.slice(0, 40)}…` : pattern}” isn’t a valid I-Regexp (${(e as Error).message}), so it matches nothing`);
    }
    this.regexCache.set(pattern, re);
    return re;
  }
}

/** Compares code point by code point (JS < compares UTF-16 units, which orders some characters differently). */
function lessString(a: string, b: string): boolean {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const x = a.codePointAt(i)!;
    const y = b.codePointAt(j)!;
    if (x !== y) return x < y;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  return i >= a.length && j < b.length;
}

function equal(a: Val, b: Val): boolean {
  if (a === NOTHING || b === NOTHING) return a === b;
  if (isNum(a) && isNum(b)) return num(a) === num(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, k) => equal(x, b[k]));
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    return ka.every((k) => hasOwn(b, k) && equal(a[k], b[k]));
  }
  return a === b;
}

function less(a: Val, b: Val): boolean {
  if (isNum(a) && isNum(b)) return num(a) < num(b);
  if (typeof a === 'string' && typeof b === 'string') return lessString(a, b);
  return false;
}

function compare(op: CmpOp, a: Val, b: Val): boolean {
  switch (op) {
    case '==':
      return equal(a, b);
    case '!=':
      return !equal(a, b);
    case '<':
      return less(a, b);
    case '<=':
      return less(a, b) || equal(a, b);
    case '>':
      return less(b, a);
    case '>=':
      return less(b, a) || equal(a, b);
  }
}

// ---------- Normalized paths ----------

function escapeName(name: string): string {
  let out = '';
  for (const ch of name) {
    const c = ch.charCodeAt(0);
    if (ch === "'") out += "\\'";
    else if (ch === '\\') out += '\\\\';
    else if (c === 8) out += '\\b';
    else if (c === 12) out += '\\f';
    else if (c === 10) out += '\\n';
    else if (c === 13) out += '\\r';
    else if (c === 9) out += '\\t';
    else if (c < 0x20) out += `\\u${c.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return out;
}

function pathOf(n: PathNode): string {
  if (n.path !== undefined) return n.path;
  // Iterative, so very deep documents don't overflow the stack
  const chain: PathNode[] = [];
  let x: PathNode | null = n;
  while (x && x.path === undefined) {
    chain.push(x);
    x = x.parent;
  }
  let p = x ? x.path! : '';
  for (let k = chain.length - 1; k >= 0; k--) {
    const c = chain[k]!;
    p = c.parent === null ? '$' : typeof c.key === 'number' ? `${p}[${c.key}]` : `${p}['${escapeName(c.key!)}']`;
    c.path = p;
  }
  return p;
}

export interface JsonPathMatch {
  /** Normalized path, like $['store']['book'][0]. */
  path: string;
  value: unknown;
}

export type JsonPathResult =
  | { ok: true; matches: JsonPathMatch[]; warnings: string[] }
  | { ok: false; error: string; /** 0-based offset in the expression */ pos: number };

/** Runs a compiled expression against a parsed JSON value. */
export function evaluateJsonPath(compiled: CompiledPath, doc: unknown): { matches: JsonPathMatch[]; warnings: string[] } {
  const root: PathNode = { value: doc, parent: null, key: null };
  const ev = new Evaluator(root);
  const nodes = ev.query(compiled.query, root);
  return { matches: nodes.map((n) => ({ path: pathOf(n), value: n.value })), warnings: [...ev.warnings] };
}

/** Parses and runs an expression; syntax errors come back with their position instead of throwing. */
export function jsonPath(doc: unknown, expression: string): JsonPathResult {
  let compiled: CompiledPath;
  try {
    compiled = compileJsonPath(expression);
  } catch (e) {
    if (e instanceof JsonPathError) return { ok: false, error: e.message, pos: e.pos };
    throw e;
  }
  try {
    return { ok: true, ...evaluateJsonPath(compiled, doc) };
  } catch (e) {
    if (e instanceof RangeError) return { ok: false, error: 'The document is too deeply nested to search', pos: 0 };
    throw e;
  }
}
