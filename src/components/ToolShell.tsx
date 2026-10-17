import React, { useEffect, useLayoutEffect, useRef } from 'react';
import {
  Asterisk,
  Binary,
  Blend,
  CaseSensitive,
  Code,
  FileText,
  Heading,
  Info,
  Mail,
  Palette,
  Pilcrow,
  QrCode,
  ScanText,
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
  'case-converter': CaseSensitive,
  'title-case': Heading,
  'word-counter': ScanText,
  'password-generator': Asterisk,
  'lorem-ipsum': Pilcrow,
  'qr-code': QrCode,
  'color-converter': Palette,
  'css-gradient': Blend,
  'code-beautifier': Code,
  'markdown-preview': FileText,
  'about': Info,
  contact: Mail,
};

export const TOOL_GROUPS: { label: string; ids: ToolPageId[] }[] = [
  // Within each group, the most searched-for tool comes first
  { label: 'Compare', ids: ['diff-checker', 'json-diff'] },
  { label: 'JSON', ids: ['json-formatter', 'json-validator', 'json-to-csv', 'json-to-yaml', 'json-viewer'] },
  { label: 'Encode', ids: ['base64', 'unix-timestamp', 'jwt-decoder', 'url-encoder'] },
  { label: 'Text', ids: ['word-counter', 'case-converter', 'title-case', 'lorem-ipsum'] },
  { label: 'Generate', ids: ['qr-code', 'password-generator'] },
  { label: 'Design', ids: ['color-converter', 'css-gradient'] },
  { label: 'Code', ids: ['code-beautifier', 'regex-tester', 'markdown-preview'] },
  { label: 'Guides', ids: ['guide-compare-json', 'guide-json-to-csv'] },
];

/**
 * A color per category, for icons (sidebar, cards, palette). Full class names
 * so Tailwind keeps them; dark mode gets lighter text on a translucent tile.
 */
export const GROUP_COLORS: Record<string, { text: string; tile: string }> = {
  Compare: { text: 'text-rose-600 dark:text-rose-400', tile: 'bg-rose-100 dark:bg-rose-500/15' },
  JSON: { text: 'text-amber-600 dark:text-amber-400', tile: 'bg-amber-100 dark:bg-amber-500/15' },
  Encode: { text: 'text-sky-600 dark:text-sky-400', tile: 'bg-sky-100 dark:bg-sky-500/15' },
  Text: { text: 'text-violet-600 dark:text-violet-400', tile: 'bg-violet-100 dark:bg-violet-500/15' },
  Generate: { text: 'text-emerald-600 dark:text-emerald-400', tile: 'bg-emerald-100 dark:bg-emerald-500/15' },
  Design: { text: 'text-pink-600 dark:text-pink-400', tile: 'bg-pink-100 dark:bg-pink-500/15' },
  Code: { text: 'text-indigo-600 dark:text-indigo-400', tile: 'bg-indigo-100 dark:bg-indigo-500/15' },
  Guides: { text: 'text-slate-600 dark:text-slate-300', tile: 'bg-slate-100 dark:bg-slate-500/15' },
};

/** The category a page belongs to, if any. */
export function groupOf(id: PageId): string | undefined {
  return TOOL_GROUPS.find((g) => g.ids.includes(id as ToolPageId))?.label;
}

/** Groups of tools (everything but the guides). */
export const TOOL_ONLY_GROUPS = TOOL_GROUPS.filter((g) => g.label !== 'Guides');

const SideLink: React.FC<{
  href: string;
  active?: boolean;
  external?: boolean;
  Icon: typeof Columns2;
  iconClass?: string;
  children: React.ReactNode;
}> = ({ href, active, external, Icon, iconClass, children }) => (
  <a
    href={href}
    aria-current={active ? 'page' : undefined}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    className={cn(
      'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors',
      active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
    )}
  >
    <Icon className={cn('size-4 shrink-0', iconClass)} aria-hidden="true" />
    {children}
  </a>
);

