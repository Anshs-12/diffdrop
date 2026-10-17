import { runRegex, type RegexRequest, type RegexResult } from './regex';

// Runs regexes off the main thread, so a catastrophic pattern can be stopped
self.onmessage = (e: MessageEvent<{ id: number; request: RegexRequest }>) => {
  const result: RegexResult = runRegex(e.data.request);
  self.postMessage({ id: e.data.id, result });
};
