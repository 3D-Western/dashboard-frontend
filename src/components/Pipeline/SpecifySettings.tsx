'use client';

import { ChevronDown, Info, Loader2 } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BRIM_OPTIONS,
  PROFILE_OPTIONS,
  SUPPORTS_OPTIONS,
  type SettingKey,
} from '@/lib/pipeline-settings';
import { cn } from '@/lib/utils';
import type { StudentSettings } from '@/types/pipeline';

const CHIP =
  'min-h-11 rounded-full border border-control-border px-3.5 py-1.5 text-sm transition-colors outline-none hover:border-purple-light focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-purple-light data-[state=checked]:bg-purple-light/25 disabled:opacity-60 fine:min-h-0';

function ChipGroup<T extends string>({
  labelId,
  value,
  options,
  onChange,
  disabled,
}: {
  labelId: string;
  value: T | null | undefined;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <RadioGroupPrimitive.Root
      aria-labelledby={labelId}
      value={value ?? ''}
      onValueChange={(next) => onChange(next as T)}
      disabled={disabled}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item key={option.value} value={option.value} className={CHIP}>
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

function Setting({
  id,
  label,
  reason,
  children,
}: {
  id: string;
  label: string;
  reason?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p id={id} className="text-sm font-medium">
        {label}
      </p>
      {children}
      {reason && <p className="text-xs text-muted-foreground">Chosen because: {reason}</p>}
    </div>
  );
}

/**
 * "Specify settings" (SCOPE §2.5, P-96): optional and collapsed, prefilled with the pipeline's
 * choices and why. Changing anything asks for an updated plan; the old yes no longer applies.
 */
export function SpecifySettings({
  settings,
  reasons,
  dirty,
  applying,
  onChange,
  onApply,
}: {
  settings: StudentSettings;
  reasons: Partial<Record<SettingKey, string>>;
  dirty: boolean;
  applying: boolean;
  onChange: (next: StudentSettings) => void;
  onApply: () => void;
}) {
  const set = (patch: StudentSettings) => onChange({ ...settings, ...patch });
  const profile = PROFILE_OPTIONS.find((option) => option.value === settings.profile);

  return (
    <Collapsible className="rounded-lg border bg-card" defaultOpen={false}>
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm font-medium fine:min-h-0">
        <span>
          Specify settings
          <span className="ml-2 font-normal text-muted-foreground">(optional)</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-5 border-t p-4">
        <div
          role="note"
          className="flex gap-2 rounded-lg border border-purple-light/40 bg-purple-light/10 p-3 text-sm"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Want more control than this? Submit a <strong>3MF project</strong> from your slicer
            instead. We keep the settings that are safe on our printers, and we still check
            everything.
          </p>
        </div>

        <Setting id="setting-profile" label="Profile" reason={reasons.profile}>
          <ChipGroup
            labelId="setting-profile"
            value={settings.profile}
            options={PROFILE_OPTIONS}
            onChange={(profileValue) => set({ profile: profileValue })}
          />
          {profile && <p className="text-xs text-muted-foreground">{profile.hint}</p>}
        </Setting>

        <Setting id="setting-infill" label="Infill %" reason={reasons.infillPercent}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={5}
            aria-labelledby="setting-infill"
            className="max-w-28"
            value={settings.infillPercent ?? ''}
            onChange={(event) => {
              const raw = event.target.value;
              set({
                infillPercent: raw === '' ? null : Math.min(100, Math.max(0, Number(raw))),
              });
            }}
          />
        </Setting>

        <Setting id="setting-supports" label="Supports" reason={reasons.supports}>
          <ChipGroup
            labelId="setting-supports"
            value={settings.supports}
            options={SUPPORTS_OPTIONS}
            onChange={(supports) => set({ supports })}
          />
          <div className="flex min-h-11 items-center gap-3 fine:min-h-0">
            <Checkbox
              id="setting-supports-plate"
              checked={settings.supportsBuildPlateOnly === true}
              disabled={settings.supports === 'never'}
              onCheckedChange={(checked) => set({ supportsBuildPlateOnly: checked === true })}
            />
            <Label htmlFor="setting-supports-plate" className="text-sm font-normal">
              Build plate only
              <span className="block text-xs text-muted-foreground">
                Supports start on the plate, never on the part itself.
              </span>
            </Label>
          </div>
        </Setting>

        <Setting id="setting-brim" label="Brim" reason={reasons.brim}>
          <ChipGroup
            labelId="setting-brim"
            value={settings.brim}
            options={BRIM_OPTIONS}
            onChange={(brim) => set({ brim })}
          />
        </Setting>

        <div className={cn('flex flex-wrap items-center gap-3')}>
          <Button type="button" variant="outline" disabled={!dirty || applying} onClick={onApply}>
            {applying && <Loader2 className="animate-spin" aria-hidden="true" />}
            Update my plan
          </Button>
          {dirty && !applying && (
            <p className="text-sm text-muted-foreground">
              We&apos;ll check your part again with these settings.
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
