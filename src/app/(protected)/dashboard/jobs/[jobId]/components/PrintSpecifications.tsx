import { PURPOSE_OPTIONS } from '@/lib/job-purpose-options';
import { DESIGN_INTENT_OPTIONS } from '@/lib/design-intent-options';

export interface PrintSpec {
  label: string;
  value: string;
}

// Form answers that are for the backend, not the user
const HIDDEN_KEYS = new Set(['contentType']);

const KEY_LABELS: Record<string, string> = {
  design_intent: 'Design intent',
  purpose: 'Purpose',
};

// "infill_density" / "infillDensity" -> "Infill density"
const humanize = (key: string) => {
  const words = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const formatValue = (key: string, value: unknown) => {
  const text = String(value);
  if (key === 'purpose') {
    return PURPOSE_OPTIONS.find((option) => option.value === text)?.label ?? text;
  }
  if (key === 'design_intent') {
    return DESIGN_INTENT_OPTIONS.find((option) => option.value === text)?.label ?? text;
  }
  return text;
};

/** Turns a job's form answers (formAnswersJson) into labelled print specs for display. */
export function getPrintSpecs(specsJson?: string | Record<string, unknown>): PrintSpec[] {
  if (!specsJson) return [];

  let specs: Record<string, unknown>;
  try {
    specs = typeof specsJson === 'string' ? JSON.parse(specsJson) : specsJson;
  } catch {
    // Not JSON: show whatever was stored rather than nothing
    return [{ label: 'Specifications', value: String(specsJson) }];
  }
  if (!specs || typeof specs !== 'object') return [];

  return Object.entries(specs)
    .filter(([key, value]) => !HIDDEN_KEYS.has(key) && value !== null && value !== '')
    .map(([key, value]) => ({
      label: KEY_LABELS[key] ?? humanize(key),
      value: formatValue(key, value),
    }));
}
