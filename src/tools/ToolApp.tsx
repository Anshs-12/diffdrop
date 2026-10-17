import { lazy, Suspense } from 'react';
import type { PageId } from '@/site';
import { useTheme } from '@/lib/theme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader from '@/components/SiteHeader';
import ToolShell, { ToolGuide } from '@/components/ToolShell';
import { Footer } from '@/components/Landing';
import { TOOL_CONTENT, type ToolId } from './content';

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
} satisfies Record<ToolId, unknown>;

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
            <Suspense fallback={<div className="grid min-h-[480px] place-items-center text-sm text-muted-foreground">Loading…</div>}>
              <Tool />
            </Suspense>
          </div>
        }
      >
        <ToolGuide steps={content.steps} faq={content.faq} example={content.example} mistakes={content.mistakes} />
      </ToolShell>
      <Footer current={page} />
      <Toaster theme={resolved} position="bottom-center" />
    </TooltipProvider>
  );
}
