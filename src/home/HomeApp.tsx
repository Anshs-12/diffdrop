import React from 'react';
import { ArrowDown, ArrowRight, Check, Infinity as InfinityIcon, Lightbulb, Scale, Server } from 'lucide-react';
import { pageById, REPO_URL } from '@/site';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader, { type HeaderSection } from '@/components/SiteHeader';
import { Footer, Privacy, SectionTitle } from '@/components/Landing';
import { TOOL_GROUPS, TOOL_ICONS, TOOL_ONLY_GROUPS, type ToolPageId } from '@/components/ToolShell';

const SECTIONS: HeaderSection[] = [
  { id: 'tools', label: 'Tools' },
  { id: 'guides', label: 'Guides' },
  { id: 'why', label: 'Why free' },
  { id: 'privacy', label: 'Privacy' },
];

/** What each tool card lists under its description. */
const TOOL_COUNT = TOOL_ONLY_GROUPS.reduce((n, g) => n + g.ids.length, 0);
const GUIDES = TOOL_GROUPS.find((g) => g.label === 'Guides')!.ids;

const POINTS: Partial<Record<ToolPageId, string[]>> = {
  'diff-checker': ['Line and word level changes', 'Files of 100,000+ lines'],
  'json-diff': ['Ignores key order and formatting', 'Every changed key and value'],
  'json-formatter': ['2 or 4 spaces, tabs or minified', 'Sort keys A–Z'],
  'json-validator': ['Exact line and column of errors', 'Duplicate key warnings'],
  'json-to-csv': ['Nested objects become columns', 'Opens cleanly in Excel'],
  'json-to-yaml': ['Clean block-style YAML', 'Quotes only what YAML needs'],
  'json-viewer': ['Collapsible, searchable tree', 'Click to copy any path'],
  base64: ['Text, images and files', 'UTF-8 and URL-safe'],
  'unix-timestamp': ['Seconds to nanoseconds, auto-detected', 'Any time zone, ISO 8601'],
  'jwt-decoder': ['Header, payload and expiry', 'Verify HS, RS, PS and ES signatures'],
  'regex-tester': ['Live matches and capture groups', 'Replace preview, safe from hangs'],
  'url-encoder': ['Component, full URL or form style', 'Any URL split into its parts'],
};

const IconTile: React.FC<{ Icon: typeof Check }> = ({ Icon }) => (
  <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-background">
    <Icon className="size-[18px]" aria-hidden="true" />
  </span>
);

const cardClass = 'group flex flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/25';

const ToolCard: React.FC<{ id: ToolPageId; group: string }> = ({ id, group }) => {
  const page = pageById(id);
  return (
    <a href={page.path} className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <IconTile Icon={TOOL_ICONS[id]} />
        <span className="font-mono text-[11px] text-faint">{group.toLowerCase()}</span>
      </div>
      <h3 className="mt-4 text-[16.5px] font-semibold tracking-[-0.015em]">{page.name}</h3>
      <p className="mt-1 text-[14px] text-muted-foreground">{page.blurb}</p>
      <ul className="mt-3 space-y-1 text-[13.5px] text-muted-foreground">
        {(POINTS[id] ?? []).map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check className="mt-[3px] size-3.5 shrink-0 text-add" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13.5px] font-medium">
        Open
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </a>
  );
};

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
              Compare text and JSON, format and convert JSON, decode Base64 and JWTs, convert timestamps and test regexes. No
              account, no limits, and nothing you paste ever leaves your browser.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-full px-6">
                <a href="#tools">
                  Browse the tools <ArrowDown />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-6">
                <a href="/diff-checker/">Open the diff checker</a>
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[12.5px] text-muted-foreground">
              {[`${TOOL_COUNT} tools`, 'unlimited', 'no account', 'nothing uploaded'].map((label) => (
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

        <section id="tools" className="scroll-mt-16 border-t py-20 sm:py-24">
          <div className="page">
            <SectionTitle eyebrow="tools" title="Pick a tool.">
              Each one runs entirely in this tab: nothing to install, nothing uploaded.
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TOOL_ONLY_GROUPS.flatMap((g) => g.ids.map((id) => <ToolCard key={id} id={id} group={g.label} />))}
              <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className={`${cardClass} border-dashed bg-transparent`}>
                <IconTile Icon={Lightbulb} />
                <h3 className="mt-4 text-[16.5px] font-semibold tracking-[-0.015em]">Missing a tool?</h3>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Tell us what you'd use. New tools follow the same rules: free, open source, nothing uploaded.
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13.5px] font-medium">
                  Suggest a tool
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </a>
            </div>
          </div>
        </section>

        <section id="guides" className="scroll-mt-16 border-t py-20 sm:py-24">
          <div className="page">
            <SectionTitle eyebrow="guides" title="Do it right the first time.">
              Short, practical guides to the jobs these tools are for.
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              {GUIDES.map((id) => {
                const page = pageById(id);
                return (
                  <a key={id} href={page.path} className={cardClass}>
                    <IconTile Icon={TOOL_ICONS[id]} />
                    <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.015em]">{page.title}</h3>
                    <p className="mt-1.5 text-[14.5px] text-muted-foreground">{page.description}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13.5px] font-medium">
                      Read the guide
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </a>
                );
              })}
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
