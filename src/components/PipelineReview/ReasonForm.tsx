'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateReason } from '@/lib/pipeline-farm';
import { REASON_MAX } from '@/lib/pipeline-review';

/**
 * The reason box every farm action needs: required, 3 to 1000 characters, checked before
 * anything is sent. `onSubmit` is only called with a valid reason.
 */
export function ReasonForm({
  id,
  label,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
}: {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const problem = validateReason(reason);
        setError(problem);
        if (!problem) onSubmit(reason);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          value={reason}
          maxLength={REASON_MAX}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setReason(event.target.value)}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11 fine:h-9" disabled={busy}>
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 fine:h-9"
          disabled={busy}
          onClick={onCancel}
        >
          Never mind
        </Button>
      </div>
    </form>
  );
}
