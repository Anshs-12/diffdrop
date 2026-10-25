/** Word counter helpers: a character-limit check and the counts as plain text. */
import { formatMinutes, type TextStats } from './textCase';

/** Common character limits offered as presets. */
export const LIMIT_PRESETS = [
  { limit: 160, label: '160 (SMS)' },
  { limit: 280, label: '280 (X post)' },
  { limit: 500, label: '500' },
  { limit: 1000, label: '1,000' },
] as const;

export interface LimitCheck {
  used: number;
  limit: number;
  /** Characters left; negative when over. */
  left: number;
  over: boolean;
}

/** How a character count compares with a limit (null when there's no limit). */
export function checkLimit(characters: number, limit: number): LimitCheck | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const left = limit - characters;
  return { used: characters, limit, left, over: left < 0 };
}

/** The counts as plain text, one per line, for copying. */
export function statsSummary(s: TextStats): string {
  const n = (v: number) => v.toLocaleString('en-US');
  return [
    `Words: ${n(s.words)}`,
    `Characters: ${n(s.characters)}`,
    `Characters without spaces: ${n(s.charactersNoSpaces)}`,
    `Sentences: ${n(s.sentences)}`,
    `Paragraphs: ${n(s.paragraphs)}`,
    `Lines: ${n(s.lines)}`,
    `Reading time: ${formatMinutes(s.readingMinutes)}`,
    `Speaking time: ${formatMinutes(s.speakingMinutes)}`,
  ].join('\n');
}
