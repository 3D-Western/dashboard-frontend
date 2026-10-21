'use client';

import { useFormContext } from 'react-hook-form';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PURPOSE_OPTIONS } from '@/lib/job-purpose-options';

const LABEL_ID = 'purpose-label';

// All the options in view as chips, so they're quicker to scan and pick than a dropdown.
// Expects a react-hook-form <Form> whose schema has a required `purpose: string` field.
export function PurposeChips() {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name="purpose"
      render={({ field }) => (
        <FormItem>
          <FormLabel id={LABEL_ID} className="text-lg">
            What&apos;s it for?
          </FormLabel>
          <FormDescription>Pick the closest fit.</FormDescription>
          <FormControl>
            <RadioGroupPrimitive.Root
              aria-labelledby={LABEL_ID}
              value={field.value}
              onValueChange={field.onChange}
              className="flex flex-wrap gap-2 pt-1"
            >
              {PURPOSE_OPTIONS.map((option) => (
                <RadioGroupPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="min-h-11 rounded-full border border-primary-text/18 px-3.5 py-1.5 text-sm transition-colors outline-none hover:border-purple-light focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-purple-light data-[state=checked]:bg-purple-light/25 md:min-h-0"
                >
                  {option.label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
