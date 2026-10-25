import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, PRIVATE_TOOLS } from './saved';

describe('share-link state', () => {
  it('round-trips text, options and unicode', () => {
    const state = { text: 'naïve café 日本語 😀\n\ttabs "quotes" & <tags>', mode: 'title', count: 3, flags: [true, false] };
    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it('round-trips large input', () => {
    const text = 'line of text that repeats\n'.repeat(20_000);
    expect(decodeState(encodeState({ text }))).toEqual({ text });
  });

  it('ignores links that are corrupt or not an object', () => {
    expect(decodeState('')).toBeNull();
    expect(decodeState('not-a-real-link')).toBeNull();
    expect(decodeState(encodeState([1, 2] as unknown as Record<string, unknown>))).toBeNull();
  });

  it('never saves or shares the tools that handle secrets', () => {
    expect(PRIVATE_TOOLS.has('password-generator')).toBe(true);
    expect(PRIVATE_TOOLS.has('jwt-decoder')).toBe(true);
  });
});
