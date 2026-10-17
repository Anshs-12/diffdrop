import React from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Download,
  FileDown,
  FileText,
  Link2,
  PanelBottom,
  Rows2,
  Sparkles,
  TextCursorInput,
  Undo2,
} from 'lucide-react';
import type { DiffStats } from '@/lib/diffProcessor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import IgnoreRules from './IgnoreRules';

export type ViewMode = 'split' | 'unified';
export type HighlightPlacement = 'editor' | 'below';

export interface ToolbarOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  charLevel: boolean;
  syntax: boolean;
  collapseUnchanged: boolean;
  lineWrap: boolean;
}

interface ToolbarProps {
  placement: HighlightPlacement;
  onPlacementChange: (placement: HighlightPlacement) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  options: ToolbarOptions;
  onOptionChange: (key: keyof ToolbarOptions, value: boolean) => void;
  ignorePatterns: string[];
  onIgnorePatternsChange: (patterns: string[]) => void;
  stats: DiffStats | null;
  hunkCount: number;
  currentHunk: number;
  onPrevHunk: () => void;
  onNextHunk: () => void;
  canUndo: boolean;
  onUndo: () => void;
  onSwap: () => void;
  onShare: () => void;
  summaryOpen: boolean;
  onToggleSummary: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

const OPTIONS: { key: keyof ToolbarOptions; label: string; tip: string; belowOnly?: boolean }[] = [
  { key: 'ignoreWhitespace', label: 'Ignore whitespace', tip: 'Treat runs of spaces and tabs as equal' },
  { key: 'ignoreCase', label: 'Ignore case', tip: 'Treat upper and lower case as equal' },
  { key: 'charLevel', label: 'Character-level', tip: 'Mark changed characters instead of changed words' },
  { key: 'syntax', label: 'Syntax colors', tip: 'Color code by language (detected from file name or content)' },
  { key: 'collapseUnchanged', label: 'Hide unchanged', tip: 'Fold unchanged stretches down to 3 lines of context', belowOnly: true },
  { key: 'lineWrap', label: 'Wrap lines', tip: 'Wrap long lines instead of scrolling sideways', belowOnly: true },
];

/**
 * A button with a tooltip. The label shows on phones (no hover, so no tooltip;
 * the toolbar wraps) and on wide screens; in between it's icon-only.
 */
const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  tip: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
}> = ({ icon, label, tip, onClick, pressed }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        aria-label={label}
        aria-pressed={pressed}
        className={pressed ? 'bg-accent' : undefined}
      >
        {icon}
        <span className="sm:hidden xl:inline">{label}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{tip}</TooltipContent>
  </Tooltip>
);

const Toolbar: React.FC<ToolbarProps> = (p) => (
  <div className="toolbar">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={p.placement}
        onValueChange={(v) => v && p.onPlacementChange(v as HighlightPlacement)}
        aria-label="Where to show changes"
      >
        {/* Tooltips sit inside the items: as the trigger, they would overwrite the item's data-state (on/off) */}
        <ToggleGroupItem value="editor" aria-label="Highlight changes in the editors">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-2">
                <TextCursorInput />
                <span>In editor</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Real-time: highlight changes inside the text boxes as you type</TooltipContent>
          </Tooltip>
        </ToggleGroupItem>
        <ToggleGroupItem value="below" aria-label="Show changes in a separate panel">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-2">
                <PanelBottom />
                <span>Separate</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Show the diff in its own panel below the editors</TooltipContent>
          </Tooltip>
        </ToggleGroupItem>
      </ToggleGroup>

      {p.placement === 'below' && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={p.viewMode}
          onValueChange={(v) => v && p.onViewModeChange(v as ViewMode)}
          aria-label="Diff layout"
        >
          <ToggleGroupItem value="split" aria-label="Side by side" title="Side by side">
            <Columns2 />
            <span>Split</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="unified" aria-label="Unified" title="Unified: one column, removed lines above added ones">
            <Rows2 />
            <span>Unified</span>
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      <Separator orientation="vertical" className="hidden data-[orientation=vertical]:h-5 sm:block" />

      {p.stats && (
        <div className="flex items-center gap-1.5" aria-label="Change summary">
          <Badge variant="outline" className="border-add/25 bg-add-bg font-mono text-add tabular-nums">
            +{p.stats.added.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="border-del/25 bg-del-bg font-mono text-del tabular-nums">
            −{p.stats.removed.toLocaleString()}
          </Badge>
        </div>
      )}

      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={p.onPrevHunk} disabled={p.hunkCount === 0} aria-label="Previous change">
              <ChevronUp />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Previous change{' '}
            <KbdGroup>
              <Kbd>Alt</Kbd>
              <Kbd>↑</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
        <span className="min-w-11 text-center font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {p.hunkCount > 0 ? `${p.currentHunk + 1}/${p.hunkCount}` : '0/0'}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={p.onNextHunk} disabled={p.hunkCount === 0} aria-label="Next change">
              <ChevronDown />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Next change{' '}
            <KbdGroup>
              <Kbd>Alt</Kbd>
              <Kbd>↓</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1">
        {p.canUndo && (
          <ActionButton
            icon={<Undo2 />}
            label="Undo"
            onClick={p.onUndo}
            tip={
              <>
                Undo last merge{' '}
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>Z</Kbd>
                </KbdGroup>
              </>
            }
          />
        )}
        <ActionButton icon={<ArrowLeftRight />} label="Swap" tip="Swap a and b" onClick={p.onSwap} />
        <ActionButton
          icon={<Link2 />}
          label="Share"
          tip="Copy a link with both texts inside. They live after the #, which is never sent to a server."
          onClick={p.onShare}
        />
        <ActionButton
          icon={<Sparkles />}
          label="Summary"
          tip="Summarize what changed"
          onClick={p.onToggleSummary}
          pressed={p.summaryOpen}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="ml-1">
              <Download />
              Export
              <ChevronDown className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={p.onCopy}>
              <Copy /> Copy unified diff
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={p.onDownload}>
              <FileDown /> Download .patch
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={p.onPrint}>
              <FileText /> Save as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-dashed px-4 py-2.5">
      {OPTIONS.map(({ key, label, tip, belowOnly }) => {
        const disabled = belowOnly && p.placement !== 'below';
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch
                  id={`opt-${key}`}
                  size="sm"
                  checked={p.options[key]}
                  disabled={disabled}
                  onCheckedChange={(v) => p.onOptionChange(key, v)}
                />
                <Label
                  htmlFor={`opt-${key}`}
                  className="cursor-pointer text-[13px] font-normal text-muted-foreground peer-data-[state=checked]:text-foreground"
                >
                  {label}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>{disabled ? 'Applies to the separate view' : tip}</TooltipContent>
          </Tooltip>
        );
      })}
      <IgnoreRules patterns={p.ignorePatterns} onChange={p.onIgnorePatternsChange} />
    </div>
  </div>
);

export default Toolbar;
