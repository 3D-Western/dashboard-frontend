import type { BrimMode, Plan, PrintProfile, StudentSettings, SupportsMode } from '@/types/pipeline';

// "Specify settings" (P-96): the controls, their allowed values, and how the pipeline's chosen
// settings (Plan.settingsChosen, a StudentSettings) prefill them.

export const PROFILE_OPTIONS: { value: PrintProfile; label: string; hint: string }[] = [
  { value: 'draft', label: 'Draft', hint: 'Fastest, rougher surface' },
  { value: 'standard', label: 'Standard', hint: 'A good balance for most parts' },
  { value: 'fine', label: 'Fine', hint: 'Finer detail, slower' },
  { value: 'strong', label: 'Strong', hint: 'Thicker walls for parts that take load' },
];

export const SUPPORTS_OPTIONS: { value: SupportsMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'always', label: 'Always' },
  { value: 'never', label: 'Never' },
];

export const BRIM_OPTIONS: { value: BrimMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export type SettingKey = keyof StudentSettings;

const KEYS: SettingKey[] = [
  'profile',
  'infillPercent',
  'supports',
  'supportsBuildPlateOnly',
  'brim',
];

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;

/** The settings the pipeline chose for this plan (a StudentSettings), as the form's starting values. */
export function settingsFromPlan(plan: Plan | null | undefined): StudentSettings {
  const chosen: StudentSettings = plan?.settingsChosen ?? {};
  const infill = chosen.infillPercent;
  return {
    profile: oneOf(
      chosen.profile,
      PROFILE_OPTIONS.map((o) => o.value),
    ),
    infillPercent:
      typeof infill === 'number' && Number.isFinite(infill) && infill >= 0 && infill <= 100
        ? infill
        : null,
    supports: oneOf(
      chosen.supports,
      SUPPORTS_OPTIONS.map((o) => o.value),
    ),
    supportsBuildPlateOnly:
      typeof chosen.supportsBuildPlateOnly === 'boolean' ? chosen.supportsBuildPlateOnly : null,
    brim: oneOf(
      chosen.brim,
      BRIM_OPTIONS.map((o) => o.value),
    ),
  };
}

/** Why the pipeline chose each setting, when it said. */
export function settingReasons(plan: Plan | null | undefined): Partial<Record<SettingKey, string>> {
  const reasons: Partial<Record<SettingKey, string>> = {};
  KEYS.forEach((key) => {
    const reason = plan?.settingsReasons?.[key];
    if (reason) reasons[key] = reason;
  });
  return reasons;
}

/** Has the student changed anything from what the plan chose? */
export function settingsDiffer(a: StudentSettings, b: StudentSettings): boolean {
  return KEYS.some((key) => (a[key] ?? null) !== (b[key] ?? null));
}
