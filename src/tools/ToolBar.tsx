import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SavedControls from './SavedControls';

/** Options row above a tool, ending with Share / Forget input (where the page saves input) and "Load example". */
export default function ToolBar({
  children,
  onExample,
  extra,
}: {
  children?: React.ReactNode;
  onExample: () => void;
  /** More buttons next to "Load example". */
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5">
      {children}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {extra}
        <SavedControls />
        <Button variant="outline" size="sm" onClick={onExample}>
          <Sparkles /> Load example
        </Button>
      </div>
    </div>
  );
}
