import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { PreparingSteps } from './PreparingSteps';
import type { StepProgress } from '@/types/pipeline';

const plain: StepProgress = { step: 'checks.units', title: 'Units', state: 'done' };
const lesson: StepProgress = {
  step: 'checks.thin_walls',
  title: 'Walls',
  state: 'done',
  lesson: { code: 'thin_walls.weak', title: 'A thin wall on your part', body: 'It may be weak.' },
};

describe('PreparingSteps carousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  const card = () => screen.getByTestId('preparing-check');
  const tick = () => act(() => void vi.advanceTimersByTime(6600));

  it('opens with a plain check, then a finding that arrived outranks the general facts', () => {
    const { rerender } = render(<PreparingSteps steps={[]} />);
    expect(card()).toHaveAttribute('data-tier', '4');
    rerender(<PreparingSteps steps={[plain, lesson]} />);
    tick();
    expect(card()).toHaveAttribute('data-tier', '1');
    expect(card()).toHaveTextContent('A thin wall on your part');
    tick();
    expect(card()).toHaveAttribute('data-tier', '4'); // no part size yet: the arrived plain check
    tick();
    expect(card()).toHaveAttribute('data-tier', '3');
  });

  it('remembers general facts it showed', () => {
    render(<PreparingSteps steps={[]} />);
    tick();
    tick();
    expect(window.localStorage.getItem('preparing-facts-seen')).toMatch(/fact:/);
  });

  it('still changes cards when motion is reduced, without animating', () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('reduce'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    render(<PreparingSteps steps={[]} />);
    const first = card().textContent;
    expect(card().className).not.toMatch(/animate-/);
    tick();
    expect(card().textContent).not.toBe(first);
  });
});
