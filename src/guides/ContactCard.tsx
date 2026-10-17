import { Copy, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyText } from '@/tools/shared';
import { CONTACT_EMAIL } from './meta';

/** The contact email as a mailto link and as plain text to copy. No form, no tracking. */
export default function ContactCard() {
  return (
    <div className="not-prose rounded-2xl border bg-card p-5">
      <p className="text-[13px] text-muted-foreground">Email</p>
      <p className="mt-1 font-mono text-[18px] text-foreground select-all" aria-label="Email address">
        {CONTACT_EMAIL}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Mail /> Send an email
          </a>
        </Button>
        <Button variant="outline" size="sm" onClick={() => copyText(CONTACT_EMAIL, 'Email address copied')}>
          <Copy /> Copy address
        </Button>
      </div>
    </div>
  );
}
