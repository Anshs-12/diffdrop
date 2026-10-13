/**
 * Browser-compatible Myers diff implementation.
 *
 * Follows the structure of the original diff.ts (V array indexed by diagonal k,
 * greedy diagonal consumption, one V snapshot per edit distance d, then a
 * backtracking pass over the snapshots) with the move-selection rules corrected:
 *
 *   - reaching diagonal k from k + 1 is an insertion  -> row = V[k + 1]
 *   - reaching diagonal k from k - 1 is a deletion    -> row = V[k - 1] + 1
 *   - at the edges (k = -d / k = d) only one of those moves exists
 *
 * Here row indexes the old content and col indexes the new content (k = row - col).
 */

export interface DiffMove {
  line: string;
  moveType: 'unchanged' | 'delete' | 'add';
}

interface Node {
  row: number;
  col: number;
}

/**
 * Upper bound on the number of Int32 entries kept across all snapshots
 * (~128 MB). Inputs that would need more fall back to a plain
 * delete-all / add-all script for the unmatched middle section.
 */
const MAX_SNAPSHOT_CELLS = 32_000_000;

function greedyConsumeDiagonals(
  position: Node,
  oldFiles: string[],
  newFiles: string[],
): Node {
  let row = position.row;
  let col = position.col;
  while (
    row < oldFiles.length &&
    col < newFiles.length &&
    oldFiles[row] === newFiles[col]
  ) {
    row += 1;
    col += 1;
  }
  return { row, col };
}

/** True when diagonal k at edit distance d is best reached by an insertion (from k + 1). */
function comesFromInsertion(k: number, d: number, below: number, above: number): boolean {
  return k === -d || (k !== d && below < above);
}

/**
 * Snapshot d only stores diagonals -d..d (the only ones step d can touch),
 * so read it with this helper instead of indexing by a global offset.
 */
function readSnapshot(snapshot: Int32Array, d: number, k: number): number {
  return snapshot[k + d]!;
}

function construction(
  finalNode: Node,
  snapShots: Int32Array[],
  oldFileContent: string[],
  newFileContent: string[],
): DiffMove[] {
  const moves: DiffMove[] = [];

  let x = finalNode.row;
  let y = finalNode.col;

  for (let d = snapShots.length - 1; d >= 1; d--) {
    const V = snapShots[d - 1]!;
    const k = x - y;

    const below = k - 1 >= -(d - 1) ? readSnapshot(V, d - 1, k - 1) : -1;
    const above = k + 1 <= d - 1 ? readSnapshot(V, d - 1, k + 1) : -1;
    const insertion = comesFromInsertion(k, d, below, above);

    const prevK = insertion ? k + 1 : k - 1;
    const prevX = insertion ? above : below;
    const prevY = prevX - prevK;

    // The snake (run of matching lines) that followed the edit
    while (x > prevX && y > prevY) {
      moves.push({ line: oldFileContent[x - 1]!, moveType: 'unchanged' });
      x -= 1;
      y -= 1;
    }

    if (insertion) {
      moves.push({ line: newFileContent[y - 1]!, moveType: 'add' });
    } else {
      moves.push({ line: oldFileContent[x - 1]!, moveType: 'delete' });
    }
    x = prevX;
    y = prevY;
  }

  // Leading snake at d = 0
  while (x > 0 && y > 0) {
    moves.push({ line: oldFileContent[x - 1]!, moveType: 'unchanged' });
    x -= 1;
    y -= 1;
  }
  return moves.reverse();
}

function replaceAll(oldContent: string[], newContent: string[]): DiffMove[] {
  return [
    ...oldContent.map((line) => ({ line, moveType: 'delete' as const })),
    ...newContent.map((line) => ({ line, moveType: 'add' as const })),
  ];
}

function myersCore(oldContent: string[], newContent: string[]): DiffMove[] {
  const m = oldContent.length;
  const n = newContent.length;

  if (m === 0 && n === 0) return [];
  if (m === 0) return newContent.map((line) => ({ line, moveType: 'add' as const }));
  if (n === 0) return oldContent.map((line) => ({ line, moveType: 'delete' as const }));

  const offSet = m + n;
  const V = new Int32Array(2 * (m + n) + 1).fill(-1);
  const goal_k = m - n;

  const snapShots: Int32Array[] = [];
  let storedCells = 0;

  for (let d = 0; d <= m + n; d++) {
    for (let k = -d; k <= d; k += 2) {
      const idx = k + offSet;

      let row: number;
      if (d === 0) {
        row = 0;
      } else if (comesFromInsertion(k, d, V[idx - 1]!, V[idx + 1]!)) {
        row = V[idx + 1]!;
      } else {
        row = V[idx - 1]! + 1;
      }
      const col = row - k;

      const finalNode = greedyConsumeDiagonals({ row, col }, oldContent, newContent);
      V[idx] = finalNode.row;

      if (k === goal_k && finalNode.row >= m) {
        snapShots.push(V.slice(offSet - d, offSet + d + 1));
        return construction({ row: m, col: n }, snapShots, oldContent, newContent);
      }
    }

    storedCells += 2 * d + 1;
    if (storedCells > MAX_SNAPSHOT_CELLS) return replaceAll(oldContent, newContent);
    snapShots.push(V.slice(offSet - d, offSet + d + 1));
  }
  throw new Error('Myers diff failed — no path found');
}

/**
 * Myers diff with common prefix/suffix trimming. Trimming does not change the
 * edit distance, but keeps the O(D²) snapshot memory small for typical edits.
 */
export function myersDiff(
  oldContent: string[],
  newContent: string[],
): DiffMove[] {
  let start = 0;
  while (
    start < oldContent.length &&
    start < newContent.length &&
    oldContent[start] === newContent[start]
  ) {
    start++;
  }

  let oldEnd = oldContent.length;
  let newEnd = newContent.length;
  while (oldEnd > start && newEnd > start && oldContent[oldEnd - 1] === newContent[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const prefix = oldContent.slice(0, start).map((line) => ({ line, moveType: 'unchanged' as const }));
  const suffix = oldContent.slice(oldEnd).map((line) => ({ line, moveType: 'unchanged' as const }));
  const middle = myersCore(oldContent.slice(start, oldEnd), newContent.slice(start, newEnd));

  return [...prefix, ...middle, ...suffix];
}
