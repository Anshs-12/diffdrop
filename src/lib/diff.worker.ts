import { computeDiff, type DiffOptions } from './diffProcessor';

/**
 * Web Worker entry point for running diff computation off the main thread.
 */

export interface WorkerRequest {
  id: number;
  originalText: string;
  changedText: string;
  options: DiffOptions;
}

export interface WorkerResponse {
  id: number;
  result: ReturnType<typeof computeDiff>;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, originalText, changedText, options } = e.data;
  const result = computeDiff(originalText, changedText, options);
  const response: WorkerResponse = { id, result };
  self.postMessage(response);
};
