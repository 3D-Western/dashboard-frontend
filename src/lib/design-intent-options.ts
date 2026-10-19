export interface DesignIntentOption {
  readonly value: string;
  /** Short name shown on the option card and on the job's details */
  readonly label: string;
  /** What the print needs to do, with examples */
  readonly description: string;
}

// Values are what the backend stores in formAnswerJson, so only the wording can change
export const DESIGN_INTENT_OPTIONS: readonly DesignIntentOption[] = [
  {
    value: 'functional',
    label: 'Functional',
    description: 'Needs to fit and work. Parts, enclosures, assemblies.',
  },
  {
    value: 'visual',
    label: 'Display',
    description: 'Needs to look good. Models, figures, decor.',
  },
  {
    value: 'structural',
    label: 'Heavy duty',
    description: 'Takes force or weight. Brackets, mounts, tools.',
  },
] as const;
