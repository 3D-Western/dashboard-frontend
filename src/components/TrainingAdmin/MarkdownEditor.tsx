'use client';

import { useId, useState } from 'react';
import { Markdown } from '@/components/Markdown';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  help?: string;
  error?: string | null;
  className?: string;
}

/**
 * A Markdown text box with a live preview rendered by the same component members see. On a
 * laptop the two sit side by side; on a phone you switch between Write and Preview.
 */
export function MarkdownEditor({
  label,
  value,
  onValueChange,
  rows = 10,
  help,
  error,
  className,
}: MarkdownEditorProps) {
  const id = useId();
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div
          className="inline-flex rounded-lg border p-0.5 lg:hidden"
          role="group"
          aria-label="View"
        >
          {(['write', 'preview'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              className={cn(
                'min-h-11 rounded-md px-4 py-1 text-sm md:min-h-0 md:px-3',
                mode === option ? 'bg-muted font-medium' : 'text-muted-foreground',
              )}
            >
              {option === 'write' ? 'Write' : 'Preview'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={cn(mode === 'preview' && 'hidden lg:block')}>
          <Textarea
            id={id}
            value={value}
            rows={rows}
            onChange={(event) => onValueChange(event.target.value)}
            aria-invalid={!!error || undefined}
            aria-describedby={help ? `${id}-help` : undefined}
            className="font-mono text-base md:text-sm"
          />
        </div>
        <div
          className={cn(
            'min-h-24 rounded-lg border bg-card p-3',
            mode === 'write' && 'hidden lg:block',
          )}
          aria-label={`${label} preview`}
        >
          {value.trim() === '' ? (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          ) : (
            <Markdown>{value}</Markdown>
          )}
        </div>
      </div>
      {help && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground md:text-xs">
          {help}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive md:text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
