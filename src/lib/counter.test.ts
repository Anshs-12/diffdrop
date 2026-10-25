import { describe, expect, it } from 'vitest';
import { checkLimit, statsSummary } from './counter';
import { textStats } from './textCase';

describe('word counter helpers', () => {
  it('checks a character limit', () => {
    expect(checkLimit(100, 280)).toEqual({ used: 100, limit: 280, left: 180, over: false });
    expect(checkLimit(281, 280)).toEqual({ used: 281, limit: 280, left: -1, over: true });
    expect(checkLimit(280, 280)).toMatchObject({ left: 0, over: false });
    expect(checkLimit(5, 0)).toBeNull();
    expect(checkLimit(5, Number.NaN)).toBeNull();
  });

  it('writes the counts as text', () => {
    expect(statsSummary(textStats('One two three. Four five!\n\nSix.'))).toBe(
      'Words: 6\nCharacters: 31\nCharacters without spaces: 25\nSentences: 3\nParagraphs: 2\nLines: 3\nReading time: 2 sec\nSpeaking time: 2 sec',
    );
    expect(statsSummary(textStats(''))).toContain('Words: 0');
    // Emoji and accented letters count once
    expect(statsSummary(textStats('café 👍🏽'))).toContain('Characters: 6');
    expect(statsSummary(textStats('word '.repeat(100_000)))).toContain('Words: 100,000');
  });
});
