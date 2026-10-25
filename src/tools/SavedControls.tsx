import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Eraser, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { forgetSaved, shareLink, useSavedStatus } from './saved';

/** "Share" (a link carrying the input) and "Forget" (remove the input saved in this browser). */
export default function SavedControls() {
  const { enabled, saved, restored } = useSavedStatus();
  const [link, setLink] = useState<ReturnType<typeof shareLink> | null>(null);
  if (!enabled) return null;

  return (
    <>
      {(saved || restored) && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          title="Remove the input this page keeps in your browser, and clear the tool"
          onClick={() => {
            forgetSaved();
            toast.success('Saved input removed from this browser');
          }}
        >
          <Eraser /> Forget input
        </Button>
      )}
      <Popover onOpenChange={(open) => setLink(open ? shareLink() : null)}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 /> Share
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(92vw,380px)] text-[13.5px]" aria-label="Share link">
          {link?.ok ? (
            <>
              <div className="flex gap-1.5">
                <input
                  readOnly
                  value={link.url}
                  aria-label="Link with your input"
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-[12px]"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link.url);
                      toast.success('Link copied');
                    } catch {
                      toast.error('Clipboard unavailable; select the link and copy it');
                    }
                  }}
                >
                  <Copy /> Copy link
                </Button>
              </div>
              <p className="mt-3 text-muted-foreground" role="note">
                <strong className="font-semibold text-foreground">This link contains your input.</strong> Anyone who gets it can read it, and it stays in
                your browser history. The input sits after the # in the link, a part browsers don’t send to servers.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{link?.reason}</p>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
