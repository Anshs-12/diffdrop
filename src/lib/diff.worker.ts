import { computeDiff, type DiffOptions, type DiffResult } from './diffProcessor';

/**
 * Web Worker entry point for running diff computation off the main thread.
 */

export interface WorkerRequest {
  id: number;
  originalText: string;
  changedText: string;
  options: DiffOptions;
}

export type WorkerResponse =
  | { id: number; result: DiffResult; error?: undefined }
  | { id: number; result?: undefined; error: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, originalText, changedText, options } = e.data;
  let response: WorkerResponse;
  try {
    response = { id, result: computeDiff(originalText, changedText, options) };
  } catch (err) {
    response = { id, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(response);
};
