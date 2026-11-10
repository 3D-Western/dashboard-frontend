// What the "Preparing your print" screen may say. The pipeline streams every step it runs (dozens,
// some repeated); the student only needs a few friendly, plain checks. Anything not listed here is
// hidden by default: AI, slicing, packing, verification, settings tweaks, the geometry checks
// (their findings come later in the plan review) and every step id this file has never heard of.

import type { StepProgress } from '@/types/pipeline';

export interface PlainStep {
  /** Short, friendly name. */
  title: string;
  /** One line of teaching, used when the pipeline sent none. */
  teaching: string;
}

export const PLAIN_STEPS: Readonly<Record<string, PlainStep>> = {
  'intake.load_mesh': {
    title: 'Opening your file',
    teaching: 'Every model is a skin of tiny triangles. We read yours.',
  },
  'checks.units': {
    title: 'Sizing it up',
    teaching:
      'Files do not say if they are in millimetres or inches, so we check the size makes sense.',
  },
  'gates.vaapr_envelope': {
    title: 'Checking it fits',
    teaching:
      'Each printer has a limit on how big a part can be. We make sure yours fits the farm.',
  },
  'checks.bodies': {
    title: 'Counting pieces',
    teaching: 'One file can hold several separate parts. We count them so each prints properly.',
  },
  'checks.small_part': {
    title: 'Looking at part size',
    teaching: 'Very small parts need a gentler touch, so we note how big yours is.',
  },
};

export const isPlainStep = (id: string) => Object.hasOwn(PLAIN_STEPS, id);

export interface ShownStep {
  step: string;
  title: string;
  teaching: string;
}

/** The plain checks seen so far, in the order they arrived, once each, with friendly titles. */
export function shownSteps(steps: StepProgress[]): ShownStep[] {
  const seen = new Set<string>();
  const result: ShownStep[] = [];
  for (const step of steps) {
    if (!isPlainStep(step.step) || seen.has(step.step)) continue;
    seen.add(step.step);
    const plain = PLAIN_STEPS[step.step];
    result.push({
      step: step.step,
      title: plain.title,
      teaching: step.teaching?.trim() || plain.teaching,
    });
  }
  return result;
}

/** 0..0.95 from how many steps are finished: it never reaches the end before the plan is there. */
export function progressOf(steps: StepProgress[]): number {
  const done = new Set(
    steps.filter((s) => s.state === 'done' || s.state === 'skipped').map((s) => s.step),
  ).size;
  return Math.min(0.95, done / (done + 10));
}

export type Dims = readonly [number, number, number];

const fmt = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''));

/** Short status lines that suit the part; with its size known they get specific. */
export function statusLinesFor(dims: Dims | null): string[] {
  const lines: string[] = [];
  if (dims) {
    const sorted = [...dims].sort((a, b) => b - a);
    const [x, y, z] = dims;
    lines.push(`Measuring your ${fmt(x)} x ${fmt(y)} x ${fmt(z)} mm part`);
    if (sorted[0] < 30) lines.push('A small one: these print quickly');
    else if (sorted[0] > 150) lines.push('A big part: finding it the right printer');
    else lines.push('Finding the best spot on the plate');
    if (sorted[2] < sorted[0] / 8) lines.push('Nice and flat: that helps it stick');
    else if (sorted[0] > 3 * sorted[2])
      lines.push('Long and slim: thinking about how it should lie');
  } else {
    lines.push('Taking a good look at your part');
  }
  lines.push('Getting everything lined up', 'Almost there');
  return lines;
}
