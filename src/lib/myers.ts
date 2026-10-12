/**
 * Browser-compatible Myers diff implementation.
 * Extracted from the original diff.ts algorithm — same logic, no Node.js dependencies.
 * The original diff.ts is NOT modified.
 */

export interface DiffMove {
  line: string;
  moveType: 'unchanged' | 'delete' | 'add';
}

interface Node {
  row: number;
  col: number;
}

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
  if (row > oldFiles.length) row = oldFiles.length;
  if (col > newFiles.length) col = newFiles.length;
  return { row, col };
}

function construction(
  finalNode: Node,
  snapshot: Int32Array[],
  oldFileContent: string[],
  newFileContent: string[],
): DiffMove[] {
  const moves: DiffMove[] = [];
  const m = oldFileContent.length;
  const n = newFileContent.length;
  const offSet = m + n;

  let x = finalNode.row - 1;
  let y = finalNode.col - 1;

  for (let d = snapshot.length - 1; d >= 1; d--) {
    const V = snapshot[d - 1]!;

    while (x >= 0 && y >= 0 && oldFileContent[x] === newFileContent[y]) {
      moves.push({ line: oldFileContent[x]!, moveType: 'unchanged' });
      x -= 1;
      y -= 1;
    }
    const k = x - y;
    const left = V[k + 1 + offSet]!;
    const up = V[k - 1 + offSet]!;

    if (x >= 0) {
      if (up > left) {
        moves.push({ line: oldFileContent[x]!, moveType: 'delete' });
        x -= 1;
      }
    }
    if (y >= 0) {
      if (left > up) {
        moves.push({ line: newFileContent[y]!, moveType: 'add' });
        y -= 1;
      }
    }
  }
  while (x >= 0 && y >= 0 && oldFileContent[x] === newFileContent[y]) {
    moves.push({ line: oldFileContent[x]!, moveType: 'unchanged' });
    x -= 1;
    y -= 1;
  }
  return moves.reverse();
}

export function myersDiff(
  oldContent: string[],
  newContent: string[],
): DiffMove[] {
  const m = oldContent.length;
  const n = newContent.length;

  // Edge case: both empty
  if (m === 0 && n === 0) return [];

  // Edge case: old is empty — everything is added
  if (m === 0) {
    return newContent.map((line) => ({ line, moveType: 'add' as const }));
  }

  // Edge case: new is empty — everything is deleted
  if (n === 0) {
    return oldContent.map((line) => ({ line, moveType: 'delete' as const }));
  }

  const totalSize = 2 * (m + n) + 1;
  const offSet = m + n;
  const V = new Int32Array(totalSize).fill(-1);
  const goal_k = m - n;

  const snapShots: Int32Array[] = [];
  let finalNode: Node = { row: 0, col: 0 };

  for (let d = 0; d <= m + n; d++) {
    const prevV = new Int32Array(V);
    for (let k = -d; k <= d; k += 2) {
      const idx = k + offSet;

      const right = prevV[idx - 1]!;
      const down = prevV[idx + 1]! + 1;

      V[idx] = Math.max(right, down);
      const row = V[idx]!;
      const col = row - k;

      const position: Node = { row, col };

      finalNode = greedyConsumeDiagonals(position, oldContent, newContent);

      V[idx] = finalNode.row;

      if (k === goal_k && V[idx] === m) {
        snapShots.push(new Int32Array(V));
        finalNode = { row: m, col: n };
        return construction(finalNode, snapShots, oldContent, newContent);
      }
    }
    snapShots.push(new Int32Array(V));
  }
  throw new Error('Myers diff failed — no path found');
}
