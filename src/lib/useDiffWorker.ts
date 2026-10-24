import { useEffect, useRef, useState } from 'react';
import { expandDiff, splitLines, type DiffOptions, type DiffResult } from './diffProcessor';
import type { WorkerRequest, WorkerResponse } from './diff.worker';
import type { Lang } from './syntax';

export interface DiffState {
  result: DiffResult | null;
  /** The texts `result` was computed from (may lag behind the editors while typing). */
  input: { originalText: string; changedText: string } | null;
  error: string | null;
  pending: boolean;
}

/**
 * Hook that manages a diff Web Worker and returns the latest DiffResult.
 */
export function useDiffWorker(
  originalText: string,
  changedText: string,
  options: DiffOptions,
  leftLang: Lang | null,
  rightLang: Lang | null,
): DiffState {
  const [state, setState] = useState<DiffState>({ result: null, input: null, error: null, pending: false });
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const lastRequestRef = useRef<WorkerRequest | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('./diff.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      // Only accept the most recent result
      const request = lastRequestRef.current;
      if (e.data.id !== idRef.current || !request) return;
      const input = { originalText: request.originalText, changedText: request.changedText };
      if (e.data.error !== undefined) {
        setState({ result: null, input, error: e.data.error, pending: false });
      } else {
        // Rows reference this thread's own copy of the lines; no text crossed over
        performance.mark('toolspace:result');
        const result = expandDiff(e.data.result, splitLines(input.originalText), splitLines(input.changedText));
        performance.mark('toolspace:expanded');
        setState({ result, input, error: null, pending: false });
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Debounce diff requests
  useEffect(() => {
    setState((s) => (s.pending ? s : { ...s, pending: true }));
    const timer = setTimeout(() => {
      if (!workerRef.current) return;
      idRef.current += 1;
      const request: WorkerRequest = {
        id: idRef.current,
        originalText,
        changedText,
        options,
        langs: { left: leftLang, right: rightLang },
      };
      lastRequestRef.current = request;
      // Timing marks for performance tests and the browser's performance panel
      performance.mark('toolspace:request');
      workerRef.current.postMessage(request);
    }, 120);
    return () => clearTimeout(timer);
  }, [originalText, changedText, options, leftLang, rightLang]);

  return state;
}
