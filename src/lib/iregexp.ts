/**
 * I-Regexp (RFC 9485), the regular expression flavour JSONPath's match() and
 * search() use, compiled to a Thompson NFA and run by tracking the set of
 * live states. There is no backtracking, so matching takes time proportional
 * to (text length) x (pattern size) whatever the pattern, and a pattern like
 * (a+)+$ can't hang the page.
 */

type Pred = (cp: number) => boolean;

type Node =
  | { t: 'char'; pred: Pred }
  | { t: 'cat'; items: Node[] }
  | { t: 'alt'; items: Node[] }
  | { t: 'rep'; node: Node; min: number; max: number }; // max = Infinity for * and +

export class IRegexpError extends Error {}

const MAX_STATES = 20_000;
const MAX_REPEAT = 1000;

const CATEGORIES = new Set(
  'L Lu Ll Lt Lm Lo M Mn Mc Me N Nd Nl No P Pc Pd Ps Pe Pi Pf Po Z Zs Zl Zp S Sm Sc Sk So C Cc Cf Cn Co'.split(' '),
);
const catCache = new Map<string, RegExp>();
function category(name: string, negate: boolean): Pred {
  let re = catCache.get(name);
  if (!re) {
    // Only names from the fixed list above reach here
    re = new RegExp(`^\\p{${name}}$`, 'u');
    catCache.set(name, re);
  }
  const r = re;
  return negate ? (cp) => !r.test(String.fromCodePoint(cp)) : (cp) => r.test(String.fromCodePoint(cp));
}

const SINGLE_ESC: Record<string, number> = { n: 10, r: 13, t: 9 };
for (const c of '()*+-.?[\\]^{|}') SINGLE_ESC[c] = c.codePointAt(0)!;

class Parser {
  i = 0;
  readonly cps: number[];
  constructor(src: string) {
    this.cps = Array.from(src, (c) => c.codePointAt(0)!);
  }
  peek(): number | undefined {
    return this.cps[this.i];
  }
  fail(msg: string): never {
    throw new IRegexpError(`${msg} at character ${this.i + 1}`);
  }

  parse(): Node {
    const n = this.alt();
    if (this.i < this.cps.length) this.fail('Unexpected “)”');
    return n;
  }

  alt(): Node {
    const items = [this.branch()];
    while (this.peek() === 0x7c /* | */) {
      this.i++;
      items.push(this.branch());
    }
    return items.length === 1 ? items[0]! : { t: 'alt', items };
  }

  branch(): Node {
    const items: Node[] = [];
    for (;;) {
      const c = this.peek();
      if (c === undefined || c === 0x7c || c === 0x29 /* ) */) break;
      let atom = this.atom();
      atom = this.quantifier(atom);
      items.push(atom);
    }
    return items.length === 1 ? items[0]! : { t: 'cat', items };
  }

  quantifier(atom: Node): Node {
    const c = this.peek();
    if (c === 0x2a) return this.i++, { t: 'rep', node: atom, min: 0, max: Infinity };
    if (c === 0x2b) return this.i++, { t: 'rep', node: atom, min: 1, max: Infinity };
    if (c === 0x3f) return this.i++, { t: 'rep', node: atom, min: 0, max: 1 };
    if (c !== 0x7b /* { */) return atom;
    this.i++;
    const min = this.digits();
    let max = min;
    if (this.peek() === 0x2c /* , */) {
      this.i++;
      max = this.peek() === 0x7d ? Infinity : this.digits();
    }
    if (this.peek() !== 0x7d) this.fail('Expected “}”');
    this.i++;
    if (max < min) this.fail('The quantifier’s maximum is below its minimum');
    if (min > MAX_REPEAT || (max !== Infinity && max > MAX_REPEAT)) this.fail(`Counts above ${MAX_REPEAT} aren’t supported`);
    const next = this.peek();
    if (next === 0x2a || next === 0x2b || next === 0x3f || next === 0x7b) this.fail('Quantifiers can’t follow each other');
    return { t: 'rep', node: atom, min, max };
  }

