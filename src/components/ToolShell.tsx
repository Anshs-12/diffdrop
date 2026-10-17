import React from 'react';
import {
  Binary,
  BookOpen,
  Clock,
  Columns2,
  KeyRound,
  Link,
  Regex,
  FileCode,
  GitCompareArrows,
  LayoutGrid,
  Lightbulb,
  ListTree,
  Sheet,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { pageById, REPO_URL, type PageId } from '@/site';

export type ToolPageId = Exclude<PageId, 'home'>;

export const TOOL_ICONS: Record<ToolPageId, typeof Columns2> = {
  'diff-checker': GitCompareArrows,
  'json-diff': Columns2,
  'json-formatter': WandSparkles,
  'json-validator': ShieldCheck,
  'json-to-csv': Sheet,
  'json-to-yaml': FileCode,
  'json-viewer': ListTree,
  base64: Binary,
  'unix-timestamp': Clock,
  'jwt-decoder': KeyRound,
  'regex-tester': Regex,
  'url-encoder': Link,
  'guide-compare-json': BookOpen,
  'guide-json-to-csv': BookOpen,
};

export const TOOL_GROUPS: { label: string; ids: ToolPageId[] }[] = [
  { label: 'Compare', ids: ['diff-checker', 'json-diff'] },
  { label: 'JSON', ids: ['json-formatter', 'json-validator', 'json-to-csv', 'json-to-yaml', 'json-viewer'] },
  // Ordered by how many people search for each
  { label: 'Encode & test', ids: ['base64', 'unix-timestamp', 'jwt-decoder', 'regex-tester', 'url-encoder'] },
  { label: 'Guides', ids: ['guide-compare-json', 'guide-json-to-csv'] },
];

/** Groups of tools (everything but the guides). */
export const TOOL_ONLY_GROUPS = TOOL_GROUPS.filter((g) => g.label !== 'Guides');

const SideLink: React.FC<{ href: string; active?: boolean; external?: boolean; Icon: typeof Columns2; children: React.ReactNode }> = ({
  href,
  active,
  external,
  Icon,
  children,
}) => (
  <a
    href={href}
    aria-current={active ? 'page' : undefined}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    className={cn(
      'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors',
      active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
    )}
  >
    <Icon className="size-4 shrink-0" aria-hidden="true" />
    {children}
  </a>
);

/** Left navigation listing every tool (desktop; on small screens the header menu has them). */
function Sidebar({ current }: { current: ToolPageId }) {
  return (
    <aside className="tool-sidebar" aria-label="Tools">
      <nav className="flex flex-col gap-6">
        {TOOL_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 font-mono text-[11.5px] text-faint">{group.label.toLowerCase()}</p>
            <div className="flex flex-col gap-0.5">
              {group.ids.map((id) => (
                <SideLink key={id} href={pageById(id).path} active={id === current} Icon={TOOL_ICONS[id]}>
                  {pageById(id).name}
                </SideLink>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-0.5 border-t pt-4">
          <SideLink href="/" Icon={LayoutGrid}>
            All tools
          </SideLink>
          <SideLink href={`${REPO_URL}/issues`} external Icon={Lightbulb}>
            Suggest a tool
          </SideLink>
        </div>
      </nav>
    </aside>
  );
}

/**
 * App-style layout for a tool: sidebar on the left; on the right a compact
 * heading, the tool, then whatever follows (how-to, FAQ).
 */
export default function ToolShell({
  current,
  title,
  description,
  actions,
  tool,
  children,
}: {
  current: ToolPageId;
  title: string;
  description: React.ReactNode;
  /** Buttons at the right of the heading. */
  actions?: React.ReactNode;
  tool: React.ReactNode;
  /** Content below the tool. */
  children?: React.ReactNode;
}) {
  return (
    <div className="page-wide tool-shell">
      <Sidebar current={current} />
      <main id="top" className="min-w-0 pt-6 pb-16 lg:pl-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.025em]">{title}</h1>
            <p className="mt-1 max-w-[80ch] text-[14.5px] text-muted-foreground">{description}</p>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <section id="tool" aria-label={title}>
          {tool}
        </section>
        {children}
      </main>
    </div>
  );
}

/** How-it-works steps and FAQ, compact, under a tool. */
export function ToolGuide({
  steps,
  faq,
  stepsTitle = 'How it works',
}: {
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  stepsTitle?: string;
}) {
  return (
    <section id="how" className="mt-12 grid items-start gap-x-12 gap-y-10 border-t pt-10 md:grid-cols-2">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.015em]">{stepsTitle}</h2>
        <ol className="mt-4 space-y-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs">{i + 1}</span>
              <div>
                <h3 className="text-[14.5px] font-semibold">{step.title}</h3>
                <p className="mt-0.5 text-[14px] text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.015em]">Questions</h2>
        <dl className="mt-4 divide-y">
          {faq.map(({ q, a }) => (
            <div key={q} className="py-3 first:pt-0">
              <dt className="text-[14.5px] font-semibold">{q}</dt>
              <dd className="mt-0.5 text-[14px] text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
