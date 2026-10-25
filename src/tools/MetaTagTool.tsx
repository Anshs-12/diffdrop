import { useMemo } from 'react';
import { ImageIcon } from 'lucide-react';
import { EMPTY_META, LENGTHS, buildMetaTags, charCount, displayUrl, hostname, truncate, warnings, type MetaInput } from '@/lib/metaTags';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import CodeEditor from './CodeEditor';
import { OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const EXAMPLE: MetaInput = {
  ...EMPTY_META,
  title: 'Sourdough starter in 7 days',
  description: 'How to make a sourdough starter from flour & water, with a day-by-day feeding schedule.',
  url: 'https://example.com/sourdough-starter',
  siteName: 'Example Kitchen',
  image: 'https://example.com/img/starter.jpg',
  imageAlt: 'A jar of bubbly sourdough starter',
  type: 'article',
  twitterSite: '@examplekitchen',
};

const isMeta = (v: unknown) => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return Object.entries(EMPTY_META).every(([k, d]) => typeof o[k] === typeof d) && ['website', 'article'].includes(o.type as string) && ['summary', 'summary_large_image'].includes(o.card as string);
};

const inputClass =
  'h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function Field({ id, label, children, meta }: { id: string; label: string; children: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] text-muted-foreground">
          {label}
        </label>
        {meta}
      </div>
      {children}
    </div>
  );
}

function Count({ text, limit }: { text: string; limit: { label: string; max: number } }) {
  const n = charCount(text);
  const over = n > limit.max;
  return (
    <span className={cn('font-mono text-[11.5px] tabular-nums', over ? 'text-amber-700 dark:text-amber-400' : 'text-faint')} title={limit.label}>
      {n} / ~{limit.max}
    </span>
  );
}

function Choice<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
            value === o.value ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-[13.5px] font-normal">
        {label}
      </Label>
    </div>
  );
}

/** Stands in for the share image: the image itself is never loaded. */
function ImagePlaceholder({ url, className }: { url: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1.5 bg-muted p-3 text-center text-faint', className)}>
      <ImageIcon className="size-6" aria-hidden="true" />
      <span className="max-w-full font-mono text-[11px] break-all">{url || 'no image'}</span>
      {url && <span className="text-[11px]">image not loaded in this preview</span>}
    </div>
  );
}