  digits(): number {
    const start = this.i;
    while (this.peek() !== undefined && this.peek()! >= 0x30 && this.peek()! <= 0x39) this.i++;
    if (this.i === start) this.fail('Expected a number');
    return Number(String.fromCodePoint(...this.cps.slice(start, this.i)));
  }

  atom(): Node {
    const c = this.peek()!;
    if (c === 0x28 /* ( */) {
      this.i++;
      const inner = this.alt();
      if (this.peek() !== 0x29) this.fail('Expected “)”');
      this.i++;
      return inner;
    }
    if (c === 0x2e /* . */) {
      this.i++;
      return { t: 'char', pred: (cp) => cp !== 10 && cp !== 13 };
    }
    if (c === 0x5b /* [ */) return { t: 'char', pred: this.charClass() };
    if (c === 0x5c /* \ */) {
      const e = this.escape();
      return { t: 'char', pred: typeof e === 'number' ? (cp) => cp === e : e };
    }
    if (c === 0x2a || c === 0x2b || c === 0x3f || c === 0x7b) this.fail('Nothing to repeat');
    if (c === 0x5d || c === 0x7d) this.fail(`“${String.fromCodePoint(c)}” must be escaped`);
    this.i++;
    return { t: 'char', pred: (cp) => cp === c };
  }

  /** After a backslash: a single character, or a \p{..} / \P{..} category. */
  escape(): number | Pred {
    this.i++;
    const c = this.peek();
    if (c === undefined) this.fail('A pattern can’t end with “\\”');
    const ch = String.fromCodePoint(c);
    if (ch === 'p' || ch === 'P') {
      this.i++;
      if (this.peek() !== 0x7b) this.fail('Expected “{” after \\p');
      this.i++;
      const start = this.i;
      while (this.peek() !== undefined && this.peek() !== 0x7d) this.i++;
      const name = String.fromCodePoint(...this.cps.slice(start, this.i));
      if (this.peek() !== 0x7d) this.fail('Expected “}”');
      this.i++;
      if (!CATEGORIES.has(name)) this.fail(`Unknown category \\p{${name}}`);
      return category(name, ch === 'P');
    }
    const cp = SINGLE_ESC[ch];
    if (cp === undefined) this.fail(`“\\${ch}” isn’t an I-Regexp escape`);
    this.i++;
    return cp;
  }

  charClass(): Pred {
    this.i++; // [
    let negate = false;
    if (this.peek() === 0x5e /* ^ */) {
      negate = true;
      this.i++;
    }
    const ranges: [number, number][] = [];
    const preds: Pred[] = [];
    let first = true;
    for (;;) {
      const c = this.peek();
      if (c === undefined) this.fail('Unclosed “[”');
      if (c === 0x5d /* ] */ && !first) {
        this.i++;
        break;
      }
      if (c === 0x2d /* - */) {
        // A literal "-" only at the start or just before "]"
        if (first || this.cps[this.i + 1] === 0x5d) {
          this.i++;
          ranges.push([0x2d, 0x2d]);
          first = false;
          continue;
        }
        this.fail('“-” must be escaped here');
      }
      first = false;
      const lo = this.classChar();
      if (typeof lo !== 'number') {
        preds.push(lo);
        continue;
      }
      if (this.peek() === 0x2d && this.cps[this.i + 1] !== 0x5d && this.cps[this.i + 1] !== undefined) {
        this.i++;
        const hi = this.classChar();
        if (typeof hi !== 'number') this.fail('A range can’t end with a category');
        if (hi < lo) this.fail('The range is backwards');
        ranges.push([lo, hi]);
      } else {
        ranges.push([lo, lo]);
      }
    }
    const inClass = (cp: number) => ranges.some(([a, b]) => cp >= a && cp <= b) || preds.some((p) => p(cp));
    return negate ? (cp) => !inClass(cp) : inClass;
  }

