'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export interface StatusOption<T extends string> {
  value: T;
  label: string;
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
    <div className="w-full sm:w-[180px]">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Select value={value ?? 'all'} onValueChange={(v) => onChange(v === 'all' ? null : (v as T))}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
