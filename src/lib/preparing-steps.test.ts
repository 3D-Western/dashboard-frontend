import { describe, it, expect } from 'vitest';
import { progressOf, shownSteps, statusLinesFor } from './preparing-steps';
import type { StepProgress } from '@/types/pipeline';

const step = (id: string, state: StepProgress['state'] = 'done'): StepProgress => ({
  step: id,
  title: id,
  state,
});

describe('preparing steps', () => {
  it('shows only the plain checks, once each, and hides unknown ids', () => {
    const shown = shownSteps([
      step('screening.x'),
      step('checks.units'),
      step('checks.mesh_soundness'),
      step('checks.units', 'started'),
      step('brand.new.step'),
      step('gates.vaapr_envelope'),
    ]);
    expect(shown.map((s) => s.step)).toEqual(['checks.units', 'gates.vaapr_envelope']);
  });

  it('uses the pipeline teaching when it has one', () => {
    const [shown] = shownSteps([{ ...step('checks.bodies'), teaching: 'Custom.' }]);
    expect(shown).toMatchObject({ title: 'Counting pieces', teaching: 'Custom.' });
  });

  it('makes the first status line about the real size', () => {
    expect(statusLinesFor([84, 40, 22.4])[0]).toBe('Measuring your 84 x 40 x 22 mm part');
    expect(statusLinesFor(null)[0]).toMatch(/look at your part/);
  });

  it('progress grows with finished steps and never completes by itself', () => {
    expect(progressOf([])).toBe(0);
    expect(progressOf([step('a'), step('b')])).toBeGreaterThan(0);
    expect(progressOf(Array.from({ length: 500 }, (_, i) => step(`s${i}`)))).toBeLessThanOrEqual(
      0.95,
    );
  });
});
