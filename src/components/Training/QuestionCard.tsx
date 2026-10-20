'use client';

import { useId } from 'react';
import { Markdown } from '@/components/Markdown';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/training';

interface QuestionCardProps {
  question: Question;
  selected: number[];
  onChange: (optionIds: number[]) => void;
  disabled?: boolean;
  /** "Question 3 of 8"-style label shown above the prompt. */
  heading?: string;
}

/**
 * One question with its options. Single-choice questions use radio buttons, "pick all that
 * apply" questions use checkboxes. It never shows or hints at which answer is correct: the
 * server does not send that.
 */
export function QuestionCard({
  question,
  selected,
  onChange,
  disabled,
  heading,
}: QuestionCardProps) {
  const groupId = useId();
  const multiple = question.selection === 'MULTIPLE' || question.type === 'MULTI';

  if (question.type === 'HOTSPOT') {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        This kind of question isn&apos;t supported in the dashboard yet. Please tell makerspace
        staff.
      </div>
    );
  }

  const toggle = (optionId: number) => {
    if (multiple) {
      onChange(
        selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      );
    } else {
      onChange([optionId]);
    }
  };

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="w-full space-y-1">
        {heading && (
          <span className="block text-xs font-medium text-muted-foreground">{heading}</span>
        )}
        <Markdown className="font-medium">{question.promptMarkdown}</Markdown>
        {multiple && (
          <span className="block text-sm text-muted-foreground">Select all that apply.</span>
        )}
      </legend>
      <div className="space-y-2">
        {question.options.map((option) => {
          const checked = selected.includes(option.optionId);
          const inputId = `${groupId}-${option.optionId}`;
          return (
            <label
              key={option.optionId}
              htmlFor={inputId}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-base transition-colors',
                checked ? 'border-purple-light bg-purple-light/10' : 'hover:border-purple-light/60',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                id={inputId}
                type={multiple ? 'checkbox' : 'radio'}
                name={groupId}
                checked={checked}
                onChange={() => toggle(option.optionId)}
                disabled={disabled}
                className="size-5 shrink-0 accent-purple-light"
              />
              <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
