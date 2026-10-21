'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { promptPreview } from '@/lib/training-admin-format';
import type { AdminQuestion } from '@/types/training-admin';
import { SelectField } from './fields';

interface QuestionPickerProps {
  label: string;
  /** The question version id that is chosen, or null for none. */
  value: number | null;
  onChange: (questionVersionId: number | null) => void;
  questions: AdminQuestion[];
  /** Version ids that cannot be picked again (already used by a sibling). */
  taken?: number[];
  emptyLabel?: string;
  help?: string;
  error?: string | null;
  onNewQuestion?: () => void;
}

/**
 * Chooses one question from the training's bank by the id of its newest version, which is what
 * video checkpoints and reading gates store. Retired questions cannot be picked.
 */
export function QuestionPicker({
  label,
  value,
  onChange,
  questions,
  taken = [],
  emptyLabel = 'No question',
  help,
  error,
  onNewQuestion,
}: QuestionPickerProps) {
  const active = questions.filter((q) => q.active);
  const known = active.some((q) => q.latest.id === value);

  return (
    <div className="space-y-2">
      <SelectField
        label={label}
        value={value === null ? '' : String(value)}
        onValueChange={(v) => onChange(v === '' ? null : Number(v))}
        placeholder={emptyLabel}
        options={[
          ...active.map((q) => ({
            value: String(q.latest.id),
            label: `${q.topicSlug}: ${promptPreview(q.latest.promptMarkdown, 70)}`,
            disabled: taken.includes(q.latest.id) && q.latest.id !== value,
          })),
          ...(value !== null && !known
            ? [{ value: String(value), label: 'An older or retired question (choose again)' }]
            : []),
        ]}
        help={help}
        error={error}
      />
      {onNewQuestion && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 w-full md:min-h-0 md:w-auto"
          onClick={onNewQuestion}
        >
          <Plus /> Write a new question
        </Button>
      )}
    </div>
  );
}
