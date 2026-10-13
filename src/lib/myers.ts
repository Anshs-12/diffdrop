/**
 * Myers' O(ND) difference algorithm, linear-space variant.
 *
 * Myers (1986) describes finding the "middle snake" of the shortest edit path by
 * searching forwards from the start and backwards from the end at the same time,
 * then recursing on the two halves. This needs memory proportional to the input
 * instead of to D² (the simpler version keeps a snapshot of every step), and
 * still produces a shortest edit script. git's xdiff uses the same approach.
 *
 * Lines are mapped to integer ids first so every comparison is an integer compare.
 *
 * Two safeguards keep very large inputs fast, at the cost of exact minimality
 * only where they kick in (both are what git does too):
 *  - Inputs above EXACT_SIZE lines are first anchored on lines that occur exactly
 *    once on each side (the "patience" idea), and the gaps between anchors are
 *    diffed separately.
 *  - Within a large gap, the search is capped at COST_LIMIT steps; past that, it
 *    splits at the furthest point reached instead of searching on.
 */

export interface DiffMove {
  line: string;
  moveType: 'unchanged' | 'delete' | 'add';
}

export const OP_EQUAL = 0;
export const OP_DELETE = 1;
export const OP_INSERT = 2;

/** Inputs up to this many lines (both sides together) always get an exact shortest script. */
const EXACT_SIZE = 10_000;
/** Search depth limit for sub-problems larger than EXACT_SIZE. */
const COST_LIMIT = 1024;

/** Map each distinct string to a small integer, shared across both sides. */
export function intern(a: readonly string[], b: readonly string[]): { a: Int32Array; b: Int32Array; distinct: number } {
  const ids = new Map<string, number>();
  const map = (lines: readonly string[]) => {
    const out = new Int32Array(lines.length);
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i]!;
      let id = ids.get(s);
      if (id === undefined) {
        id = ids.size;
        ids.set(s, id);
      }
      out[i] = id;
    }
    return out;
  };
  const ia = map(a);
  const ib = map(b);
  return { a: ia, b: ib, distinct: ids.size };
}

/** Grow-only scratch buffers for the forward and backward search, reused across calls. */
let vfBuf = new Int32Array(0);
let vbBuf = new Int32Array(0);

/**
 * Find a point on a shortest edit path through A[aLo..aHi) × B[bLo..bHi) that splits
 * it into two smaller problems (the end of the middle snake's forward half).
 * Returns null when the two ranges have nothing in common.
 */
