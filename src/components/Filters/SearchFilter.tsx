'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

export interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

export function SearchFilter({
  value,
  onChange,
  placeholder = 'Search...',
  label = 'Search',
  id = 'search-filter',
}: SearchFilterProps) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="relative">
        <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-8"
          aria-describedby={`${id}-help`}
        />
      </div>
      <span id={`${id}-help`} className="sr-only">
        Filter results by typing keywords
      </span>
    </div>
  );
}
