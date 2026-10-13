import { computeCompactDiff, type CompactDiff, type DiffOptions } from './diffProcessor';
import type { Lang } from './syntax';

/**
 * Web Worker entry point for running diff computation off the main thread.
 * Results are compact typed arrays whose buffers are transferred, not copied.
 */

export interface WorkerRequest {
  id: number;
  originalText: string;
  changedText: string;
  options: DiffOptions;
  /** Languages for syntax colors (null when syntax colors are off). */
  langs: { left: Lang | null; right: Lang | null };
}

export type WorkerResponse =
  | { id: number; result: CompactDiff; error?: undefined }
  | { id: number; result?: undefined; error: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, originalText, changedText, options, langs } = e.data;
  try {
    const result = computeCompactDiff(originalText, changedText, options, langs);
    const response: WorkerResponse = { id, result };
    const transfer: Transferable[] = [result.kinds.buffer, result.leftNums.buffer, result.rightNums.buffer];
    if (result.leftStates) transfer.push(result.leftStates.buffer);
    if (result.rightStates) transfer.push(result.rightStates.buffer);
    self.postMessage(response, { transfer });
  } catch (err) {
    const response: WorkerResponse = { id, error: err instanceof Error ? err.message : String(err) };
    self.postMessage(response);
  }
};