function bisect(
  A: Int32Array,
  aLo: number,
  aHi: number,
  B: Int32Array,
  bLo: number,
  bHi: number,
  limit: number,
): [number, number] | null {
  const n = aHi - aLo;
  const m = bHi - bLo;
  const maxD = Math.ceil((n + m) / 2);
  const off = maxD;
  const len = 2 * maxD + 2;
  if (vfBuf.length < len) {
    vfBuf = new Int32Array(len * 2);
    vbBuf = new Int32Array(len * 2);
  }
  const vf = vfBuf;
  const vb = vbBuf;
  vf.fill(-1, 0, len);
  vb.fill(-1, 0, len);
  vf[off + 1] = 0;
  vb[off + 1] = 0;

  const delta = n - m;
  const front = (delta & 1) !== 0;
  // Diagonals that ran off the grid are skipped from then on
  let k1start = 0;
  let k1end = 0;
  let k2start = 0;
  let k2end = 0;
  // Furthest point reached forwards, for the cost-limit split
  let bestX = 0;
  let bestY = 0;

  for (let d = 0; d <= maxD; d++) {
    if (d > limit) {
      if (bestX + bestY > 0 && (bestX < n || bestY < m)) return [aLo + bestX, bLo + bestY];
      return null;
    }

    for (let k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      const i1 = off + k1;
      let x1 = k1 === -d || (k1 !== d && vf[i1 - 1]! < vf[i1 + 1]!) ? vf[i1 + 1]! : vf[i1 - 1]! + 1;
      let y1 = x1 - k1;
      while (x1 < n && y1 < m && A[aLo + x1] === B[bLo + y1]) {
        x1++;
        y1++;
      }
      vf[i1] = x1;
      if (x1 > n) {
        k1end += 2;
      } else if (y1 > m) {
        k1start += 2;
      } else {
        if (x1 + y1 > bestX + bestY) {
          bestX = x1;
          bestY = y1;
        }
        if (front) {
          const i2 = off + delta - k1;
          if (i2 >= 0 && i2 < len && vb[i2] !== -1 && x1 >= n - vb[i2]!) return [aLo + x1, bLo + y1];
        }
      }
    }

    for (let k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      const i2 = off + k2;
      let x2 = k2 === -d || (k2 !== d && vb[i2 - 1]! < vb[i2 + 1]!) ? vb[i2 + 1]! : vb[i2 - 1]! + 1;
      let y2 = x2 - k2;
      while (x2 < n && y2 < m && A[aHi - 1 - x2] === B[bHi - 1 - y2]) {
        x2++;
        y2++;
      }
      vb[i2] = x2;
      if (x2 > n) {
        k2end += 2;
      } else if (y2 > m) {
        k2start += 2;
      } else if (!front) {
        const i1 = off + delta - k2;
        if (i1 >= 0 && i1 < len && vf[i1] !== -1) {
          const x1 = vf[i1]!;
          const y1 = x1 - (i1 - off);
          if (x1 >= n - x2) return [aLo + x1, bLo + y1];
        }
      }
    }
  }
  return null;
}

/** Lines unique on both sides, kept in an order increasing on both sides (longest such chain). */
function uniqueAnchors(A: Int32Array, B: Int32Array, distinct: number): Int32Array {
  const countA = new Int32Array(distinct);
  const countB = new Int32Array(distinct);
  const posB = new Int32Array(distinct);
  for (let i = 0; i < A.length; i++) countA[A[i]!]!++;
  for (let j = 0; j < B.length; j++) {
    countB[B[j]!]!++;
    posB[B[j]!] = j;
  }

  // Candidates in A order: (i, j) pairs of lines unique on both sides
  const candI: number[] = [];
  const candJ: number[] = [];
  for (let i = 0; i < A.length; i++) {
    const id = A[i]!;
    if (countA[id] === 1 && countB[id] === 1) {
      candI.push(i);
      candJ.push(posB[id]!);
    }
  }

  // Longest increasing subsequence on j (patience sorting), O(k log k)
  const k = candJ.length;
  const tails = new Int32Array(k); // index of candidate ending a chain of each length
  const prev = new Int32Array(k).fill(-1);
  let size = 0;
  for (let c = 0; c < k; c++) {
    const j = candJ[c]!;
    let lo = 0;
    let hi = size;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (candJ[tails[mid]!]! < j) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[c] = tails[lo - 1]!;
    tails[lo] = c;
    if (lo === size) size++;
  }
  const chain = new Int32Array(size * 2);
  let c = size > 0 ? tails[size - 1]! : -1;
  for (let p = size - 1; p >= 0; p--) {
    chain[p * 2] = candI[c]!;
    chain[p * 2 + 1] = candJ[c]!;
    c = prev[c]!;
  }
  return chain;
}

const TASK_RANGE = 0;
const TASK_EQUAL = 1;

/**
 * Diff two sequences of integer ids. Returns the edit script as ops
 * (OP_EQUAL / OP_DELETE / OP_INSERT), in order.
 */
