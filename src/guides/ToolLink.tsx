import React from 'react';
import { ArrowRight } from 'lucide-react';
import { pageById, type PageId } from '@/site';
import { Button } from '@/components/ui/button';

/** A link to a tool, styled as a call to action inside a guide. */
export default function ToolLink({ id, children }: { id: PageId; children?: React.ReactNode }) {
  const page = pageById(id);
  return (
    <Button asChild variant="outline" size="sm" className="my-1">
      <a href={page.path}>
        {children ?? `Open the ${page.name}`} <ArrowRight />
      </a>
    </Button>
  );
}
