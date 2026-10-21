'use client';

import { useId, type ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FieldFrameProps {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  /** One or more messages shown under the control, in red. */
  error?: string | string[] | null;
  /** Shown to the right of the label, e.g. "Default: 90". */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

function messagesOf(error: FieldFrameProps['error']): string[] {
  if (!error) return [];
  return Array.isArray(error) ? error : [error];
}

/** Label, control, help text and error messages, laid out the same way everywhere. */
export function FieldFrame({ id, label, help, error, hint, children, className }: FieldFrameProps) {
  const messages = messagesOf(error);
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {help && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
      {messages.map((message) => (
        <p key={message} id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}

interface TextFieldProps extends Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value' | 'id' | 'children'
> {
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  help?: ReactNode;
  hint?: ReactNode;
  error?: string | string[] | null;
}

export function TextField({
  label,
  value,
  onValueChange,
  help,
  hint,
  error,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} help={help} hint={hint} error={error} className={className}>
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={messagesOf(error).length > 0 || undefined}
        aria-describedby={help ? `${id}-help` : undefined}
        {...props}
      />
    </FieldFrame>
  );
}

interface TextAreaFieldProps extends Omit<
  React.ComponentProps<'textarea'>,
  'onChange' | 'value' | 'id' | 'children'
> {
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  help?: ReactNode;
  hint?: ReactNode;
  error?: string | string[] | null;
}

export function TextAreaField({
  label,
  value,
  onValueChange,
  help,
  hint,
  error,
  className,
  ...props
}: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} help={help} hint={hint} error={error} className={className}>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={messagesOf(error).length > 0 || undefined}
        aria-describedby={help ? `${id}-help` : undefined}
        {...props}
      />
    </FieldFrame>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps extends Omit<
  React.ComponentProps<'select'>,
  'onChange' | 'value' | 'id' | 'children'
> {
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  help?: ReactNode;
  hint?: ReactNode;
  error?: string | string[] | null;
}

/** A native select: a good picker on phones, and it keeps long option lists simple. */
export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  help,
  hint,
  error,
  className,
  ...props
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} help={help} hint={hint} error={error} className={className}>
      <select
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={messagesOf(error).length > 0 || undefined}
        aria-describedby={help ? `${id}-help` : undefined}
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:h-8 md:text-sm dark:bg-input/30"
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

interface CheckFieldProps {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  help?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function CheckField({
  label,
  checked,
  onCheckedChange,
  help,
  disabled,
  className,
}: CheckFieldProps) {
  const id = useId();
  return (
    <div className={cn('space-y-0.5', className)}>
      {/* The label row is the tap target: checkbox plus label, 44 px tall on phones. The help text
          stays outside the label so the checkbox's accessible name is just the label. */}
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-11 items-center gap-3 select-none md:min-h-0 md:items-start',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-describedby={help ? `${id}-help` : undefined}
          className="md:mt-0.5"
        />
        <span className="text-sm leading-snug font-medium">{label}</span>
      </label>
      {help && (
        <p id={`${id}-help`} className="pl-8 text-xs text-muted-foreground md:pl-7">
          {help}
        </p>
      )}
    </div>
  );
}
