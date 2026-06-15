'use client';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export type ColorOption = {
  readonly value: string;
  readonly label: string;
  readonly hexColor: string;
};

type ColorSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly ColorOption[];
  excludeValue?: string;
  placeholder?: string;
  className?: string;
};

/**
 * A color selector dropdown with visual color swatches.
 * Displays color circles with theme-aware borders alongside color names.
 */
export function ColorSelect({
  value,
  onValueChange,
  options,
  excludeValue,
  placeholder = 'Select a color',
  className = 'w-[200px]',
}: ColorSelectProps) {
  const filteredOptions = excludeValue
    ? options.filter((opt) => opt.value !== excludeValue)
    : options;

  const selectedColor = options.find((c) => c.value === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        {selectedColor ? (
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 flex-shrink-0 rounded-full ring-1 ring-gray-300 dark:ring-gray-600"
              style={{ backgroundColor: selectedColor.hexColor }}
            />
            <span>{selectedColor.label}</span>
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {filteredOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 flex-shrink-0 rounded-full ring-1 ring-gray-300 dark:ring-gray-600"
                style={{ backgroundColor: opt.hexColor }}
              />
              <span>{opt.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
