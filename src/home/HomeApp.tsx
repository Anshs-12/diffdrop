import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  Lightbulb,
  Braces,
  Check,
  Columns2,
  FileCode,
  GitCompareArrows,
  Infinity as InfinityIcon,
  ListTree,
  Scale,
  Server,
  Sheet,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react';
import { pageById, REPO_URL, type PageId } from '@/site';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader, { type HeaderSection } from '@/components/SiteHeader';
import { Footer, Privacy, SectionTitle } from '@/components/Landing';

const SECTIONS: HeaderSection[] = [
  { id: 'compare', label: 'Compare' },
  { id: 'json', label: 'JSON' },
  { id: 'why', label: 'Why free' },
  { id: 'privacy', label: 'Privacy' },
];

interface Tool {
  id: PageId;
  Icon: typeof Check;
  points: string[];
  /** A small picture of the tool's output, for the larger cards. */
  preview?: React.ReactNode;
}

const Line: React.FC<{ kind?: 'add' | 'del'; children: React.ReactNode }> = ({ kind, children }) => (
  <span
    className={
      'block px-3 ' + (kind === 'add' ? 'bg-add-bg text-add' : kind === 'del' ? 'bg-del-bg text-del' : 'text-muted-foreground')
    }
  >
    {kind === 'add' ? '+ ' : kind === 'del' ? '- ' : '  '}
    {children}
  </span>
);

const COMPARE: Tool[] = [
  {
    id: 'diff-checker',
    Icon: GitCompareArrows,
    points: ['Line and word level changes', 'Split or unified view', 'Files of 100,000+ lines'],
    preview: (
      <>
        <Line>function total(items) {'{'}</Line>
        <Line kind="del">  return sum;</Line>
        <Line kind="add">  return sum * (1 + tax);</Line>
        <Line>{'}'}</Line>
      </>
    ),
  },
  {
    id: 'json-diff',
    Icon: Columns2,
    points: ['Ignores key order and formatting', 'Every changed key and value', 'Syntax errors with line and column'],
    preview: (
      <>
        <Line>"name": "Ada Lovelace",</Line>
        <Line kind="del">"city": "London",</Line>
        <Line kind="add">"city": "Paris",</Line>
        <Line kind="add">"active": true</Line>
      </>
    ),
  },
];

const JSON_TOOLS: Tool[] = [
  { id: 'json-formatter', Icon: WandSparkles, points: ['2 or 4 spaces, tabs or minified', 'Sort keys A–Z'] },
  { id: 'json-validator', Icon: ShieldCheck, points: ['Exact line and column of errors', 'Duplicate key warnings'] },
  { id: 'json-to-csv', Icon: Sheet, points: ['Nested objects become columns', 'Opens cleanly in Excel'] },
  { id: 'json-to-yaml', Icon: FileCode, points: ['Clean block-style YAML', 'Quotes only what YAML needs'] },
  { id: 'json-viewer', Icon: ListTree, points: ['Collapsible, searchable tree', 'Click to copy any path'] },
];

const IconTile: React.FC<{ Icon: typeof Check }> = ({ Icon }) => (
  <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card">
    <Icon className="size-[18px]" aria-hidden="true" />
  </span>
);

const Points: React.FC<{ points: string[] }> = ({ points }) => (
  <ul className="mt-4 space-y-1.5 text-[14px] text-muted-foreground">
    {points.map((p) => (
      <li key={p} className="flex items-start gap-2">
        <Check className="mt-[3px] size-3.5 shrink-0 text-add" aria-hidden="true" />
        {p}
      </li>
    ))}
  </ul>
);

const OpenLabel: React.FC<{ name: string }> = ({ name }) => (
  <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium">
    {/* "Open diff checker", but "Open JSON diff" */}
    Open {/^[A-Z][a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name}
    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
  </span>
);

/** Large card with a preview, for the compare tools. */
const FeatureCard: React.FC<{ tool: Tool }> = ({ tool }) => {
  const page = pageById(tool.id);
  return (
    <a href={page.path} className="group flex flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-foreground/25 sm:p-7">
      <div className="flex items-center gap-3">
        <IconTile Icon={tool.Icon} />
        <h4 className="text-[20px] font-semibold tracking-[-0.02em]">{page.name}</h4>
      </div>
      <p className="mt-3 text-[15px] text-muted-foreground">{page.blurb}</p>
      <pre className="mt-5 overflow-hidden rounded-xl border bg-background py-2 font-mono text-[12.5px] leading-6" aria-hidden="true">
        {tool.preview}
      </pre>
      <Points points={tool.points} />
      <div className="mt-auto">
        <OpenLabel name={page.name} />
      </div>
    </a>
  );
};

/** Compact card, for the JSON tools. */
const ToolCard: React.FC<{ tool: Tool }> = ({ tool }) => {
  const page = pageById(tool.id);
  return (
    <a href={page.path} className="group flex flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-foreground/25">
      <div className="flex items-center gap-3">
        <IconTile Icon={tool.Icon} />
        <h4 className="text-[17px] font-semibold tracking-[-0.015em]">{page.name}</h4>
      </div>
      <p className="mt-3 text-[14.5px] text-muted-foreground">{page.blurb}</p>
      <Points points={tool.points} />
      <div className="mt-auto">
        <OpenLabel name={page.name} />
      </div>
    </a>
  );
};

const GroupHeading: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <div id={id} className="mb-5 flex scroll-mt-24 flex-wrap items-baseline gap-x-4 gap-y-1">
    <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h3>
    <p className="text-[15px] text-muted-foreground">{children}</p>
  </div>
);

