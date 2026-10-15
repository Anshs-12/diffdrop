import React, { useEffect, useState, useMemo } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeChoice } from '@/lib/theme';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { REPO_URL } from '@/site';
import { GitHubIcon, LogoMark } from './Icons';

export interface HeaderSection {
  id: string;
  label: string;
}

/** Sections of the diff pages; tool pages pass their own. */
export const DIFF_SECTIONS: HeaderSection[] = [
  { id: 'try', label: 'Try it' },
  { id: 'features', label: 'Features' },
  { id: 'free', label: 'Why free' },
  { id: 'privacy', label: 'Privacy' },
];

const THEMES: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'Match system', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

/** Which section is currently under the header, for highlighting its nav link. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        setActive(ids.find((id) => visible.get(id)) ?? null);
      },
      // A thin band just below the header decides what counts as "current"
      { rootMargin: '-80px 0px -70% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}


interface SiteHeaderProps {
  sections?: HeaderSection[];
  theme: ThemeChoice;
  onThemeChange: (choice: ThemeChoice) => void;
}

const SiteHeader: React.FC<SiteHeaderProps> = ({ sections = DIFF_SECTIONS, theme, onThemeChange }) => {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const active = useActiveSection(ids);

  return (
    <header className="site-header">
      <div className="page flex h-16 items-center gap-4">
        <a href="#top" className="flex items-center gap-2.5" aria-label="diffdrop, back to top">
          <LogoMark size={32} />
          <span className="text-[21px] leading-none font-semibold tracking-tight">diffdrop</span>
        </a>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              tabIndex={0}
              className="hidden h-7 gap-2 rounded-full border bg-transparent px-3 font-mono text-[11.5px] font-normal text-foreground sm:inline-flex"
            >
              <span className="live-dot" aria-hidden="true" />
              100% local · free
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-60 text-center">
            Your text never leaves this tab: no uploads, no accounts.
          </TooltipContent>
        </Tooltip>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Sections">
          {sections.map(({ id, label }) => (
            <Button
              key={id}
              asChild
              variant="ghost"
              size="sm"
              className="nav-link relative h-9 px-3 text-[14px] font-normal text-muted-foreground"
            >
              <a href={`#${id}`} data-active={active === id} aria-current={active === id ? 'true' : undefined}>
                {label}
              </a>
            </Button>
          ))}
        </nav>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="outline" size="icon-sm" className="ml-auto bg-card md:ml-2">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="diffdrop on GitHub">
                <GitHubIcon className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Source on GitHub</TooltipContent>
        </Tooltip>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={theme}
          onValueChange={(v) => v && onThemeChange(v as ThemeChoice)}
          aria-label="Color theme"
          className="-ml-2 rounded-full bg-card"
        >
          {THEMES.map(({ value, label, Icon }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem value={value} aria-label={label} className="px-2.5">
                  <Icon />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </div>
    </header>
  );
};

export default SiteHeader;
