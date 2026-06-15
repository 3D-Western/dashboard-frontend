'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PrintJobStatus } from '@/types/jobs';

export interface StatusFilterProps {
  value: PrintJobStatus | null;
  onChange: (value: PrintJobStatus | null) => void;
  options: PrintJobStatus[];
  label?: string;
  id?: string;
}

// Human-readable labels for print job statuses
const statusLabels: Record<PrintJobStatus, string> = {
  InQueue: 'In Queue',
  Printing: 'Printing',
  Ready: 'Ready',
  Flagged: 'Flagged',
  Error: 'Error',
  Succeeded: 'Succeeded',
  Failed: 'Failed',
  PendingFile: 'Pending File',
};

export function StatusFilter({
  value,
  onChange,
  options,
  label = 'Filter by status',
  id = 'status-filter',
}: StatusFilterProps) {
  return (
    <div className="w-full sm:w-[180px]">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Select
        value={value ?? 'all'}
        onValueChange={(v) => onChange(v === 'all' ? null : (v as PrintJobStatus))}
      >
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {options.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
