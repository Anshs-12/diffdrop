import React, { useEffect, useState } from 'react';
import { Menu, Moon, Search, Sun } from 'lucide-react';
import type { ResolvedTheme, ThemeChoice } from '@/lib/theme';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { pageById, REPO_URL, type PageId } from '@/site';
import CommandPalette from './CommandPalette';
import { TOOL_GROUPS } from './ToolShell';
import { GitHubIcon, LogoMark } from './Icons';

const SITE_LINKS: PageId[] = ['home', 'about', 'contact'];

/** Whether the OS prefers dark, read live. */
function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** One sun/moon switch. Follows the system until flipped; flipping back to the system's choice follows it again. */
function ThemeSwitch({ resolved, onChange }: { resolved: ResolvedTheme; onChange: (choice: ThemeChoice) => void }) {
  const next: ResolvedTheme = resolved === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} theme`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="bg-card"
          aria-label={label}
          onClick={() => onChange(next === (systemDark() ? 'dark' : 'light') ? 'system' : next)}
        >
          {resolved === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

interface SiteHeaderProps {
  /** The page being shown, marked in the menu. */
  current: PageId;
  /** Tool pages: full width, to line up with the sidebar. */
  app?: boolean;
  resolvedTheme: ResolvedTheme;
  onThemeChange: (choice: ThemeChoice) => void;
}

const SiteHeader: React.FC<SiteHeaderProps> = ({ current, app = false, resolvedTheme, onThemeChange }) => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Prerendered pages don't know the platform; ⌘ is the guess until the browser says otherwise
  const [mod, setMod] = useState('⌘');
  // Set once the keyboard shortcut is listening (pages are prerendered, so the HTML arrives first)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setMod('Ctrl');
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    setReady(true);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="site-header" data-ready={ready || undefined}>
      <div className={cn(app ? 'page-wide' : 'page', 'flex h-16 items-center gap-3')}>
        <a
          href={current === 'home' ? '#top' : '/'}
          className="flex items-center gap-2.5"
          aria-label={current === 'home' ? 'toolspace, back to top' : 'toolspace home'}
        >
          <LogoMark size={32} />
          <span className="text-[21px] leading-none font-semibold tracking-tight">toolspace</span>
        </a>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              tabIndex={0}
              className="ml-1 hidden h-7 gap-2 rounded-full border bg-transparent px-3 font-mono text-[11.5px] font-normal text-foreground sm:inline-flex"
            >
              <span className="live-dot" aria-hidden="true" />
              100% local · free
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-60 text-center">Your data never leaves this tab: no uploads, no accounts.</TooltipContent>
        </Tooltip>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="-ml-1 hidden h-7 items-center gap-1.5 rounded-full border px-3 font-mono text-[11.5px] text-foreground transition-colors hover:bg-muted md:inline-flex"
        >
          <GitHubIcon className="size-3" />
          open source
        </a>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search tools"
          aria-keyshortcuts="Meta+K Control+K"
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground sm:w-56 lg:w-64"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Search tools…</span>
          <kbd className="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[11px] sm:inline">{mod} K</kbd>
        </button>

        <nav className="hidden items-center lg:flex" aria-label="Site">
          {(['about', 'contact'] as const).map((id) => (
            <Button key={id} asChild variant="ghost" size="sm" className="h-9 px-3 text-[14px] font-normal text-muted-foreground">
              <a href={pageById(id).path} aria-current={current === id ? 'page' : undefined}>
                {pageById(id).name}
              </a>
            </Button>
          ))}
        </nav>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="outline" size="icon-sm" className="hidden bg-card sm:inline-flex">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="toolspace on GitHub">
                <GitHubIcon className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Source on GitHub</TooltipContent>
        </Tooltip>

        <ThemeSwitch resolved={resolvedTheme} onChange={onThemeChange} />

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" className="bg-card lg:hidden" aria-label="Menu">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[75svh] w-64 overflow-y-auto">
            {TOOL_GROUPS.map((group) => (
              <React.Fragment key={group.label}>
                <DropdownMenuLabel className="pt-2 font-mono text-[11px] font-normal text-faint">{group.label.toLowerCase()}</DropdownMenuLabel>
                {group.ids.map((id) => (
                  <DropdownMenuItem key={id} asChild>
                    <a href={pageById(id).path} aria-current={id === current ? 'page' : undefined} className={id === current ? 'font-semibold' : undefined}>
                      {pageById(id).name}
                    </a>
                  </DropdownMenuItem>
                ))}
              </React.Fragment>
            ))}
            <DropdownMenuSeparator />
            {SITE_LINKS.map((id) => (
              <DropdownMenuItem key={id} asChild>
                <a href={pageById(id).path} aria-current={id === current ? 'page' : undefined}>
                  {pageById(id).name}
                </a>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
};

export default SiteHeader;
