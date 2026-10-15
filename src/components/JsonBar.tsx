import React from 'react';
import { Braces, CircleAlert, CircleCheck } from 'lucide-react';
import type { JsonCheck } from '@/lib/json';
import { Button } from '@/components/ui/button';

function Status({ side, check }: { side: 'a' | 'b'; check: JsonCheck }) {
  if (check.status === 'empty') return <span className="text-faint">{side}: empty</span>;
  if (check.status === 'valid')
    return (
      <span className="inline-flex items-center gap-1.5 text-add">
        <CircleCheck className="size-3.5" aria-hidden="true" />
        {side}: valid JSON
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-del" title={check.message}>
      <CircleAlert className="size-3.5" aria-hidden="true" />
      {side}: {check.message}
      {check.line != null && ` at line ${check.line}, column ${check.column}`}
    </span>
  );
}

interface JsonBarProps {
  left: JsonCheck;
  right: JsonCheck;
  onFormat: () => void;
}

/** JSON page only: validity of each side and one-click formatting. */
const JsonBar: React.FC<JsonBarProps> = ({ left, right, onFormat }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-2 font-mono text-[12.5px]" aria-label="JSON status">
    <Status side="a" check={left} />
    <Status side="b" check={right} />
    <Button
      variant="outline"
      size="sm"
      className="ml-auto font-sans"
      onClick={onFormat}
      disabled={left.status !== 'valid' && right.status !== 'valid'}
      title="Pretty-print both sides with 2-space indentation and keys sorted A–Z, so reordered keys and minified files don't show up as changes"
    >
      <Braces /> Format JSON &amp; sort keys
    </Button>
  </div>
);

export default JsonBar;
