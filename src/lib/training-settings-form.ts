import type { LapsedPolicy, TrainingSettings } from '@/types/training-admin';

/** Every setting as the text a person typed, so a half-typed number is never lost. */
export interface SettingsFormValues {
  passMarkPercent: string;
  attemptLimit: string;
  retryCooldownMinutes: string;
  refresherWarnDays: string;
  refresherBlockDays: string;
  maxAgeDays: string;
  lapsedPolicy: LapsedPolicy;
  addonGraceDays: string;
  addonReminderDays: string;
  randomDrawEnabled: boolean;
}

export type SettingsFormErrors = Partial<Record<keyof SettingsFormValues, string>>;

export interface NumberSettingField {
  key: keyof Omit<SettingsFormValues, 'lapsedPolicy' | 'randomDrawEnabled' | 'addonReminderDays'>;
  label: string;
  help: string;
  unit: string;
  /** Blank is allowed and means this (e.g. "Unlimited", "Never"). */
  blank: string | null;
  min: number;
  max: number;
}

/** Limits match the server's rules (AuthoringRules.kt). */
export const NUMBER_SETTINGS: NumberSettingField[] = [
  {
    key: 'passMarkPercent',
    label: 'Pass mark',
    help: 'The share of quiz questions a member must answer correctly. Questions marked critical must always be right, whatever the score.',
    unit: '%',
    blank: null,
    min: 1,
    max: 100,
  },
  {
    key: 'attemptLimit',
    label: 'Quiz attempts allowed',
    help: 'How many times a member can take the training. Leave empty for no limit.',
    unit: 'attempts',
    blank: 'Unlimited',
    min: 1,
    max: 100,
  },
  {
    key: 'retryCooldownMinutes',
    label: 'Wait before trying again',
    help: 'How long a member waits after a failed attempt. 0 lets them retry straight away.',
    unit: 'minutes',
    blank: null,
    min: 0,
    max: 10080,
  },
  {
    key: 'refresherWarnDays',
    label: 'Warn after this long without use',
    help: 'Days without using the machine before the member is told to refresh. The machine still works. Leave empty to never warn.',
    unit: 'days',
    blank: 'Never',
    min: 1,
    max: 3650,
  },
  {
    key: 'refresherBlockDays',
    label: 'Block after this long without use',
    help: 'Days without use before access is blocked until the member takes a refresher. Cannot be earlier than the warning. Leave empty to never block.',
    unit: 'days',
    blank: 'Never',
    min: 1,
    max: 3650,
  },
  {
    key: 'maxAgeDays',
    label: 'Certification expires after',
    help: 'Whatever the use, a certification ends this many days after it was issued. Leave empty for no expiry.',
    unit: 'days',
    blank: 'No expiry',
    min: 1,
    max: 3650,
  },
  {
    key: 'addonGraceDays',
    label: 'Add-on grace period',
    help: 'How long already-certified members have to finish an add-on update before their access is affected.',
    unit: 'days',
    blank: null,
    min: 0,
    max: 365,
  },
];

export const LAPSED_POLICY_LABELS: Record<LapsedPolicy, string> = {
  QUIZ: 'A refresher quiz is enough',
  QUIZ_AND_SIGNOFF: 'A refresher quiz and a new in-person sign-off',
};

export function toFormValues(settings: TrainingSettings): SettingsFormValues {
  const text = (value: number | null) => (value === null ? '' : String(value));
  return {
    passMarkPercent: String(settings.passMarkPercent),
    attemptLimit: text(settings.attemptLimit),
    retryCooldownMinutes: String(settings.retryCooldownMinutes),
    refresherWarnDays: text(settings.refresherWarnDays),
    refresherBlockDays: text(settings.refresherBlockDays),
    maxAgeDays: text(settings.maxAgeDays),
    lapsedPolicy: settings.lapsedPolicy,
    addonGraceDays: String(settings.addonGraceDays),
    addonReminderDays: settings.addonReminderDays.join(', '),
    randomDrawEnabled: settings.randomDrawEnabled,
  };
}

/** "2 weeks" style default text for the greyed hint next to each setting. */
export function describeDefault(field: NumberSettingField, defaults: TrainingSettings): string {
  const value = defaults[field.key];
  if (value === null) return field.blank ?? 'none';
  return `${value} ${field.unit}`;
}

const WHOLE_NUMBER = /^\d+$/;

/** Checks every setting. `settings` is set only when nothing is wrong. */
export function validateSettings(values: SettingsFormValues): {
  errors: SettingsFormErrors;
  settings: TrainingSettings | null;
} {
  const errors: SettingsFormErrors = {};
  const numbers: Partial<Record<NumberSettingField['key'], number | null>> = {};

  for (const field of NUMBER_SETTINGS) {
    const raw = values[field.key].trim();
    if (raw === '') {
      if (field.blank === null) errors[field.key] = `${field.label} is required.`;
      else numbers[field.key] = null;
      continue;
    }
    if (!WHOLE_NUMBER.test(raw)) {
      errors[field.key] = 'Enter a whole number.';
      continue;
    }
    const n = Number(raw);
    if (n < field.min || n > field.max) {
      errors[field.key] = `Enter a number from ${field.min} to ${field.max}.`;
      continue;
    }
    numbers[field.key] = n;
  }

  const warn = numbers.refresherWarnDays;
  const block = numbers.refresherBlockDays;
  if (!errors.refresherBlockDays && warn != null && block != null && block < warn) {
    errors.refresherBlockDays =
      'The block comes after the warning, so it cannot be earlier than the warning.';
  }

  const reminders: number[] = [];
  const reminderText = values.addonReminderDays.trim();
  if (reminderText !== '') {
    for (const part of reminderText.split(/[,\s]+/).filter(Boolean)) {
      if (!WHOLE_NUMBER.test(part) || Number(part) < 1 || Number(part) > 365) {
        errors.addonReminderDays =
          'List whole numbers of days from 1 to 365, separated by commas, for example 14, 7, 3, 1.';
        break;
      }
      reminders.push(Number(part));
    }
    if (!errors.addonReminderDays && new Set(reminders).size !== reminders.length) {
      errors.addonReminderDays = 'Each reminder day can only be listed once.';
    } else if (!errors.addonReminderDays && reminders.length > 12) {
      errors.addonReminderDays = 'At most 12 reminders.';
    }
  }

  if (Object.keys(errors).length > 0) return { errors, settings: null };

  return {
    errors,
    settings: {
      passMarkPercent: numbers.passMarkPercent as number,
      attemptLimit: numbers.attemptLimit ?? null,
      retryCooldownMinutes: numbers.retryCooldownMinutes as number,
      refresherWarnDays: numbers.refresherWarnDays ?? null,
      refresherBlockDays: numbers.refresherBlockDays ?? null,
      maxAgeDays: numbers.maxAgeDays ?? null,
      lapsedPolicy: values.lapsedPolicy,
      addonGraceDays: numbers.addonGraceDays as number,
      addonReminderDays: [...reminders].sort((a, b) => b - a),
      randomDrawEnabled: values.randomDrawEnabled,
    },
  };
}