const SCROLL_KEY = 'diffdrop-sidebar-scroll';
// Layout effects don't run when prerendering; plain effects stand in there
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Every page is a separate load, so the sidebar would start at the top each
 * time. Keep its scroll position across pages, and make sure the current
 * tool is in view.
 */
function useSidebarScroll(ref: React.RefObject<HTMLElement | null>, revealActive: boolean) {
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const saved = Number(sessionStorage.getItem(SCROLL_KEY));
      // The home page always starts at the top
      if (saved && revealActive) el.scrollTop = saved;
    } catch {
      // Storage unavailable: start at the top
    }
    const active = revealActive ? el.querySelector<HTMLElement>('[aria-current="page"]') : null;
    if (active) {
      const top = active.offsetTop - el.offsetTop;
      if (top < el.scrollTop || top + active.offsetHeight > el.scrollTop + el.clientHeight) {
        el.scrollTop = Math.max(0, top - el.clientHeight / 3);
      }
    }
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(Math.round(el.scrollTop)));
      } catch {
        // Ignore
      }
    };
    el.addEventListener('scroll', save, { passive: true });
    window.addEventListener('pagehide', save);
    return () => {
      el.removeEventListener('scroll', save);
      window.removeEventListener('pagehide', save);
    };
  }, [ref, revealActive]);
}

/** Left navigation listing every tool (desktop; on small screens the header menu has them). */
export function Sidebar({ current }: { current: PageId }) {
  const ref = useRef<HTMLElement>(null);
  // The home page's own link sits at the bottom; don't scroll down to it
  useSidebarScroll(ref, current !== 'home');
  return (
    <aside ref={ref} className="tool-sidebar" aria-label="Tools">
      <nav className="flex flex-col gap-6">
        {TOOL_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 font-mono text-[11.5px] text-faint">{group.label.toLowerCase()}</p>
            <div className="flex flex-col gap-0.5">
              {group.ids.map((id) => (
                <SideLink key={id} href={pageById(id).path} active={id === current} Icon={TOOL_ICONS[id]} iconClass={GROUP_COLORS[group.label]?.text}>
                  {pageById(id).name}
                </SideLink>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-0.5 border-t pt-4">
          <SideLink href="/" active={current === 'home'} Icon={LayoutGrid}>
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
  example,
  mistakes,
}: {
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  stepsTitle?: string;
  example?: { intro: string; inputLabel: string; input: string; outputLabel: string; output: string; note?: string };
  mistakes?: { title: string; body: string }[];
}) {
  return (
    <>
      {example && (
        <section id="example" className="mt-12 border-t pt-10" aria-labelledby="example-heading">
          <h2 id="example-heading" className="text-[18px] font-semibold tracking-[-0.015em]">
            Worked example
          </h2>
          <p className="mt-2 max-w-[80ch] text-[14.5px] text-muted-foreground">{example.intro}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(
              [
                [example.inputLabel, example.input],
                [example.outputLabel, example.output],
              ] as const
            ).map(([label, text]) => (
              <figure key={label} className="min-w-0 overflow-hidden rounded-xl border bg-card">
                <figcaption className="border-b px-3 py-2 font-mono text-[11.5px] text-muted-foreground">{label}</figcaption>
                <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">{text}</pre>
              </figure>
            ))}
          </div>
          {example.note && <p className="mt-3 max-w-[80ch] text-[14px] text-muted-foreground">{example.note}</p>}
        </section>
      )}
      {mistakes && (
        <section id="mistakes" className="mt-12 border-t pt-10" aria-labelledby="mistakes-heading">
          <h2 id="mistakes-heading" className="text-[18px] font-semibold tracking-[-0.015em]">
            Common mistakes
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {mistakes.map((m) => (
              <li key={m.title} className="rounded-xl border p-4">
                <h3 className="text-[14.5px] font-semibold">{m.title}</h3>
                <p className="mt-1 text-[14px] text-muted-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
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
    </>
  );
}
