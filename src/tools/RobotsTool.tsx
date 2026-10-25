import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { AGENTS, PRESETS, buildRobots, parseRobots, testPath, toConfig, type Group, type RobotsConfig, type RuleType } from '@/lib/robots';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CodeEditor from './CodeEditor';
import { IconButton, InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const DEFAULT: RobotsConfig = { groups: [{ agents: ['*'], rules: [], crawlDelay: '' }], sitemaps: [] };

const EXAMPLE: RobotsConfig = {
  groups: [
    {
      agents: ['*'],
      rules: [
        { type: 'disallow', path: '/cart/' },
        { type: 'disallow', path: '/account/' },
        { type: 'allow', path: '/account/help/' },
      ],
      crawlDelay: '',
    },
  ],
  sitemaps: ['https://example.com/sitemap.xml'],
};

const isConfig = (v: unknown): boolean => {
  const c = v as RobotsConfig;
  return (
    !!c &&
    Array.isArray(c.groups) &&
    Array.isArray(c.sitemaps) &&
    c.sitemaps.every((s) => typeof s === 'string') &&
    c.groups.every(
      (g) =>
        Array.isArray(g.agents) &&
        g.agents.every((a) => typeof a === 'string') &&
        typeof g.crawlDelay === 'string' &&
        Array.isArray(g.rules) &&
        g.rules.every((r) => (r.type === 'allow' || r.type === 'disallow') && typeof r.path === 'string'),
    )
  );
};

const SOURCES = ['built', 'pasted'] as const;
type Source = (typeof SOURCES)[number];

const inputClass =
  'h-8 min-w-0 rounded-md border bg-background px-2.5 font-mono text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
const radioClass = (on: boolean) =>
  cn('h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors', on ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground');

function AgentList() {
  return (
    <datalist id="robots-agents">
      {AGENTS.map((a) => (
        <option key={a.token} value={a.token}>
          {a.who}
        </option>
      ))}
    </datalist>
  );
}

function GroupEditor({ g, index, onChange, onRemove }: { g: Group; index: number; onChange: (g: Group) => void; onRemove?: () => void }) {
  const [draft, setDraft] = useState('');
  const addAgent = () => {
    const a = draft.trim();
    if (a && !g.agents.includes(a)) onChange({ ...g, agents: [...g.agents, a] });
    setDraft('');
  };
  return (
    <fieldset className="space-y-3 border-b p-4" aria-label={`Group ${index + 1}`}>
      <div className="flex items-center gap-2">
        <legend className="font-mono text-[11.5px] text-faint">group {index + 1}</legend>
        {onRemove && (
          <Button variant="ghost" size="xs" className="ml-auto text-muted-foreground" onClick={onRemove}>
            Remove group
          </Button>
        )}
      </div>
      <div>
        <p className="mb-1.5 text-[13px] text-muted-foreground">User-agents</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {g.agents.map((a) => (
            <span key={a} className="inline-flex h-7 items-center gap-1 rounded-md border bg-muted pr-1 pl-2 font-mono text-[12.5px]">
              {a}
              <button type="button" aria-label={`Remove ${a}`} className="rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={() => onChange({ ...g, agents: g.agents.filter((x) => x !== a) })}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAgent();
              }
            }}
            list="robots-agents"
            aria-label={`Add a user-agent to group ${index + 1}`}
            placeholder="Googlebot, GPTBot…"
            spellCheck={false}
            autoComplete="off"
            className={cn(inputClass, 'w-40')}
          />
          <Button variant="outline" size="sm" onClick={addAgent} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
        {!g.agents.length && <p className="mt-1.5 text-[12.5px] text-del">Add at least one user-agent, or this group is left out.</p>}
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px] text-muted-foreground">Rules</p>
        {g.rules.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <select
              value={r.type}
              onChange={(e) => onChange({ ...g, rules: g.rules.map((x, j) => (j === i ? { ...x, type: e.target.value as RuleType } : x)) })}
              aria-label={`Rule ${i + 1} type`}
              className={cn(inputClass, 'w-[6.5rem] shrink-0 pr-1')}
            >
              <option value="disallow">Disallow</option>
              <option value="allow">Allow</option>
            </select>
            <input
              value={r.path}
              onChange={(e) => onChange({ ...g, rules: g.rules.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)) })}
              aria-label={`Rule ${i + 1} path`}
              placeholder="/private/"
              spellCheck={false}
              autoComplete="off"
              className={cn(inputClass, 'flex-1')}
            />
            <IconButton label={`Remove rule ${i + 1}`} onClick={() => onChange({ ...g, rules: g.rules.filter((_, j) => j !== i) })}>
              <X />
            </IconButton>
          </div>
        ))}
        {!g.rules.length && <p className="text-[12.5px] text-faint">No rules: everything is allowed for these crawlers.</p>}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...g, rules: [...g.rules, { type: 'disallow', path: '' }] })}>
          <Plus /> Add rule
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`robots-delay-${index}`} className="text-[13px] text-muted-foreground">
          Crawl-delay
        </label>
        <input
          id={`robots-delay-${index}`}
          value={g.crawlDelay}
          onChange={(e) => onChange({ ...g, crawlDelay: e.target.value.replace(/[^\d.]/g, '') })}
          inputMode="decimal"
          placeholder="seconds"
          className={cn(inputClass, 'w-24')}
        />
        <span className="text-[12px] text-faint">Optional. Google ignores it; some other crawlers read it as seconds between requests.</span>
      </div>
    </fieldset>
  );
}

