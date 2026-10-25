import { useMemo, useState } from 'react';
import { ArrowRight, Check, Lightbulb, Lock, Scale, Search, UserX } from 'lucide-react';
import { pageById, REPO_URL, type PageId } from '@/site';
import { searchPages } from '@/lib/search';
import { BADGES } from './badges';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader from '@/components/SiteHeader';
import { Footer } from '@/components/Landing';
import { GROUP_COLORS, Sidebar, TOOL_GROUPS, TOOL_ICONS, TOOL_ONLY_GROUPS, groupOf, type ToolPageId } from '@/components/ToolShell';

const TOOLS = TOOL_ONLY_GROUPS.flatMap((g) => g.ids.map(pageById));

/** The most-used tools, shown large at the top. */
export const POPULAR: ToolPageId[] = ['diff-checker', 'json-formatter', 'base64', 'qr-code', 'word-counter', 'password-generator'];

const CATEGORIES = ['All', ...TOOL_ONLY_GROUPS.map((g) => g.label)];

function IconTile({ id, size = 'md' }: { id: PageId; size?: 'md' | 'lg' }) {
  const Icon = TOOL_ICONS[id as ToolPageId];
  const color = GROUP_COLORS[groupOf(id) ?? 'Guides']!;
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl', color.tile, size === 'lg' ? 'size-12' : 'size-10')}>
      <Icon className={cn(color.text, size === 'lg' ? 'size-6' : 'size-5')} aria-hidden="true" />
    </span>
  );
}

/** A tool card: colored icon, name, one line on what it does. */
function ToolCard({ id }: { id: PageId }) {
  const page = pageById(id);
  return (
    <a
      href={page.path}
      className="group flex items-start gap-3 rounded-2xl border bg-card p-4 transition-all sm:flex-col sm:p-5 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
    >
      <IconTile id={id} />
      <span>
        <span className="block text-[16px] font-semibold tracking-[-0.01em]">{page.name}</span>
        <span className="mt-1 block text-[14px] leading-snug text-muted-foreground">{page.blurb}</span>
      </span>
    </a>
  );
}

/** A larger card for the popular tools. */
function PopularCard({ id }: { id: ToolPageId }) {
  const page = pageById(id);
  return (
    <a
      href={page.path}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
    >
      <IconTile id={id} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold tracking-[-0.015em]">{page.name}</span>
        <span className="mt-0.5 block text-[14px] leading-snug text-muted-foreground">{page.blurb}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </a>
  );
}

export const PROMISES = [
  { Icon: Lock, title: 'Nothing is uploaded', body: 'Every tool runs in your browser. Your data never leaves this tab.' },
  { Icon: UserX, title: 'No sign-up, no limits', body: 'No accounts, no daily caps, no "pro" plan. Use anything as often as you like.' },
  { Icon: Scale, title: 'Open source', body: 'MIT licensed. Read the code, run it yourself, or help improve it.' },
];

/** The home page: sidebar of tools; popular tools; every tool by category. */
export default function HomeApp() {
  const { resolved, setChoice: setTheme } = useTheme();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const inCategory = category === 'All' ? TOOLS : TOOL_GROUPS.find((g) => g.label === category)!.ids.map(pageById);
    return query.trim() ? searchPages(query, inCategory) : inCategory;
  }, [category, query]);

  return (
    <TooltipProvider delayDuration={300}>
      <SiteHeader current="home" app resolvedTheme={resolved} onThemeChange={setTheme} />
      <div className="page-wide tool-shell">
        <Sidebar current="home" />
        <main id="top" className="min-w-0 pt-10 pb-16 lg:pl-10">
          <section className="text-center lg:pt-4">
            <h1 className="text-[clamp(30px,4.6vw,50px)] leading-[1.08] font-semibold tracking-[-0.04em]">
              All the developer tools, in one place.
              <span className="mt-[0.18em] flex flex-wrap justify-center gap-x-[0.22em] gap-y-[0.1em]">
                <span className="inline-block rounded-[0.14em] bg-add-bg px-[0.14em] pb-[0.04em] text-add">Free.</span>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-block rounded-[0.14em] bg-add-bg px-[0.14em] pb-[0.04em] text-add hover:opacity-80">
                  Open source.
                </a>
              </span>
            </h1>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[12.5px] text-muted-foreground" aria-label="Highlights">
              {['no login', 'no sign-up', 'no uploads', 'no limits'].map((label) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-add" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10" aria-labelledby="popular-heading">
            <h2 id="popular-heading" className="mb-3 text-[15px] font-semibold">
              Popular tools
            </h2>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {POPULAR.map((id) => (
                <PopularCard key={id} id={id} />
              ))}
            </div>
          </section>

          <section id="tools" className="mt-12 scroll-mt-20" aria-labelledby="all-heading">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              <h2 id="all-heading" className="text-[15px] font-semibold">
                All tools
              </h2>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categories">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={category === c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'h-8 rounded-full border px-3.5 text-[13.5px] transition-colors',
                      category === c ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="flex h-9 w-full items-center gap-2 rounded-lg border bg-card px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 sm:ml-auto sm:w-60">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter tools"
                  aria-label="Filter tools"
                  spellCheck={false}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
                />
              </label>
            </div>
            {shown.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" role="tabpanel" aria-label={`${category} tools`}>
                {shown.map((p) => (
                  <ToolCard key={p.id} id={p.id} />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-muted-foreground">
                No tool matches "{query}".{' '}
                <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  Suggest it
                </a>
                ?
              </p>
            )}
          </section>

          <section className="mt-12 grid gap-3 md:grid-cols-3" aria-label="Why toolspace">
            {PROMISES.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border p-5">
                <Icon className="size-5 text-add" aria-hidden="true" />
                <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1 text-[14px] text-muted-foreground">{body}</p>
              </div>
            ))}
          </section>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px]">
            <a href="/about/" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              About toolspace
            </a>
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              <Lightbulb className="size-3.5" aria-hidden="true" /> Suggest a tool
            </a>
          </p>
          {BADGES.length > 0 && (
            <section className="mt-14 flex flex-col items-center gap-3 border-t pt-10" aria-label="Featured on sites">
              <p className="font-mono text-[11.5px] text-muted-foreground">featured on</p>
              <ul className="flex flex-wrap items-center justify-center gap-3" aria-label="Featured on">
                {BADGES.map((b) => (
                  <li key={b.name}>
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Featured on ${b.name}`}
                      className="flex h-[52px] w-[228px] items-center gap-3 rounded-xl border border-[#e2e2dd] bg-white px-3 text-left text-[#141413] shadow-sm transition-colors hover:border-[#b9b9b1]"
                    >
                      {/* Badges stay white in both themes, like the listing sites' own badges */}
                      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg">
                        <img src={b.logo} alt="" width={32} height={32} loading="lazy" decoding="async" className="size-full object-contain" />
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className="block font-mono text-[9.5px] tracking-[0.08em] text-[#5c5c56] uppercase">Featured on</span>
                        <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">{b.name}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
      <Footer current="home" />
    </TooltipProvider>
  );
}
