'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PURPOSE_OPTIONS } from '@/lib/job-purpose-options';

// Shared across all job forms (3D printing, CNC, laser cutting, water jet). Expects to be
// rendered inside a react-hook-form <Form> whose schema has a required `purpose: string` field.
export function ProjectPurposeField() {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name="purpose"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-lg">Project Purpose</FormLabel>
          <FormDescription>
            What is this project primarily for?*
            <br />
            <span className="text-destructive">
              Non-entrepreneurial projects are subject to heavy rate limiting.
            </span>
          </FormDescription>
          <FormControl>
            <Select
              value={field.value}
              onValueChange={(val) => {
                if (form.getValues('purpose') === val) {
                  form.setValue('purpose', '');
                }
                field.onChange(val ?? '');
              }}
              defaultValue={''}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a purpose" />
              </SelectTrigger>
              <SelectContent>
                {PURPOSE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
