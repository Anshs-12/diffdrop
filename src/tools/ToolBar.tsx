import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Options row above a tool, with a "Load example" button at the end. */
export default function ToolBar({ children, onExample }: { children?: React.ReactNode; onExample: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5">
      {children}
      <Button variant="outline" size="sm" className="ml-auto" onClick={onExample}>
        <Sparkles /> Load example
      </Button>
    </div>
  );
}
