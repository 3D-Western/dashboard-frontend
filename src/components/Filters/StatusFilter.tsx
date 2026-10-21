'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface StatusOption<T extends string> {
  value: T;
  label: string;
  /** Background class for a colour dot before the label, e.g. 'bg-status-green' */
  dotClassName?: string;
}

export interface StatusFilterProps<T extends string> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: StatusOption<T>[];
  label?: string;
  placeholder?: string;
  id?: string;
}

export function StatusFilter<T extends string>({
  value,
  onChange,
  options,
  label = 'Filter by status',
  placeholder = 'Filter by status',
  id = 'status-filter',
}: StatusFilterProps<T>) {
  return (
    <div className="w-full sm:w-48 sm:shrink-0">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Select value={value ?? 'all'} onValueChange={(v) => onChange(v === 'all' ? null : (v as T))}>
        <SelectTrigger
          id={id}
          aria-label={label}
          className="w-full bg-card data-[size=default]:h-9 dark:bg-card"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="inline-flex items-center gap-2">
                {option.dotClassName && (
                  <span
                    aria-hidden="true"
                    className={cn('size-2 shrink-0 rounded-full', option.dotClassName)}
                  />
                )}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
