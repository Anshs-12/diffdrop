import React, { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeChoice } from '@/lib/theme';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogoMark } from './Icons';

const SECTIONS = [
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

const SECTION_IDS = SECTIONS.map((s) => s.id);

interface SiteHeaderProps {
  theme: ThemeChoice;
  onThemeChange: (choice: ThemeChoice) => void;
}

const SiteHeader: React.FC<SiteHeaderProps> = ({ theme, onThemeChange }) => {
  const active = useActiveSection(SECTION_IDS);

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
            Your text never leaves this tab. The page is blocked from making network requests.
          </TooltipContent>
        </Tooltip>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Sections">
          {SECTIONS.map(({ id, label }) => (
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

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={theme}
          onValueChange={(v) => v && onThemeChange(v as ThemeChoice)}
          aria-label="Color theme"
          className="ml-auto rounded-full bg-card md:ml-2"
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
