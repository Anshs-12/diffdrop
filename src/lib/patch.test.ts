import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { computeDiff, type DiffOptions } from './diffProcessor';
import { generatePatch } from './patch';
import { randomText, rng } from '@/test/random';

const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };
const patchOf = (a: string, b: string) => {
  const r = computeDiff(a, b, base);
  return generatePatch(r.lines, r.eof, 'f', 'f');
};

const hasGit = (() => {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const dir = mkdtempSync(path.join(tmpdir(), 'toolspace-patch-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('generatePatch', () => {
  it('is empty when nothing changed', () => {
    expect(patchOf('a\nb\n', 'a\nb\n')).toBe('');
  });

  it('writes standard headers and hunk ranges', () => {
    expect(patchOf('a\nb\nc\n', 'a\nB\nc\n')).toBe(
      ['--- a/f', '+++ b/f', '@@ -1,3 +1,3 @@', ' a', '-b', '+B', ' c', ''].join('\n'),
    );
  });

  it('marks a missing final newline the way git does', () => {
    expect(patchOf('a\nb', 'a\nb\n')).toBe(
      ['--- a/f', '+++ b/f', '@@ -1,2 +1,2 @@', ' a', '-b', '\\ No newline at end of file', '+b', ''].join('\n'),
    );
  });

  it('splits distant changes into separate hunks with 3 lines of context', () => {
    const a = Array.from({ length: 30 }, (_, i) => `l${i}`).join('\n') + '\n';
    const b = a.replace('l2\n', 'X\n').replace('l25\n', 'Y\n');
    expect(patchOf(a, b).match(/^@@/gm)).toHaveLength(2);
  });

  it.skipIf(!hasGit)('produces patches that git apply turns a into b (random)', () => {
    const rand = rng(21);
    let applied = 0;
    for (let i = 0; i < 250; i++) {
      const a = randomText(rand, 30);
      const b = randomText(rand, 30);
      if (!a || !b) continue; // git apply cannot create or delete files from these patches
      const patch = patchOf(a, b);
      if (!patch) {
        expect(a).toBe(b);
        continue;
      }
      writeFileSync(path.join(dir, 'f'), a);
      writeFileSync(path.join(dir, 'x.patch'), patch);
      execFileSync('git', ['apply', 'x.patch'], { cwd: dir, stdio: 'pipe' });
      expect(readFileSync(path.join(dir, 'f'), 'utf8')).toBe(b);
      applied++;
    }
    expect(applied).toBeGreaterThan(150);
  });
});