export default function RobotsTool() {
  const [config, setConfig] = useSaved<RobotsConfig>('config', DEFAULT, isConfig);
  const [source, setSource] = useSaved<Source>('source', 'built', (v) => SOURCES.includes(v as Source));
  const [pasted, setPasted] = useSaved('pasted', '');
  const [path, setPath] = useSaved('path', '/');
  const [agent, setAgent] = useSaved('agent', 'Googlebot');

  const output = useMemo(() => buildRobots(config), [config]);
  const parsed = useMemo(() => parseRobots(source === 'built' ? output : pasted), [source, output, pasted]);
  const result = useMemo(() => testPath(parsed, agent, path), [parsed, agent, path]);

  const setGroup = (i: number, g: Group) => setConfig((c) => ({ ...c, groups: c.groups.map((x, j) => (j === i ? g : x)) }));
  const pasteFile = (text: string) => {
    setPasted(text);
    setSource('pasted');
  };

  return (
    <>
      <AgentList />
      <ToolBar
        onExample={() => {
          setConfig(EXAMPLE);
          setSource('built');
          setPath('/account/help/returns');
          setAgent('Googlebot');
        }}
      >
        <div className="flex flex-wrap gap-1.5" aria-label="Presets">
          {PRESETS.map((p) => (
            <Button key={p.id} variant="outline" size="sm" onClick={() => setConfig(p.config())}>
              {p.label}
            </Button>
          ))}
        </div>
      </ToolBar>
      <div className="tool-panes">
        <Panel title="builder">
          <div>
            {config.groups.map((g, i) => (
              <GroupEditor
                key={i}
                g={g}
                index={i}
                onChange={(next) => setGroup(i, next)}
                onRemove={config.groups.length > 1 ? () => setConfig((c) => ({ ...c, groups: c.groups.filter((_, j) => j !== i) })) : undefined}
              />
            ))}
            <div className="border-b p-4">
              <Button variant="outline" size="sm" onClick={() => setConfig((c) => ({ ...c, groups: [...c.groups, { agents: [], rules: [{ type: 'disallow', path: '/' }], crawlDelay: '' }] }))}>
                <Plus /> Add group
              </Button>
            </div>
            <div className="space-y-1.5 p-4">
              <p className="text-[13px] text-muted-foreground">Sitemaps</p>
              {config.sitemaps.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={s}
                    onChange={(e) => setConfig((c) => ({ ...c, sitemaps: c.sitemaps.map((x, j) => (j === i ? e.target.value : x)) }))}
                    aria-label={`Sitemap ${i + 1}`}
                    placeholder="https://example.com/sitemap.xml"
                    spellCheck={false}
                    autoComplete="off"
                    className={cn(inputClass, 'flex-1')}
                  />
                  <IconButton label={`Remove sitemap ${i + 1}`} onClick={() => setConfig((c) => ({ ...c, sitemaps: c.sitemaps.filter((_, j) => j !== i) }))}>
                    <X />
                  </IconButton>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setConfig((c) => ({ ...c, sitemaps: [...c.sitemaps, ''] }))}>
                <Plus /> Add sitemap
              </Button>
              <p className="text-[12px] text-faint">Use full URLs. Sitemap lines apply to every crawler.</p>
            </div>
          </div>
        </Panel>
        <Panel title="robots.txt" actions={<OutputActions text={output} fileName="robots.txt" mime="text/plain" />}>
          <CodeEditor value={output} readOnly lang="hash" ariaLabel="robots.txt output" className="tool-editor" />
        </Panel>
      </div>

      <div className="border-t">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5">
          <span className="font-mono text-[12.5px] text-muted-foreground">tester</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Test against">
            {SOURCES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={source === s} onClick={() => setSource(s)} className={radioClass(source === s)}>
                {s === 'built' ? 'the file above' : 'a pasted file'}
              </button>
            ))}
          </div>
        </div>
        {source === 'pasted' && (
          <Panel
            title="pasted robots.txt"
            onFile={pasteFile}
            className="border-b"
            actions={
              <>
                <Button variant="outline" size="xs" disabled={!pasted.trim()} onClick={() => setConfig(toConfig(parseRobots(pasted)))}>
                  Edit in builder
                </Button>
                <InputActions onLoad={pasteFile} onClear={() => setPasted('')} canClear={!!pasted} accept=".txt,text/plain" />
              </>
            }
          >
            <CodeEditor value={pasted} onChange={setPasted} lang="hash" placeholder="Paste a robots.txt file, or drop one here" ariaLabel="Pasted robots.txt" className="tool-editor" />
          </Panel>
        )}
        {parsed.warnings.slice(0, 5).map((w) => (
          <StatusLine key={w.line} tone="warn" label="Warning">
            Line {w.line}: {w.message}
          </StatusLine>
        ))}
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            aria-label="URL or path to test"
            placeholder="/path?query or https://example.com/path"
            spellCheck={false}
            autoComplete="off"
            className={cn(inputClass, 'h-9 flex-[2_1_240px] text-[14px]')}
          />
          <input
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            list="robots-agents"
            aria-label="Crawler user-agent"
            placeholder="Googlebot"
            spellCheck={false}
            autoComplete="off"
            className={cn(inputClass, 'h-9 flex-[1_1_160px] text-[14px]')}
          />
        </div>
        <StatusLine tone={result.allowed ? 'ok' : 'error'} label="Test result">
          <span>
            <strong className="font-semibold">{result.allowed ? 'Allowed' : 'Blocked'}</strong>: {result.path} for {agent.trim() || '*'}. {result.reason}
          </span>
        </StatusLine>
        <p className="px-4 py-3 text-[12px] text-faint">
          Matching follows RFC 9309: the group for the crawler’s name, else the * group; the longest matching rule wins, and Allow wins a tie. As Google documents, a name like Googlebot-News with no group of its own uses the Googlebot group. robots.txt is a request crawlers choose to honor, not access control.
        </p>
      </div>
    </>
  );
}
