'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Button } from '@/components/ui/button';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';

import { useAdminResource } from '@/hooks/useAdminResource';
import { adminErrorMessage, issuesFor, issuesFromError } from '@/lib/training-admin-errors';
import {
  LAPSED_POLICY_LABELS,
  NUMBER_SETTINGS,
  describeDefault,
  toFormValues,
  validateSettings,
  type SettingsFormErrors,
  type SettingsFormValues,
} from '@/lib/training-settings-form';
import type { LapsedPolicy, TrainingSettings } from '@/types/training-admin';
import { CheckField, SelectField, TextField } from './fields';
import { ErrorNote, LoadState } from './feedback';
import { useTraining } from './TrainingContext';

/** /admin/training/[id]/settings: every setting with its default and an override (spec 4b). */
export function TrainingSettingsPage() {
  const loadDefaults = useCallback(() => trainingAdminAPI.getSettingsDefaults(), []);
  const { data, error, isLoading, reload } = useAdminResource(loadDefaults);
  return (
    <LoadState
      isLoading={isLoading}
      error={error}
      hasData={!!data}
      onRetry={() => void reload()}
      what="the default settings"
    >
      {data && <TrainingSettingsForm defaults={data} />}
    </LoadState>
  );
}

export function TrainingSettingsForm({ defaults }: { defaults: TrainingSettings }) {
  const { training, setTraining } = useTraining();
  const [values, setValues] = useState<SettingsFormValues>(() => toFormValues(training.settings));
  const [errors, setErrors] = useState<SettingsFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const defaultValues = toFormValues(defaults);
  const saved = toFormValues(training.settings);
  const isDirty = JSON.stringify(values) !== JSON.stringify(saved);

  const set = <K extends keyof SettingsFormValues>(key: K, value: SettingsFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const result = validateSettings(values);
    setErrors(result.errors);
    if (!result.settings) return;

    setSaving(true);
    try {
      const updated = await trainingAdminAPI.updateSettings(training.id, result.settings);
      setTraining(updated);
      setValues(toFormValues(updated.settings));
      toast.success('Settings saved.');
    } catch (error) {
      const problems = issuesFromError(error);
      const next: SettingsFormErrors = {};
      for (const key of Object.keys(values) as (keyof SettingsFormValues)[]) {
        const found = issuesFor(problems, key)[0];
        if (found) next[key] = found.message;
      }
      setErrors(next);
      // Anything the server said that no field claims still has to be shown.
      const unclaimed = problems.filter(
        (problem) => !Object.keys(values).some((key) => issuesFor([problem], key).length > 0),
      );
      setFailure(
        unclaimed.length > 0
          ? unclaimed.map((p) => p.message).join(' ')
          : problems.length > 0
            ? null
            : adminErrorMessage(error, "We couldn't save the settings."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <UnsavedChangesDialog isDirty={isDirty} />
      <p className="max-w-prose text-sm text-muted-foreground">
        Each setting shows the standard default. Change a value to override it for this training
        only. Settings belong to the training as a whole, not to one version, so a change takes
        effect straight away.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {NUMBER_SETTINGS.map((field) => {
          const isDefault = values[field.key].trim() === defaultValues[field.key];
          return (
            <div key={field.key} className="space-y-1">
              <TextField
                label={field.label}
                value={values[field.key]}
                onValueChange={(value) => set(field.key, value)}
                inputMode="numeric"
                placeholder={field.blank ?? undefined}
                help={field.help}
                hint={`Default: ${describeDefault(field, defaults)}`}
                error={errors[field.key]}
              />
              {!isDefault && (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className="h-auto min-h-11 p-0 fine:min-h-0"
                  onClick={() => set(field.key, defaultValues[field.key])}
                >
                  Use the default
                </Button>
              )}
            </div>
          );
        })}

        <SelectField
          label="When access has lapsed"
          value={values.lapsedPolicy}
          onValueChange={(value) => set('lapsedPolicy', value as LapsedPolicy)}
          options={(Object.keys(LAPSED_POLICY_LABELS) as LapsedPolicy[]).map((policy) => ({
            value: policy,
            label: LAPSED_POLICY_LABELS[policy],
          }))}
          help="What a member needs to do to get access back after it was blocked."
          hint={`Default: ${LAPSED_POLICY_LABELS[defaults.lapsedPolicy]}`}
          error={errors.lapsedPolicy}
        />

        <TextField
          label="Add-on reminders"
          value={values.addonReminderDays}
          onValueChange={(value) => set('addonReminderDays', value)}
          help="Days before the add-on deadline to remind members, separated by commas."
          hint={`Default: ${defaults.addonReminderDays.join(', ')}`}
          error={errors.addonReminderDays}
        />
      </div>

      <div className="space-y-1">
        <CheckField
          label="Draw quiz questions at random"
          checked={values.randomDrawEnabled}
          onCheckedChange={(checked) => set('randomDrawEnabled', checked)}
          help="Off: everyone gets the same quiz, with every question of each topic. On: a quiz can draw fewer questions than a topic holds, so members get different ones."
        />
        <p className="pl-7 text-xs text-muted-foreground">
          Default: {defaults.randomDrawEnabled ? 'random draw on' : 'same quiz for everyone'}
        </p>
        {errors.randomDrawEnabled && (
          <p role="alert" className="pl-7 text-xs text-destructive">
            {errors.randomDrawEnabled}
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {training.requiresSignoff
          ? 'In-person sign-off: always required for equipment trainings.'
          : 'In-person sign-off: not used for orientation, which is fully online.'}
      </p>

      <ErrorNote message={failure} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => {
            setValues(defaultValues);
            setErrors({});
          }}
        >
          Reset every setting to its default
        </Button>
      </div>
    </form>
  );
}
