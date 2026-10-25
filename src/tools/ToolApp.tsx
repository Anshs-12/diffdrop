import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { PageId } from '@/site';
import { useTheme } from '@/lib/theme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader from '@/components/SiteHeader';
import ToolShell, { ToolGuide } from '@/components/ToolShell';
import { Footer } from '@/components/Landing';
import { TOOL_CONTENT, type ToolId } from './content';
import { useSavedStatus } from './saved';

const TOOLS = {
  'json-formatter': lazy(() => import('./JsonFormatter')),
  'json-validator': lazy(() => import('./JsonValidator')),
  'json-to-csv': lazy(() => import('./JsonToCsv')),
  'json-to-yaml': lazy(() => import('./JsonToYaml')),
  'json-viewer': lazy(() => import('./JsonViewer')),
  base64: lazy(() => import('./Base64Tool')),
  'unix-timestamp': lazy(() => import('./TimestampTool')),
  'jwt-decoder': lazy(() => import('./JwtTool')),
  'regex-tester': lazy(() => import('./RegexTool')),
  'url-encoder': lazy(() => import('./UrlTool')),
  'case-converter': lazy(() => import('./CaseTool')),
  'title-case': lazy(() => import('./TitleCaseTool')),
  'word-counter': lazy(() => import('./WordCounterTool')),
  'password-generator': lazy(() => import('./PasswordTool')),
  'lorem-ipsum': lazy(() => import('./LoremTool')),
  'qr-code': lazy(() => import('./QrTool')),
  'color-converter': lazy(() => import('./ColorTool')),
  'css-gradient': lazy(() => import('./GradientTool')),
  'code-beautifier': lazy(() => import('./BeautifyTool')),
  'markdown-preview': lazy(() => import('./MarkdownTool')),
  'uuid-generator': lazy(() => import('./UuidTool')),
  'hash-generator': lazy(() => import('./HashTool')),
  'cron-generator': lazy(() => import('./CronTool')),
  'slug-generator': lazy(() => import('./SlugTool')),
  'number-base-converter': lazy(() => import('./NumberBaseTool')),
  'html-entities': lazy(() => import('./HtmlEntityTool')),
  'color-palette': lazy(() => import('./PaletteTool')),
  'contrast-checker': lazy(() => import('./ContrastTool')),
  'aspect-ratio': lazy(() => import('./AspectRatioTool')),
  'image-compressor': lazy(() => import('./ImageCompressTool')),
  'image-resizer': lazy(() => import('./ImageResizeTool')),
  'favicon-generator': lazy(() => import('./FaviconTool')),
  'svg-optimizer': lazy(() => import('./SvgTool')),
  'json-to-typescript': lazy(() => import('./JsonToTsTool')),
  'yaml-validator': lazy(() => import('./YamlValidatorTool')),
  'line-cleaner': lazy(() => import('./LineCleanerTool')),
  'list-to-sql': lazy(() => import('./ListToSqlTool')),
  'mock-json': lazy(() => import('./MockDataTool')),
  'meta-tag-generator': lazy(() => import('./MetaTagTool')),
  'robots-txt': lazy(() => import('./RobotsTool')),
  'http-status': lazy(() => import('./HttpStatusTool')),
  'subnet-calculator': lazy(() => import('./SubnetTool')),
  'chmod-calculator': lazy(() => import('./ChmodTool')),
  'java-beautifier': lazy(() => import('./BeautifyTool').then((m) => ({ default: () => <m.default fixedLang="java" /> }))),
  'javascript-beautifier': lazy(() => import('./BeautifyTool').then((m) => ({ default: () => <m.default fixedLang="javascript" /> }))),
  'css-beautifier': lazy(() => import('./BeautifyTool').then((m) => ({ default: () => <m.default fixedLang="css" /> }))),
  'html-beautifier': lazy(() => import('./BeautifyTool').then((m) => ({ default: () => <m.default fixedLang="html" /> }))),
  'python-formatter': lazy(() => import('./BeautifyTool').then((m) => ({ default: () => <m.default fixedLang="python" /> }))),
  'sql-formatter': lazy(() => import('./BeautifyTool').then((m) => ({ default: () => <m.default fixedLang="sql" /> }))),
  'xml-formatter': lazy(() => import('./BeautifyTool').then((m) => ({ default: () => <m.default fixedLang="xml" /> }))),
  'px-to-rem': lazy(() => import('./PxRemTool')),
  'email-extractor': lazy(() => import('./EmailExtractorTool')),
  'user-agent-parser': lazy(() => import('./UserAgentTool')),
  'jsonpath-tester': lazy(() => import('./JsonPathTool')),
} satisfies Record<ToolId, unknown>;

/** Keeps a failing tool from blanking the page: shows what happened and a way back. */
class ToolErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="grid min-h-[320px] place-items-center p-6 text-center">
        <div className="max-w-[52ch]">
          <p className="text-[15px] font-semibold">This tool hit an error and stopped.</p>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {(this.state.error.message || 'Unknown error').replace(/\.$/, '')}. Your input wasn’t sent anywhere. Reload the page to start again.
          </p>
          <button type="button" className="mt-4 rounded-md border px-3 py-1.5 text-[13.5px]" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

/** Says so when the input came from a shared link. */
function LinkNotice() {
  const { restored } = useSavedStatus();
  useEffect(() => {
    if (restored === 'link') toast('Loaded the input from a shared link');
  }, [restored]);
  return null;
}

/** Layout shared by the tool pages: sidebar, compact heading, the tool, then how-to and FAQ. */
export default function ToolApp({ page }: { page: PageId }) {
  const { resolved, setChoice: setTheme } = useTheme();
  const id = page as ToolId;
  const Tool = TOOLS[id];
  const content = TOOL_CONTENT[id];

  return (
    <TooltipProvider delayDuration={300}>
      <SiteHeader current={page} app resolvedTheme={resolved} onThemeChange={setTheme} />
      <ToolShell
        current={id}
        title={content.h1}
        description={content.lede}
        tool={
          <div className="workspace">
            <ToolErrorBoundary>
              <Suspense fallback={<div className="grid min-h-[480px] place-items-center text-sm text-muted-foreground">Loading…</div>}>
                <Tool />
              </Suspense>
            </ToolErrorBoundary>
            <LinkNotice />
          </div>
        }
      >
        <ToolGuide steps={content.steps} faq={content.faq} example={content.example} mistakes={content.mistakes} related={content.related} />
      </ToolShell>
      <Footer current={page} />
      <Toaster theme={resolved} position="bottom-center" />
    </TooltipProvider>
  );
}
