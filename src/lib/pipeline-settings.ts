import type { BrimMode, Plan, PrintProfile, StudentSettings, SupportsMode } from '@/types/pipeline';

// "Specify settings" (P-96): the controls, their allowed values, and how the pipeline's chosen
// settings (Plan.settingsChosen, a free-form map) prefill them.

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

/** The pipeline's names for each setting, camelCase first; the contract leaves the map's keys open. */
const ALIASES: Record<SettingKey, string[]> = {
  profile: ['profile'],
  infillPercent: ['infillPercent', 'infill_percent', 'infill'],
  supports: ['supports'],
  supportsBuildPlateOnly: ['supportsBuildPlateOnly', 'supports_build_plate_only'],
  brim: ['brim'],
};

function pick<T>(source: Record<string, T> | undefined, key: SettingKey): T | undefined {
  for (const alias of ALIASES[key]) {
    if (source && alias in source && source[alias] !== undefined && source[alias] !== null) {
      return source[alias];
    }
  }
  return undefined;
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

/** The settings the pipeline chose for this plan, as the form's starting values. */
export function settingsFromPlan(plan: Plan | null | undefined): StudentSettings {
  const chosen = plan?.settingsChosen;
  const supportsRaw = pick(chosen, 'supports');
  const brimRaw = pick(chosen, 'brim');
  const infill = Number(pick(chosen, 'infillPercent'));
  return {
    profile:
      oneOf(
        pick(chosen, 'profile'),
        PROFILE_OPTIONS.map((o) => o.value),
      ) ?? null,
    infillPercent: Number.isFinite(infill) && infill >= 0 && infill <= 100 ? infill : null,
    supports:
      oneOf(
        supportsRaw,
        SUPPORTS_OPTIONS.map((o) => o.value),
      ) ?? (supportsRaw === true ? 'always' : supportsRaw === false ? 'never' : null),
    supportsBuildPlateOnly:
      typeof pick(chosen, 'supportsBuildPlateOnly') === 'boolean'
        ? (pick(chosen, 'supportsBuildPlateOnly') as boolean)
        : null,
    brim:
      oneOf(
        brimRaw,
        BRIM_OPTIONS.map((o) => o.value),
      ) ?? (brimRaw === true ? 'on' : brimRaw === false ? 'off' : null),
  };
}

/** Why the pipeline chose each setting, when it said. */
export function settingReasons(plan: Plan | null | undefined): Partial<Record<SettingKey, string>> {
  const reasons: Partial<Record<SettingKey, string>> = {};
  (Object.keys(ALIASES) as SettingKey[]).forEach((key) => {
    const reason = pick(plan?.settingsReasons, key);
    if (reason) reasons[key] = reason;
  });
  return reasons;
}

/** Has the student changed anything from what the plan chose? */
export function settingsDiffer(a: StudentSettings, b: StudentSettings): boolean {
  return (Object.keys(ALIASES) as SettingKey[]).some(
    (key) => (a[key] ?? null) !== (b[key] ?? null),
  );
}
