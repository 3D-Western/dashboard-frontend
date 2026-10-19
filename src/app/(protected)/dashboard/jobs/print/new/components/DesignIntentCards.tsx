'use client';

import { useFormContext } from 'react-hook-form';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { Dumbbell, Eye, Puzzle, type LucideIcon } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DESIGN_INTENT_OPTIONS } from '@/lib/design-intent-options';

const LABEL_ID = 'design-intent-label';

const ICONS: Record<string, LucideIcon> = {
  functional: Puzzle,
  visual: Eye,
  structural: Dumbbell,
};

// One card per option: a short name to scan, then a line saying what it means.
// Expects a react-hook-form <Form> whose schema has a required `design_intent: string` field.
export function DesignIntentCards() {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name="design_intent"
      render={({ field }) => (
        <FormItem>
          <FormLabel id={LABEL_ID} className="text-lg">
            How will it be used?
          </FormLabel>
          <FormDescription>This helps staff pick the right print settings.</FormDescription>
          <FormControl>
            <RadioGroupPrimitive.Root
              aria-labelledby={LABEL_ID}
              value={field.value}
              onValueChange={field.onChange}
              className="grid gap-3 pt-1 sm:grid-cols-3"
            >
              {DESIGN_INTENT_OPTIONS.map((option) => {
                const Icon = ICONS[option.value];
                return (
                  <RadioGroupPrimitive.Item
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    aria-describedby={`design-intent-${option.value}`}
                    className="flex items-start gap-3 rounded-lg border border-primary-text/18 p-4 text-left transition-colors outline-none hover:border-purple-light focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-purple-light data-[state=checked]:bg-purple-light/10 sm:flex-col sm:gap-2"
                  >
                    {/* Icon beside the text on phones, above it from sm up */}
                    {Icon && (
                      <Icon className="size-5 shrink-0 text-purple-light" aria-hidden="true" />
                    )}
                    <span className="flex flex-col gap-1">
                      <span className="font-medium">{option.label}</span>
                      <span
                        id={`design-intent-${option.value}`}
                        className="text-sm text-muted-foreground"
                      >
                        {option.description}
                      </span>
                    </span>
                  </RadioGroupPrimitive.Item>
                );
              })}
            </RadioGroupPrimitive.Root>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
