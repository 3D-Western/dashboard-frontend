'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface TextConsentCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** True until a phone number has been entered. Consent is never given without a number. */
  disabled: boolean;
}

/**
 * The separate, unticked "text me" consent used at signup and in Settings (CASL: its own
 * explicit choice, never pre-ticked, and never bundled with the terms). Full width on phones.
 */
export function TextConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  disabled,
}: TextConsentCheckboxProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-4">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="grid min-w-0 gap-1 leading-snug">
        <label
          htmlFor={id}
          className={cn(
            'text-sm font-medium',
            disabled ? 'text-muted-foreground' : 'cursor-pointer',
          )}
        >
          Text me about my prints and access
        </label>
        <p className="text-sm text-muted-foreground">
          We&apos;ll only text about your prints and access. Reply STOP any time.
        </p>
        {disabled && (
          <p className="text-sm text-muted-foreground">Add a phone number to turn this on.</p>
        )}
      </div>
    </div>
  );
}
