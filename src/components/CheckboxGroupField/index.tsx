import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface CheckboxGroupFieldOption {
  value: string;
  label: string;
}

interface CheckboxGroupFieldProps {
  options: readonly CheckboxGroupFieldOption[];
  value: string[];
  onChange: (next: string[]) => void;
  columns?: 1 | 2 | 3;
  disabledValues?: string[];
}

export function CheckboxGroupField({
  options,
  value,
  onChange,
  columns = 1,
  disabledValues,
}: CheckboxGroupFieldProps) {
  const columnsClass =
    columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1';

  function toggle(optionValue: string, checked: boolean) {
    onChange(checked ? [...value, optionValue] : value.filter((v) => v !== optionValue));
  }

  return (
    <div className={cn('grid grid-cols-1 gap-2', columnsClass)}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50"
        >
          <Checkbox
            checked={value.includes(option.value)}
            disabled={disabledValues?.includes(option.value)}
            onCheckedChange={(checked) => toggle(option.value, !!checked)}
          />
          <span className="text-sm font-normal">{option.label}</span>
        </label>
      ))}
    </div>
  );
}
