import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Columns2,
  Eraser,
  FileDown,
  FolderOpen,
  GitMerge,
  Keyboard,
  Link2,
  Palette,
  Sparkles,
  TextCursorInput,
  TextSelect,
  WrapText,
} from 'lucide-react';
import { CSP_DIRECTIVES } from '@/csp';
import { Button } from '@/components/ui/button';
import { LogoMark } from './Icons';
import AsciiWordmark from './AsciiWordmark';

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => <kbd className="kbd-inline">{children}</kbd>;

// ─────────────────────────────────────────────────────────────
// Landing screen
// ─────────────────────────────────────────────────────────────

export const Hero: React.FC<{ onTryExample: () => void }> = ({ onTryExample }) => (
  <section id="top" className="flex min-h-[calc(88svh-64px)] items-center py-16 sm:py-24">
    <div className="page flex flex-col items-center text-center">
      <span className="inline-flex h-7 items-center gap-2 rounded-full border px-3 font-mono text-xs text-muted-foreground">
        <span className="live-dot" aria-hidden="true" />
        runs entirely in your browser
      </span>

      <h1 className="mt-7 text-[clamp(40px,7vw,80px)] leading-[1.02] font-semibold tracking-[-0.045em]">
        Everything they paywall.
        <br />
        <span className="mt-[0.14em] inline-block rounded-[0.14em] bg-add-bg px-[0.16em] pb-[0.03em] leading-[1.02] text-add">
          Free.
        </span>
      </h1>
      <p className="mt-4 text-[clamp(20px,2.6vw,28px)] font-medium tracking-[-0.02em] text-muted-foreground">
        Nothing leaves your browser.
      </p>

      <p className="mt-6 max-w-[52ch] text-[16px] text-muted-foreground">
        A free diff checker that runs entirely in your browser. Unlimited use, no account, nothing uploaded.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="h-11 rounded-full px-6">
          <a href="#try">
            Start comparing <ArrowDown />
          </a>
        </Button>
        <Button variant="outline" size="lg" className="h-11 rounded-full px-6" onClick={onTryExample}>
          Load an example
        </Button>
      </div>

      <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[12.5px] text-muted-foreground">
        {['unlimited', 'no account', 'works offline', '0 network requests'].map((t) => (
          <li key={t} className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-add" aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// Features
// ─────────────────────────────────────────────────────────────

const FEATURES: { Icon: typeof Check; title: string; body: React.ReactNode }[] = [
  {
    Icon: TextCursorInput,
    title: 'Real-time editor',
    body: 'Red and green highlights right inside the two text boxes, updating as you type.',
  },
  {
    Icon: Columns2,
    title: 'Split or unified',
    body: 'Side by side, or one column of − and + lines like a code review. Switch any time.',
  },
  {
    Icon: TextSelect,
    title: 'Word & character level',
    body: 'Inside a changed line, see exactly which words moved, or go down to single characters.',
  },
  {
    Icon: Eraser,
    title: 'Ignore what doesn’t matter',
    body: 'Skip whitespace, letter case, or anything a regex matches: timestamps, IDs, hashes.',
  },
  {
    Icon: Palette,
    title: 'Syntax colors',
    body: 'Keywords, strings, numbers and comments, picked up from the file name or the text itself.',
  },
  {
    Icon: GitMerge,
    title: 'Merge line by line',
    body: (
      <>
        Push a line across with the arrows between columns. <Key>⌘</Key> <Key>Z</Key> takes it back.
      </>
    ),
  },
  {
    Icon: WrapText,
    title: 'Hide unchanged, wrap lines',
    body: 'Fold long untouched stretches down to three lines of context, and wrap long lines.',
  },
  {
    Icon: FileDown,
    title: '.patch and PDF',
    body: (
      <>
        A real unified diff that <code>git apply</code> accepts, or a PDF through your browser's own Save as PDF.
      </>
    ),
  },
  {
    Icon: Sparkles,
    title: 'Summary',
    body: 'A plain-language rundown of what changed. In Chrome, it can also ask the AI model built into your browser, on your device.',
  },
  {
    Icon: Link2,
    title: 'Share without a server',
    body: (
      <>
        Links carry both texts, compressed, after the <code>#</code>. Browsers never send that part of a URL anywhere.
      </>
    ),
  },
  {
    Icon: FolderOpen,
    title: 'Open or drop files',
    body: 'Drop a file onto either side. It’s read on your machine, never uploaded.',
  },
  {
    Icon: Keyboard,
    title: 'Keyboard first',
    body: (
      <>
        <Key>Alt</Key> <Key>↑</Key> / <Key>↓</Key> jumps between changes, in either view.
      </>
    ),
  },
];

const SectionTitle: React.FC<{ eyebrow: string; title: React.ReactNode; children?: React.ReactNode }> = ({
  eyebrow,
  title,
  children,
}) => (
  <div className="mb-10 max-w-[640px]">
    <p className="font-mono text-[12.5px] text-muted-foreground">{eyebrow}</p>
    <h2 className="mt-2 text-[clamp(30px,4.4vw,44px)] leading-[1.08] font-semibold tracking-[-0.035em]">{title}</h2>
    {children && <div className="mt-4 text-[16px] text-muted-foreground">{children}</div>}
  </div>
);

export const Features: React.FC = () => (
  <section id="features" className="border-t py-20 sm:py-28">
    <div className="page">
      <SectionTitle eyebrow="features" title="Everything. Unlimited.">
        No trial counters, no "5 left this month". Every feature works as often as you like, because the work
        happens on your computer, not ours.
      </SectionTitle>

      {/* Featured: the algorithm */}
      <div className="grid overflow-hidden rounded-2xl border lg:grid-cols-[1.1fr_1fr]">
        <div className="p-7 sm:p-10">
          <p className="font-mono text-[12.5px] text-muted-foreground">the engine</p>
          <h3 className="mt-2 text-[clamp(24px,3vw,32px)] leading-tight font-semibold tracking-[-0.03em]">
            Myers O(ND). The same algorithm as git.
          </h3>
          <div className="mt-5 space-y-3 text-[15px] text-muted-foreground">
            <p>
              When you run <code>git diff</code>, git uses Eugene Myers' 1986 algorithm to find the{' '}
              <span className="font-medium text-foreground">shortest</span> way to turn one file into another: the
              fewest lines removed and added.
            </p>
            <p>
              diffdrop runs that same algorithm, in the same memory-light form git uses, right here in a background
              thread so typing never stutters. Then it runs it again inside every changed line to pinpoint the exact
              words or characters.
            </p>
            <p>
              It's built for big files too: half a million lines compare in about a second, and only the lines on
              screen are ever drawn. For very large files it first lines up the lines that appear exactly once on each
              side, the same shortcut as git's patience mode.
            </p>
          </div>
        </div>
        <div className="flex items-center border-t bg-[#0a0a0a] p-5 sm:p-8 lg:border-t-0 lg:border-l">
          <pre className="w-full overflow-x-auto font-mono text-[12.5px] leading-[1.8] text-[#d4d4d4]" aria-label="Example git-style diff">
            <span className="text-[#737373]">$ git diff cart.js{'\n'}</span>
            <span className="text-[#737373]">@@ -3,3 +3,4 @@{'\n'}</span>
            <span className="block rounded-sm bg-[rgba(255,82,70,0.2)] px-1 text-[#ff8a80]">- const TAX_RATE = 0.08;</span>
            <span className="block rounded-sm bg-[rgba(46,204,113,0.2)] px-1 text-[#5be08f]">+ const TAX_RATE = 0.0825;</span>
            <span className="block rounded-sm bg-[rgba(46,204,113,0.2)] px-1 text-[#5be08f]">+ const FREE_SHIPPING = 50;</span>
            <span className="block px-1">{'  '}</span>
            <span className="block px-1">{'  '}export function calculateTotal(items) {'{'}</span>
            <span className="mt-3 block text-[#737373]">diffdrop shows the same 2 additions, 1 removal.</span>
          </pre>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ Icon, title, body }) => (
          <article key={title} className="flex flex-col rounded-2xl border p-6 transition-colors hover:bg-muted/60">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-xl border bg-muted">
                <Icon className="size-[18px]" strokeWidth={1.75} />
              </span>
              <span className="font-mono text-[11px] text-add">unlimited</span>
            </div>
            <h3 className="mt-5 text-[15.5px] font-semibold tracking-[-0.01em]">{title}</h3>
            <p className="mt-1.5 text-[14.5px] text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// The paywall comparison
// ─────────────────────────────────────────────────────────────

const PAYWALL: { feature: string; limit: string; note?: boolean }[] = [
  { feature: 'Unified view', limit: '5 / month' },
  { feature: 'Real-time editor', limit: '5 / month' },
  { feature: 'Character-level diff', limit: '10 / month' },
  { feature: 'Hide whitespace', limit: '5 / month' },
  { feature: 'Custom ignore rules', limit: '5 / month' },
  { feature: 'Syntax highlighting', limit: '5 / month' },
  { feature: 'Merge changes', limit: '10 / month' },
  { feature: 'Line wrap', limit: '5 / month' },
  { feature: 'Hide unchanged lines', limit: '5 / month' },
  { feature: 'PDF export', limit: '5 / month' },
  { feature: 'AI diff summary', limit: '5 / month', note: true },
];

export const Paywall: React.FC = () => (
  <section id="free" className="border-t py-20 sm:py-28">
    <div className="page">
      <SectionTitle eyebrow="why it's free" title="They paywall it. We don't.">
        Other diff checkers meter their best features on the free plan. diffdrop has no plans at all, because there's
        nothing for us to pay for: your browser does all the work, so every use costs us exactly nothing.
      </SectionTitle>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[520px] border-collapse text-left text-[14.5px]">
          <thead>
            <tr className="border-b font-mono text-[12px] text-muted-foreground">
              <th className="px-5 py-3.5 font-normal sm:px-7">feature</th>
              <th className="px-4 py-3.5 font-normal">others, free plan</th>
              <th className="bg-muted px-5 py-3.5 font-normal text-foreground sm:px-7">diffdrop</th>
            </tr>
          </thead>
          <tbody>
            {PAYWALL.map(({ feature, limit, note }) => (
              <tr key={feature} className="border-b last:border-b-0">
                <td className="px-5 py-3 sm:px-7">{feature}</td>
                <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{limit}</td>
                <td className="bg-muted px-5 py-3 sm:px-7">
                  <span className="inline-flex items-center gap-1.5 font-medium text-add">
                    <Check className="size-4" /> Unlimited{note && '*'}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="border-t">
              <td className="px-5 py-4 font-medium sm:px-7">To unlock everything</td>
              <td className="px-4 py-4 font-mono text-[13px] text-muted-foreground">$15 / month</td>
              <td className="bg-muted px-5 py-4 text-[20px] font-semibold tracking-[-0.02em] sm:px-7">$0, forever</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[80ch] text-[13px] text-muted-foreground">
        "Others" means the free plan of a popular online diff checker, as listed in October 2026. *diffdrop's
        plain-language summary works everywhere; the extra AI explanation uses the model built into Chrome and runs on
        your device.
      </p>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// Privacy
// ─────────────────────────────────────────────────────────────

export const Privacy: React.FC = () => (
  <section id="privacy" className="border-t py-20 sm:py-28">
    <div className="page grid items-start gap-x-12 gap-y-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="md:sticky md:top-24">
        <p className="font-mono text-[12.5px] text-muted-foreground">privacy</p>
        <h2 className="mt-2 text-[clamp(30px,4.4vw,44px)] leading-[1.08] font-semibold tracking-[-0.035em]">
          How it stays private
        </h2>
      </div>
      <div className="max-w-[64ch] space-y-4 text-[16px] text-muted-foreground">
        <p>
          There's <span className="em-safe">no backend</span>. Text you paste and files you open are read into memory in
          this tab and diffed on your machine. Close the tab and they're gone. The only thing diffdrop remembers is your
          theme.
        </p>
        <p>
          You don't have to <span className="em-safe">take that on trust</span>. The page ships with a Content Security
          Policy that tells your browser to refuse every outgoing request it might try to make:
        </p>
        <pre
          className="overflow-x-auto rounded-xl border bg-muted px-5 py-4 font-mono text-[12.5px] leading-7 text-foreground/80"
          aria-label="Content Security Policy"
        >
          {CSP_DIRECTIVES.map((d) => (
            <span key={d} className={d.startsWith('connect-src') ? 'csp-hl' : undefined}>
              {d};{'\n'}
            </span>
          ))}
        </pre>
        <p className="text-[15px]">
          Open your browser's network panel while you use it. After the page loads,{' '}
          <span className="em-safe">it stays empty</span>.
        </p>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────

export const Footer: React.FC = () => (
  <footer className="overflow-hidden border-t">
    <div className="page flex flex-wrap items-center gap-x-6 gap-y-3 pt-10 pb-2">
      <span className="flex items-center gap-2.5">
        <LogoMark size={26} />
        <span className="text-[17px] font-semibold tracking-[-0.02em]">diffdrop</span>
      </span>
      <span className="font-mono text-xs text-muted-foreground">free, unlimited, and everything stays in this tab</span>
      <nav className="ml-auto flex items-center gap-1" aria-label="Footer">
        <Button asChild variant="ghost" size="sm" className="font-normal text-muted-foreground">
          <a href="#features">Features</a>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-normal text-muted-foreground">
          <a href="#privacy">Privacy</a>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full font-normal">
          <a href="#top">
            Top <ArrowUp />
          </a>
        </Button>
      </nav>
    </div>
    <div className="page pt-8 pb-10">
      <AsciiWordmark />
    </div>
  </footer>
);
