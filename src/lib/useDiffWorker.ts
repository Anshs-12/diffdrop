import { useCallback, useEffect, useRef, useState } from 'react';
import type { DiffOptions, DiffResult } from './diffProcessor';
import type { WorkerRequest, WorkerResponse } from './diff.worker';

/**
 * Hook that manages a diff Web Worker and returns the latest DiffResult.
 */
export function useDiffWorker(
  originalText: string,
  changedText: string,
  options: DiffOptions,
): DiffResult | null {
  const [result, setResult] = useState<DiffResult | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('./diff.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      // Only accept the most recent result
      if (e.data.id === idRef.current) {
        setResult(e.data.result);
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const requestDiff = useCallback(() => {
    if (!workerRef.current) return;
    idRef.current += 1;
    const request: WorkerRequest = {
      id: idRef.current,
      originalText,
      changedText,
      options,
    };
    workerRef.current.postMessage(request);
  }, [originalText, changedText, options]);

  // Debounce diff requests
  useEffect(() => {
    const timer = setTimeout(requestDiff, 150);
    return () => clearTimeout(timer);
  }, [requestDiff]);

  return result;
}
