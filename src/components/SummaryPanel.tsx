import React, { useEffect, useState } from 'react';
import { Cpu, Loader2, X } from 'lucide-react';
import type { ChangeSummary } from '@/lib/summary';
import { aiAvailability, aiSummarize, type AIAvailability } from '@/lib/onDeviceAI';
import { Button } from '@/components/ui/button';

interface SummaryPanelProps {
  summary: ChangeSummary;
  /** Builds the unified diff to hand to the on-device model. */
  getPatch: () => string;
  /** Changes whenever the diff changes, so a stale AI answer is cleared. */
  diffKey: unknown;
  onClose: () => void;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary, getPatch, diffKey, onClose }) => {
  const [availability, setAvailability] = useState<AIAvailability>('unsupported');
  const [ai, setAi] = useState<{ status: 'idle' | 'running' | 'done' | 'error'; text?: string; progress?: number }>({
    status: 'idle',
  });

  useEffect(() => {
    void aiAvailability().then(setAvailability);
  }, []);

  useEffect(() => {
    setAi({ status: 'idle' });
  }, [diffKey]);

  const runAI = async () => {
    setAi({ status: 'running' });
    try {
      const text = await aiSummarize(getPatch(), (loaded) => setAi({ status: 'running', progress: loaded }));
      setAi({ status: 'done', text });
    } catch (e) {
      setAi({ status: 'error', text: e instanceof Error ? e.message : 'Summary failed' });
    }
  };

  const aiOffered = availability !== 'unsupported' && availability !== 'unavailable';

  return (
    <div className="border-t bg-background/60 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{summary.headline}</p>
          {summary.points.length > 0 && (
            <ul className="mt-2 space-y-1 font-mono text-[12.5px] text-muted-foreground">
              {summary.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-brand" aria-hidden="true">
                    ▪
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {aiOffered ? (
              <Button variant="outline" size="sm" onClick={runAI} disabled={ai.status === 'running'}>
                {ai.status === 'running' ? <Loader2 className="animate-spin" /> : <Cpu />}
                {ai.status === 'running'
                  ? ai.progress != null && ai.progress < 1
                    ? `Getting the on-device model… ${Math.round(ai.progress * 100)}%`
                    : 'Summarizing on your device…'
                  : 'Explain with on-device AI'}
              </Button>
            ) : (
              <span className="text-xs text-faint">
                AI summaries use your browser's built-in model (Chrome). This browser doesn't offer one, so you
                get the summary above.
              </span>
            )}
          </div>

          {ai.status === 'done' && (
            <p className="mt-3 max-w-[70ch] rounded-lg border bg-card px-3.5 py-2.5 text-sm whitespace-pre-line">{ai.text}</p>
          )}
          {ai.status === 'error' && <p className="mt-3 text-sm text-destructive">{ai.text}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close summary" onClick={onClose}>
          <X />
        </Button>
      </div>
    </div>
  );
};

export default SummaryPanel;
