import { missingFinalNewline, splitLines, type DiffLine } from './diffProcessor';

function eolOf(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Copy one diff line across to the other side and return the new text of the
 * target side. `direction` is the side being written to.
 */
export function applyMerge(
  lines: DiffLine[],
  index: number,
  direction: 'toRight' | 'toLeft',
  sourceText: string,
  targetText: string,
): string | null {
  const line = lines[index];
  if (!line) return null;

  const toRight = direction === 'toRight';
  const source = toRight ? line.leftContent : line.rightContent;
  const sourceNum = toRight ? line.leftNum : line.rightNum;
  const targetNum = toRight ? line.rightNum : line.leftNum;
  if (source == null || sourceNum == null) return null;

  const target = splitLines(targetText);
  let writtenAt: number;
  if (targetNum != null) {
    // Modified line: overwrite the counterpart in place
    writtenAt = targetNum - 1;
    target[writtenAt] = source;
  } else {
    // Pure add/remove: insert after the nearest preceding line that exists on the target side
    let insertAt = 0;
    for (let j = index - 1; j >= 0; j--) {
      const num = toRight ? lines[j]!.rightNum : lines[j]!.leftNum;
      if (num != null) {
        insertAt = num;
        break;
      }
    }
    writtenAt = insertAt;
    target.splice(insertAt, 0, source);
  }

  // Keep the target's final-newline convention unless the merged line became the
  // target's last line: then it ends like it did in the source (a line that was
  // not last in the source always had a newline).
  let terminated = targetText === '' || !missingFinalNewline(targetText);
  if (writtenAt === target.length - 1) {
    const sourceIsLast = sourceNum === splitLines(sourceText).length;
    terminated = !sourceIsLast || !missingFinalNewline(sourceText);
  }

  const eol = eolOf(targetText || sourceText);
  return target.join(eol) + (terminated && target.length > 0 ? eol : '');
}