export function diffIds(A: Int32Array, B: Int32Array, distinct: number): Uint8Array {
  const out = new Uint8Array(A.length + B.length);
  let o = 0;

  // Explicit stack of tasks so deep recursion can't overflow: [type, aLo, aHi, bLo, bHi]
  const stack: number[] = [];
  const push = (type: number, aLo: number, aHi: number, bLo: number, bHi: number) =>
    stack.push(type, aLo, aHi, bLo, bHi);

  // Nothing in common at all: the answer is "remove everything, add everything"
  if (A.length && B.length) {
    const inA = new Uint8Array(distinct);
    for (let i = 0; i < A.length; i++) inA[A[i]!] = 1;
    let shared = false;
    for (let j = 0; j < B.length && !shared; j++) shared = inA[B[j]!] === 1;
    if (!shared) {
      out.fill(OP_DELETE, 0, A.length);
      out.fill(OP_INSERT, A.length, A.length + B.length);
      return out;
    }
  }

  // Large inputs: split at unique anchors first, then diff the gaps between them
  if (A.length + B.length > EXACT_SIZE) {
    const chain = uniqueAnchors(A, B, distinct);
    const tasks: number[][] = [];
    let ai = 0;
    let bj = 0;
    for (let p = 0; p < chain.length; p += 2) {
      const i = chain[p]!;
      const j = chain[p + 1]!;
      tasks.push([TASK_RANGE, ai, i, bj, j], [TASK_EQUAL, i, i + 1, j, j + 1]);
      ai = i + 1;
      bj = j + 1;
    }
    tasks.push([TASK_RANGE, ai, A.length, bj, B.length]);
    for (let t = tasks.length - 1; t >= 0; t--) push(...(tasks[t] as [number, number, number, number, number]));
  } else {
    push(TASK_RANGE, 0, A.length, 0, B.length);
  }

  while (stack.length) {
    const bHi = stack.pop()!;
    const bLo = stack.pop()!;
    const aHi = stack.pop()!;
    let aLo = stack.pop()!;
    const type = stack.pop()!;

    if (type === TASK_EQUAL) {
      out.fill(OP_EQUAL, o, o + (aHi - aLo));
      o += aHi - aLo;
      continue;
    }

    // Common prefix
    let lo = bLo;
    while (aLo < aHi && lo < bHi && A[aLo] === B[lo]) {
      out[o++] = OP_EQUAL;
      aLo++;
      lo++;
    }
    // Common suffix (emitted after the middle, so queue it first)
    let ah = aHi;
    let bh = bHi;
    while (ah > aLo && bh > lo && A[ah - 1] === B[bh - 1]) {
      ah--;
      bh--;
    }
    if (aHi - ah > 0) push(TASK_EQUAL, ah, aHi, bh, bHi);

    if (aLo === ah) {
      out.fill(OP_INSERT, o, o + (bh - lo));
      o += bh - lo;
      continue;
    }
    if (lo === bh) {
      out.fill(OP_DELETE, o, o + (ah - aLo));
      o += ah - aLo;
      continue;
    }

    const limit = ah - aLo + (bh - lo) > EXACT_SIZE ? COST_LIMIT : Infinity;
    const split = bisect(A, aLo, ah, B, lo, bh, limit);
    if (!split) {
      out.fill(OP_DELETE, o, o + (ah - aLo));
      o += ah - aLo;
      out.fill(OP_INSERT, o, o + (bh - lo));
      o += bh - lo;
      continue;
    }
    const [x, y] = split;
    // Right half after left half: push right first
    push(TASK_RANGE, x, ah, y, bh);
    push(TASK_RANGE, aLo, x, lo, y);
  }

  return out.subarray(0, o);
}

/** Diff two lists of strings (used for word- and character-level diffs). */
export function myersDiff(oldContent: string[], newContent: string[]): DiffMove[] {
  const { a, b, distinct } = intern(oldContent, newContent);
  const ops = diffIds(a, b, distinct);
  const moves: DiffMove[] = [];
  let i = 0;
  let j = 0;
  for (let p = 0; p < ops.length; p++) {
    const op = ops[p]!;
    if (op === OP_EQUAL) {
      moves.push({ line: oldContent[i++]!, moveType: 'unchanged' });
      j++;
    } else if (op === OP_DELETE) {
      moves.push({ line: oldContent[i++]!, moveType: 'delete' });
    } else {
      moves.push({ line: newContent[j++]!, moveType: 'add' });
    }
  }
  return moves;
}
