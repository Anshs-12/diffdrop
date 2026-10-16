import { lazy, Suspense } from 'react';
import type { PageId } from '@/site';
import { useTheme } from '@/lib/theme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader, { type HeaderSection } from '@/components/SiteHeader';
import { Footer, Privacy, ToolCards } from '@/components/Landing';
import { TOOL_CONTENT } from './content';

const TOOLS = {
  'json-formatter': lazy(() => import('./JsonFormatter')),
  'json-validator': lazy(() => import('./JsonValidator')),
  'json-to-csv': lazy(() => import('./JsonToCsv')),
  'json-to-yaml': lazy(() => import('./JsonToYaml')),
  'json-viewer': lazy(() => import('./JsonViewer')),
};

type ToolId = keyof typeof TOOLS;

const SECTIONS: HeaderSection[] = [
  { id: 'tool', label: 'Tool' },
  { id: 'how', label: 'How it works' },
  { id: 'privacy', label: 'Privacy' },
];

/** Layout shared by the JSON tool pages: heading, the tool, how-to, FAQ, related tools. */
export default function ToolApp({ page }: { page: PageId }) {
  const { choice: theme, resolved, setChoice: setTheme } = useTheme();
  const id = page as ToolId;
  const Tool = TOOLS[id];
  const content = TOOL_CONTENT[id];

  return (
    <TooltipProvider delayDuration={300}>
      <SiteHeader current={page} sections={SECTIONS} theme={theme} onThemeChange={setTheme} />
      <main>
        <section id="top" className="page pt-12 pb-8 sm:pt-16">
          <p className="font-mono text-[12.5px] text-muted-foreground">free · no account · runs in your browser</p>
          <h1 className="mt-2 text-[clamp(32px,5vw,52px)] leading-[1.05] font-semibold tracking-[-0.04em]">{content.h1}</h1>
          <p className="mt-4 max-w-[68ch] text-[16.5px] text-muted-foreground">{content.lede}</p>
        </section>

        <section id="tool" className="scroll-mt-20 pb-16" aria-label={content.h1}>
          <div className="page-wide">
            <div className="workspace">
              <Suspense fallback={<div className="grid min-h-[480px] place-items-center text-sm text-muted-foreground">Loading…</div>}>
                <Tool />
              </Suspense>
            </div>
          </div>
        </section>

        <section id="how" className="border-t py-16 sm:py-20">
          <div className="page grid items-start gap-x-12 gap-y-10 md:grid-cols-2">
            <div>
              <h2 className="text-[clamp(26px,3.6vw,36px)] leading-[1.1] font-semibold tracking-[-0.03em]">How it works</h2>
              <ol className="mt-6 space-y-6">
                {content.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border font-mono text-sm">{i + 1}</span>
                    <div>
                      <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{step.title}</h3>
                      <p className="mt-1 text-[15px] text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="text-[clamp(26px,3.6vw,36px)] leading-[1.1] font-semibold tracking-[-0.03em]">Questions</h2>
              <dl className="mt-6 divide-y">
                {content.faq.map(({ q, a }) => (
                  <div key={q} className="py-4 first:pt-0">
                    <dt className="text-[16px] font-semibold tracking-[-0.01em]">{q}</dt>
                    <dd className="mt-1 text-[15px] text-muted-foreground">{a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <ToolCards current={page} />

        <Privacy />
      </main>
      <Footer current={page} />
      <Toaster theme={resolved} position="bottom-center" />
    </TooltipProvider>
  );
}
