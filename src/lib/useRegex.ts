import { useEffect, useRef, useState } from 'react';
import { compileRegex, type RegexRequest, type RegexResult } from './regex';

/** A run longer than this is stopped; the pattern almost certainly backtracks catastrophically. */
export const REGEX_TIMEOUT_MS = 1500;

export type RegexState = { status: 'idle' } | { status: 'running' } | { status: 'timeout' } | { status: 'done'; result: RegexResult; text: string };

/** Runs the regex in a Web Worker, restarting it if a run takes too long. */
export function useRegex(request: RegexRequest): RegexState {
  const [state, setState] = useState<RegexState>({ status: 'idle' });
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => {
    if (!request.pattern) {
      setState({ status: 'idle' });
      return;
    }
    // Syntax errors show instantly, without the worker
    const compiled = compileRegex(request.pattern, request.flags);
    if (!compiled.ok) {
      setState({ status: 'done', result: compiled, text: request.text });
      return;
    }
    const id = ++idRef.current;
    const worker = (workerRef.current ??= new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' }));
    const timer = setTimeout(() => {
      if (id !== idRef.current) return;
      worker.terminate();
      workerRef.current = null;
      setState({ status: 'timeout' });
    }, REGEX_TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<{ id: number; result: RegexResult }>) => {
      if (e.data.id !== idRef.current) return;
      clearTimeout(timer);
      setState({ status: 'done', result: e.data.result, text: request.text });
    };
    setState((s) => (s.status === 'done' ? s : { status: 'running' }));
    worker.postMessage({ id, request });
    return () => clearTimeout(timer);
  }, [request]);

  return state;
}