const REASONS = [
  {
    Icon: Server,
    title: 'It runs on your device',
    body: 'Every tool works inside your browser. There are no servers doing the work, so there is no bill to pass on to you.',
  },
  {
    Icon: InfinityIcon,
    title: 'No limits, no account',
    body: 'No sign-up, no daily caps, no "pro" tier. Every feature works as often as you like, on files as big as your browser can hold.',
  },
  {
    Icon: Scale,
    title: 'Open source',
    body: (
      <>
        MIT licensed. Read the code, run it yourself, or send a fix{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-4 hover:text-foreground">
          on GitHub
        </a>
        .
      </>
    ),
  },
];

/** The home page: every tool, why it's free, and how it stays private. */
export default function HomeApp() {
  const { choice: theme, setChoice: setTheme } = useTheme();
  return (
    <TooltipProvider delayDuration={300}>
      <SiteHeader current="home" sections={SECTIONS} theme={theme} onThemeChange={setTheme} />
      <main>
        <section id="top" className="py-20 sm:py-28">
          <div className="page flex flex-col items-center text-center">
            <span className="inline-flex h-7 items-center gap-2 rounded-full border px-3 font-mono text-xs text-muted-foreground">
              <span className="live-dot" aria-hidden="true" />
              runs entirely in your browser
            </span>
            <h1 className="mt-7 text-[clamp(40px,7vw,80px)] leading-[1.02] font-semibold tracking-[-0.045em]">
              Developer tools they paywall.
              <br />
              <span className="mt-[0.14em] inline-flex flex-wrap justify-center gap-x-[0.24em] gap-y-[0.1em]">
                <span className="inline-block rounded-[0.14em] bg-add-bg px-[0.16em] pb-[0.03em] leading-[1.02] text-add">Free.</span>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-[0.14em] bg-add-bg px-[0.16em] pb-[0.03em] leading-[1.02] text-add transition-opacity hover:opacity-80"
                >
                  Open source.
                </a>
              </span>
            </h1>
            <p className="mt-6 max-w-[54ch] text-[clamp(17px,2vw,19px)] text-muted-foreground">
              Compare text and code, then format, validate, convert and explore JSON. No account, no limits, and nothing you
              paste ever leaves your browser.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-full px-6">
                <a href="#compare">
                  Browse the tools <ArrowDown />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-6">
                <a href="/diff-checker/">Open the diff checker</a>
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[12.5px] text-muted-foreground">
              {['7 tools', 'unlimited', 'no account', 'nothing uploaded'].map((label) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-add" aria-hidden="true" />
                  {label}
                </li>
              ))}
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-add" aria-hidden="true" />
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">
                  open source
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section id="tools" className="border-t py-20 sm:py-24" aria-label="Tools">
          <div className="page">
            <GroupHeading id="compare" title="Compare">
              See exactly what changed between two versions.
            </GroupHeading>
            <div className="grid gap-4 lg:grid-cols-2">
              {COMPARE.map((t) => (
                <FeatureCard key={t.id} tool={t} />
              ))}
            </div>

            <div className="mt-14">
              <GroupHeading id="json" title="JSON">
                <Braces className="mr-1.5 inline size-4 align-[-2px]" aria-hidden="true" />
                Clean up, check, convert and explore.
              </GroupHeading>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {JSON_TOOLS.map((t) => (
                  <ToolCard key={t.id} tool={t} />
                ))}
                <a
                  href={`${REPO_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-2xl border border-dashed p-6 transition-colors hover:border-foreground/25"
                >
                  <div className="flex items-center gap-3">
                    <IconTile Icon={Lightbulb} />
                    <h4 className="text-[17px] font-semibold tracking-[-0.015em] text-muted-foreground">Missing a tool?</h4>
                  </div>
                  <p className="mt-3 text-[14.5px] text-muted-foreground">
                    Tell us what you'd use. New tools follow the same rules: free, open source, nothing uploaded.
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[14px] font-medium">
                    Suggest a tool
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="border-t py-20 sm:py-28">
          <div className="page">
            <SectionTitle eyebrow="why it's free" title="No servers, so no bill to pass on.">
              Other sites charge because their servers do the work. Here your browser does, so everything is free, with no
              catch.
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {REASONS.map(({ Icon, title, body }) => (
                <div key={title} className="rounded-2xl border p-6">
                  <IconTile Icon={Icon} />
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.015em]">{title}</h3>
                  <p className="mt-2 text-[15px] text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Privacy />
      </main>
      <Footer current="home" />
    </TooltipProvider>
  );
}
