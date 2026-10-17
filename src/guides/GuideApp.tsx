import { useTheme } from '@/lib/theme';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteHeader from '@/components/SiteHeader';
import ToolShell from '@/components/ToolShell';
import { Footer } from '@/components/Landing';
import { GUIDES, type GuideId } from './content';

/** A guide page: sidebar, title, then the article. */
export default function GuideApp({ page }: { page: GuideId }) {
  const { choice: theme, setChoice: setTheme } = useTheme();
  const guide = GUIDES[page];
  return (
    <TooltipProvider delayDuration={300}>
      <SiteHeader current={page} sections={[]} app theme={theme} onThemeChange={setTheme} />
      <ToolShell
        current={page}
        title={guide.h1}
        description={guide.lede}
        tool={<article className="guide">{guide.body}</article>}
      />
      <Footer current={page} />
    </TooltipProvider>
  );
}
