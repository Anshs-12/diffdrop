/**
 * Optional AI summaries via the browser's built-in, on-device model
 * (Chrome's Summarizer API). Text is processed locally; nothing is sent anywhere.
 * Browsers without the API simply don't offer it.
 */

export type AIAvailability = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface SummarizerInstance {
  summarize(input: string, options?: { context?: string }): Promise<string>;
  destroy(): void;
}

interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (e: { loaded: number }) => void): void;
}

interface SummarizerStatic {
  availability(options?: Record<string, unknown>): Promise<Exclude<AIAvailability, 'unsupported'>>;
  create(options?: Record<string, unknown> & { monitor?: (m: DownloadMonitor) => void }): Promise<SummarizerInstance>;
}

const OPTIONS = { type: 'tldr', format: 'plain-text', length: 'medium', outputLanguage: 'en' } as const;

/** The model's input budget is limited; long diffs are truncated to their start. */
const MAX_INPUT_CHARS = 12_000;

function api(): SummarizerStatic | null {
  const s = (globalThis as { Summarizer?: SummarizerStatic }).Summarizer;
  return s ?? null;
}

export async function aiAvailability(): Promise<AIAvailability> {
  const s = api();
  if (!s) return 'unsupported';
  try {
    return await s.availability(OPTIONS);
  } catch {
    return 'unsupported';
  }
}

/** Summarize a unified diff on-device. `onProgress` receives model download progress (0–1). */
export async function aiSummarize(patch: string, onProgress?: (loaded: number) => void): Promise<string> {
  const s = api();
  if (!s) throw new Error('On-device AI is not available in this browser');
  const summarizer = await s.create({
    ...OPTIONS,
    sharedContext: 'The input is a unified diff (git diff format) between two versions of a text.',
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded));
    },
  });
  try {
    return await summarizer.summarize(patch.slice(0, MAX_INPUT_CHARS), {
      context: 'Explain in plain language what changed between the two versions.',
    });
  } finally {
    summarizer.destroy();
  }
}