export default function MetaTagTool() {
  const [m, setM] = useSaved<MetaInput>('meta', EMPTY_META, isMeta);
  const set = <K extends keyof MetaInput>(k: K, v: MetaInput[K]) => setM((prev) => ({ ...prev, [k]: v }));
  const tags = useMemo(() => buildMetaTags(m), [m]);
  const warns = useMemo(() => warnings(m), [m]);
  const text = (k: 'title' | 'description' | 'url' | 'siteName' | 'image' | 'imageAlt' | 'twitterSite' | 'themeColor') => ({
    id: `meta-${k}`,
    value: m[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value),
    spellCheck: k === 'title' || k === 'description' || k === 'imageAlt' || k === 'siteName',
    autoComplete: 'off',
  });
  const titleShown = m.title.trim() || 'Page title';
  const descShown = m.description.trim() || 'The page description appears here.';

  return (
    <>
      <ToolBar onExample={() => setM(EXAMPLE)} />
      <div className="tool-panes">
        <Panel title="page">
          <div className="space-y-3.5 p-4">
            <Field id="meta-title" label="Title" meta={<Count text={m.title} limit={LENGTHS.title} />}>
              <input {...text('title')} placeholder="Sourdough starter in 7 days" className={inputClass} />
            </Field>
            <Field id="meta-description" label="Description" meta={<Count text={m.description} limit={LENGTHS.description} />}>
              <textarea {...text('description')} rows={3} placeholder="One or two sentences about the page." className={cn(inputClass, 'h-auto resize-y py-2 leading-snug')} />
            </Field>
            <p className="-mt-1.5 text-[12px] text-faint">
              Approximate: {LENGTHS.title.label} for a title, and {LENGTHS.description.label.replace('search snippets tend to show ', '')} for a description. Longer text may be cut off.
            </p>
            <Field id="meta-url" label="Canonical URL">
              <input {...text('url')} type="url" placeholder="https://example.com/page" className={cn(inputClass, 'font-mono text-[13.5px]')} />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field id="meta-siteName" label="Site name">
                <input {...text('siteName')} placeholder="Example Kitchen" className={inputClass} />
              </Field>
              <Field id="meta-twitterSite" label="X (Twitter) @site">
                <input {...text('twitterSite')} placeholder="@example" className={cn(inputClass, 'font-mono text-[13.5px]')} />
              </Field>
            </div>
            <Field id="meta-image" label="Image URL">
              <input {...text('image')} type="url" placeholder="https://example.com/card.png" className={cn(inputClass, 'font-mono text-[13.5px]')} />
            </Field>
            <Field id="meta-imageAlt" label="Image alt text">
              <input {...text('imageAlt')} placeholder="What the image shows" className={inputClass} />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">og:type</p>
                <Choice label="og:type" value={m.type} onChange={(v) => set('type', v)} options={[{ value: 'website', label: 'website' }, { value: 'article', label: 'article' }]} />
              </div>
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">twitter:card</p>
                <Choice
                  label="twitter:card"
                  value={m.card}
                  onChange={(v) => set('card', v)}
                  options={[
                    { value: 'summary_large_image', label: 'large image' },
                    { value: 'summary', label: 'summary' },
                  ]}
                />
              </div>
            </div>
            <Field id="meta-themeColor" label="theme-color (optional)">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(m.themeColor) ? m.themeColor : '#000000'}
                  onChange={(e) => set('themeColor', e.target.value)}
                  aria-label="Pick theme color"
                  className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent"
                />
                <input {...text('themeColor')} placeholder="#1d4ed8" className={cn(inputClass, 'font-mono text-[13.5px]')} />
              </div>
            </Field>
            <div className="grid gap-2.5 border-t pt-3.5 sm:grid-cols-2">
              <Toggle id="meta-index" label="Let search engines index it" checked={m.index} onChange={(v) => set('index', v)} />
              <Toggle id="meta-follow" label="Let them follow links" checked={m.follow} onChange={(v) => set('follow', v)} />
              <Toggle id="meta-charset" label="charset utf-8" checked={m.charset} onChange={(v) => set('charset', v)} />
              <Toggle id="meta-viewport" label="Mobile viewport" checked={m.viewport} onChange={(v) => set('viewport', v)} />
            </div>
          </div>
        </Panel>
        <Panel title="html" actions={<OutputActions text={tags} fileName="meta-tags.html" mime="text/html" />}>
          {warns.map((w) => (
            <StatusLine key={w} tone="warn" label="Warning">
              {w}
            </StatusLine>
          ))}
          <CodeEditor value={tags} readOnly lang="markup" wrap ariaLabel="Meta tags" className="tool-editor" />
        </Panel>
      </div>
      <div className="grid gap-6 border-t p-4 md:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[11.5px] text-faint">search result (approximate)</p>
          <div className="rounded-xl border bg-background p-4" aria-label="Search result preview">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground" aria-hidden="true">
                {(m.siteName.trim() || hostname(m.url))[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13.5px]">{m.siteName.trim() || hostname(m.url)}</p>
                <p className="truncate text-[12px] text-muted-foreground">{displayUrl(m.url)}</p>
              </div>
            </div>
            <p className="mt-2 text-[19px] leading-snug text-[#1a0dab] dark:text-[#99c3ff]">{truncate(titleShown, LENGTHS.title.max)}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{truncate(descShown, LENGTHS.description.max)}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11.5px] text-faint">social card (approximate)</p>
          <div
            className={cn('overflow-hidden rounded-xl border bg-background', m.card === 'summary' && 'flex')}
            aria-label="Social card preview"
          >
            <ImagePlaceholder url={m.image.trim()} className={m.card === 'summary' ? 'w-28 shrink-0 border-r' : 'aspect-[1.91/1] border-b'} />
            <div className="min-w-0 p-3">
              <p className="truncate text-[12px] text-muted-foreground uppercase">{hostname(m.url)}</p>
              <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-medium">{titleShown}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{descShown}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="px-4 pb-4 text-[12px] text-faint">
        Previews are drawn locally from your text and are only a rough guide: each search engine and social site lays out and cuts text its own way.
      </p>
    </>
  );
}
