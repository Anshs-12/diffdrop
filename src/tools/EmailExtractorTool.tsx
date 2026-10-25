import { useDeferredValue, useMemo } from 'react';
import { extractEmails, type EmailSeparator } from '@/lib/emailExtract';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import OptionSwitch from './OptionSwitch';
import { InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const SEPARATORS: { value: EmailSeparator; label: string; aria: string }[] = [
  { value: 'newline', label: '↵', aria: 'One per line' },
  { value: 'comma', label: ',', aria: 'Comma separated' },
  { value: 'semicolon', label: ';', aria: 'Semicolon separated' },
];

const EXAMPLE = `From: Ada Lovelace <ada@example.com>
To: Grace Hopper <grace.hopper@navy.example.org>, team@example.com
Cc: ADA@EXAMPLE.COM

Hi all, the new sign-up form is live: <a href="mailto:support@example.com?subject=Help">support@example.com</a>.
Questions about billing go to billing+invoices@accounts.example.com; press: press@news.example.co.uk.
Our Paris office: josé.garcía@exemple.fr. (Old address alan@example.com.)
Logo files: logo@2x.png, icon@3x.png`;

export default function EmailExtractorTool() {
  const [text, setText] = useSaved('input', '');
  const [dedupe, setDedupe] = useSaved('dedupe', true, (v) => typeof v === 'boolean');
  const [lowercase, setLowercase] = useSaved('lower', false, (v) => typeof v === 'boolean');
  const [sort, setSort] = useSaved('sort', false, (v) => typeof v === 'boolean');
  const [domains, setDomains] = useSaved('domains', '', (v) => typeof v === 'string' && v.length <= 2000);
  const [separator, setSeparator] = useSaved<EmailSeparator>('sep', 'newline', (v) => SEPARATORS.some((s) => s.value === v));
  // Very large pastes are scanned after the keystroke renders
  const deferred = useDeferredValue(text);
  const result = useMemo(() => extractEmails(deferred, { dedupe, lowercase, sort, domains, separator }), [deferred, dedupe, lowercase, sort, domains, separator]);
  const n = result.emails.length;

  const details = [
    result.duplicates ? `${result.duplicates.toLocaleString()} duplicate${result.duplicates === 1 ? '' : 's'} removed` : '',
    result.filtered ? `${result.filtered.toLocaleString()} outside the domain filter` : '',
  ].filter(Boolean);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)}>
        <OptionSwitch id="email-dedupe" label="Remove duplicates" checked={dedupe} onChange={setDedupe} />
        <OptionSwitch id="email-lower" label="Lowercase" checked={lowercase} onChange={setLowercase} title="Lowercase the part before the @ too (the domain is always lowercased)" />
        <OptionSwitch id="email-sort" label="Sort A–Z" checked={sort} onChange={setSort} />
        <ToggleGroup type="single" variant="outline" size="sm" value={separator} onValueChange={(v) => v && setSeparator(v as EmailSeparator)} aria-label="Separator">
          {SEPARATORS.map((s) => (
            <ToggleGroupItem key={s.value} value={s.value} aria-label={s.aria} title={s.aria} className="font-mono">
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
          Only
          <input
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="example.com, …"
            spellCheck={false}
            autoComplete="off"
            aria-label="Only these domains"
            className="h-8 w-44 min-w-0 rounded-md border bg-background px-2 font-mono text-[13px] text-foreground"
          />
        </label>
      </ToolBar>
      {!text ? (
        <StatusLine tone="muted">Paste text or drop a file; addresses are found as you type.</StatusLine>
      ) : n ? (
        <StatusLine tone="ok" label="Count">
          {n.toLocaleString()} email address{n === 1 ? '' : 'es'}
          {details.length ? ` (${details.join(', ')})` : ''}
        </StatusLine>
      ) : (
        <StatusLine tone="warn" label="Count">
          No email addresses found{result.filtered ? ` in ${domains.trim()}` : ''}
        </StatusLine>
      )}
      <div className="tool-panes">
        <Panel
          title="text"
          onFile={setText}
          actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.csv,.html,.htm,.eml,.vcf,.json,.md,.log" />}
        >
          <CodeEditor value={text} onChange={setText} lang={null} wrap placeholder="Paste text, HTML or CSV with email addresses in it" ariaLabel="Text to search" className="tool-editor" />
        </Panel>
        <Panel title="emails" meta={n ? n.toLocaleString() : undefined} actions={<OutputActions text={result.output} fileName="emails.txt" mime="text/plain" />}>
          <CodeEditor value={result.output} readOnly lang={null} wrap ariaLabel="Email addresses" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
