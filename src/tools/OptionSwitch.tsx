import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/** A small switch with its label, for a tool's options row. */
export default function OptionSwitch({
  id,
  label,
  checked,
  onChange,
  disabled,
  title,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <Label htmlFor={id} className="cursor-pointer text-[13px] font-normal text-muted-foreground" title={title}>
        {label}
      </Label>
    </div>
  );
}
