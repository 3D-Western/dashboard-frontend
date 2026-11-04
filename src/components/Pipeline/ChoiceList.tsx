'use client';

import { Loader2 } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import type { Choice } from '@/types/pipeline';

/**
 * Open choices: only the student can decide these because they change the part (P-103). Each
 * option is a large tap target with its explanation; the recommended one is marked, never preset.
 */
export function ChoiceList({
  choices,
  selected,
  saving,
  disabled,
  onSelect,
}: {
  choices: Choice[];
  /** choiceId -> optionId the student picked in this session. */
  selected: Record<string, string>;
  /** choiceId currently being saved. */
  saving?: string | null;
  disabled?: boolean;
  onSelect: (choiceId: string, optionId: string) => void;
}) {
  if (choices.length === 0) return null;
  return (
    <section aria-label="Your choices" className="space-y-5">
      {choices.map((choice) => {
        const labelId = `choice-${choice.choiceId}`;
        return (
          <div key={choice.choiceId} className="space-y-2">
            <h3 id={labelId} className="flex items-center gap-2 text-base">
              {choice.question}
              {saving === choice.choiceId && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label="Saving your choice"
                />
              )}
            </h3>
            <RadioGroupPrimitive.Root
              aria-labelledby={labelId}
              value={selected[choice.choiceId] ?? ''}
              onValueChange={(optionId) => onSelect(choice.choiceId, optionId)}
              disabled={disabled}
              className="grid gap-2"
            >
              {choice.options.map((option) => (
                <RadioGroupPrimitive.Item
                  key={option.optionId}
                  value={option.optionId}
                  className={cn(
                    'min-h-11 rounded-lg border border-control-border p-3 text-left outline-none',
                    'transition-colors hover:border-purple-light focus-visible:ring-3 focus-visible:ring-ring/50',
                    'data-[state=checked]:border-purple-light data-[state=checked]:bg-purple-light/15',
                    'disabled:opacity-60',
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {option.label}
                    {option.recommended && (
                      <span className="rounded-full bg-status-green/15 px-2 py-0.5 text-xs text-status-green-foreground">
                        Recommended
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {option.explanation}
                  </span>
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>
          </div>
        );
      })}
    </section>
  );
}
