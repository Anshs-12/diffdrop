import type { DiffLine, EofInfo } from './diffProcessor';

interface PatchOp {
  prefix: ' ' | '-' | '+';
  text: string;
}

/** Flatten diff lines into patch ops, emitting all removals of a change block before its additions. */
function toOps(lines: DiffLine[]): PatchOp[] {
  const ops: PatchOp[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.type === 'unchanged') {
      ops.push({ prefix: ' ', text: line.leftContent! });
      i++;
      continue;
    }
    const removed: PatchOp[] = [];
    const added: PatchOp[] = [];
    while (i < lines.length && lines[i]!.type !== 'unchanged') {
      const l = lines[i]!;
      if (l.leftContent != null) removed.push({ prefix: '-', text: l.leftContent });
      if (l.rightContent != null) added.push({ prefix: '+', text: l.rightContent });
      i++;
    }
    ops.push(...removed, ...added);
  }
  return ops;
}

/**
 * Generate a unified diff (as produced by `diff -u` / `git diff`) with the given
 * number of context lines.
 */
export function generatePatch(
  lines: DiffLine[],
  eof: EofInfo,
  oldName = 'original',
  newName = 'changed',
  context = 3,
): string {
  const ops = toOps(lines);
  const changes: number[] = [];
  ops.forEach((op, idx) => {
    if (op.prefix !== ' ') changes.push(idx);
  });
  if (changes.length === 0) return '';

  const out: string[] = [`--- a/${oldName}`, `+++ b/${newName}`];

  // Count old/new lines that precede each op so hunk headers can be computed.
  const oldBefore: number[] = [];
  const newBefore: number[] = [];
  let o = 0;
  let n = 0;
  for (const op of ops) {
    oldBefore.push(o);
    newBefore.push(n);
    if (op.prefix !== '+') o++;
    if (op.prefix !== '-') n++;
  }
  const oldTotal = o;
  const newTotal = n;

  let c = 0;
  while (c < changes.length) {
    const start = Math.max(0, changes[c]! - context);
    let last = changes[c]!;
    while (c + 1 < changes.length && changes[c + 1]! - last <= 2 * context) {
      c++;
      last = changes[c]!;
    }
    const end = Math.min(ops.length, last + context + 1);
    c++;

    const body = ops.slice(start, end);
    const oldCount = body.filter((op) => op.prefix !== '+').length;
    const newCount = body.filter((op) => op.prefix !== '-').length;
    const oldStart = oldCount === 0 ? oldBefore[start]! : oldBefore[start]! + 1;
    const newStart = newCount === 0 ? newBefore[start]! : newBefore[start]! + 1;

    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);
    for (let idx = start; idx < end; idx++) {
      const op = ops[idx]!;
      out.push(op.prefix + op.text);
      const lastOld = op.prefix !== '+' && oldBefore[idx] === oldTotal - 1;
      const lastNew = op.prefix !== '-' && newBefore[idx] === newTotal - 1;
      if ((lastOld && eof.oldMissing) || (lastNew && eof.newMissing)) {
        out.push('\\ No newline at end of file');
      }
    }
  }

  return out.join('\n') + '\n';
}