  classChar(): number | Pred {
    const c = this.peek()!;
    if (c === 0x5c) return this.escape();
    if (c === 0x5b || c === 0x5d) this.fail(`“${String.fromCodePoint(c)}” must be escaped inside [ ]`);
    this.i++;
    return c;
  }
}

/** A compiled pattern: states as parallel arrays. kind 0 = char, 1 = split, 2 = match. */
interface Nfa {
  kind: number[];
  pred: (Pred | null)[];
  out1: number[];
  out2: number[];
  start: number;
}

function compile(root: Node): Nfa {
  const nfa: Nfa = { kind: [], pred: [], out1: [], out2: [], start: 0 };
  const add = (kind: number, pred: Pred | null, o1: number, o2: number) => {
    if (nfa.kind.length >= MAX_STATES) throw new IRegexpError('The pattern is too large');
    nfa.kind.push(kind);
    nfa.pred.push(pred);
    nfa.out1.push(o1);
    nfa.out2.push(o2);
    return nfa.kind.length - 1;
  };
  const match = add(2, null, -1, -1);
  // Built from the end: each node is compiled knowing the state that follows it
  const build = (n: Node, next: number): number => {
    switch (n.t) {
      case 'char':
        return add(0, n.pred, next, -1);
      case 'cat': {
        let s = next;
        for (let k = n.items.length - 1; k >= 0; k--) s = build(n.items[k]!, s);
        return s;
      }
      case 'alt': {
        let s = build(n.items[n.items.length - 1]!, next);
        for (let k = n.items.length - 2; k >= 0; k--) s = add(1, null, build(n.items[k]!, next), s);
        return s;
      }
      case 'rep': {
        let s = next;
        if (n.max === Infinity) {
          const loop = add(1, null, -1, next);
          nfa.out1[loop] = build(n.node, loop);
          s = loop;
        } else {
          for (let k = 0; k < n.max - n.min; k++) s = add(1, null, build(n.node, s), s);
        }
        for (let k = 0; k < n.min; k++) s = build(n.node, s);
        return s;
      }
    }
  };
  nfa.start = build(root, match);
  return nfa;
}

export interface IRegexp {
  /** The whole string matches. */
  matches(s: string): boolean;
  /** Some substring matches. */
  search(s: string): boolean;
}

/** Compiles an I-Regexp pattern, or throws IRegexpError if it isn't one. */
export function compileIRegexp(pattern: string): IRegexp {
  const nfa = compile(new Parser(pattern).parse());
  const n = nfa.kind.length;
  const mark = new Int32Array(n).fill(-1);
  let gen = 0;
  const stack: number[] = [];

  /** Adds a state and everything reachable from it without reading a character. */
  const addClosure = (list: number[], s: number) => {
    stack.push(s);
    while (stack.length) {
      const x = stack.pop()!;
      if (mark[x] === gen) continue;
      mark[x] = gen;
      if (nfa.kind[x] === 1) {
        stack.push(nfa.out2[x]!, nfa.out1[x]!);
      } else {
        list.push(x);
      }
    }
  };

  const run = (s: string, anywhere: boolean): boolean => {
    gen++;
    let list: number[] = [];
    addClosure(list, nfa.start);
    const hasMatch = (l: number[]) => l.some((x) => nfa.kind[x] === 2);
    if (anywhere && hasMatch(list)) return true;
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      gen++;
      const next: number[] = [];
      for (const x of list) if (nfa.kind[x] === 0 && nfa.pred[x]!(cp)) addClosure(next, nfa.out1[x]!);
      if (anywhere) addClosure(next, nfa.start);
      list = next;
      if (anywhere && hasMatch(list)) return true;
      if (!anywhere && !list.length) return false;
    }
    return hasMatch(list);
  };

  return { matches: (s) => run(s, false), search: (s) => run(s, true) };
}
