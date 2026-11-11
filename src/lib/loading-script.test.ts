import { describe, it, expect } from 'vitest';
import {
  MAX_POPUPS,
  POPUP_GAP_AFTER_FINDING_MS,
  POPUP_GAP_MS,
  POPUP_STAY_MS,
  collectEvents,
  easeProgress,
  nextToShow,
  stageLabel,
  visiblePopups,
  type LoadingEvent,
  type ShownEvent,
} from './loading-script';
import { createMockStep } from '@test/utils/pipelineFactories';

const step = (id: string): LoadingEvent => ({ id, kind: 'step', label: id, text: id });
const finding = (id: string, n: number): LoadingEvent => ({
  id,
  kind: 'finding',
  label: 'Found on your part',
  text: id,
  n,
});

describe('the loading view script', () => {
  describe('what is worth a popup', () => {
    it('lists the plain checks that finished and the findings, in the order they happened, and nothing internal', () => {
      const events = collectEvents(
        [
          createMockStep({ step: 'screening.ai_pass', state: 'done' }),
          createMockStep({ step: 'intake.load_mesh', state: 'done' }),
          createMockStep({
            step: 'checks.bodies',
            state: 'done',
            lesson: { code: 'pieces', title: 'Two separate pieces', body: 'Each prints alone.' },
          }),
          createMockStep({ step: 'checks.units', state: 'started' }),
        ],
        null,
      );

      expect(events.map((e) => [e.kind, e.id])).toEqual([
        ['step', 'step:intake.load_mesh'],
        ['step', 'step:checks.bodies'],
        ['finding', 'finding:pieces'],
      ]);
      expect(events[2]).toMatchObject({ n: 1, text: 'Two separate pieces' });
    });

    it('has no finding, and so no pin or number, unless the checks really found something', () => {
      const events = collectEvents([createMockStep({ step: 'intake.load_mesh' })], null);
      expect(events.some((e) => e.kind === 'finding')).toBe(false);
    });

    it('says the measured size of the part once it is known', () => {
      const [first] = collectEvents([], [68, 22, 19]);
      expect(first.text).toBe('It measures 68 x 22 x 19 mm.');
    });
  });

  describe('pacing', () => {
    const at = (event: LoadingEvent, time: number): ShownEvent => ({ event, at: time });

    it('shows the first event at once and then no sooner than 3 s apart', () => {
      const events = [step('a'), step('b')];
      expect(nextToShow(events, [], 0)).toBe(events[0]);
      const shown = [at(events[0], 1000)];
      expect(nextToShow(events, shown, 1000 + POPUP_GAP_MS - 1)).toBeNull();
      expect(nextToShow(events, shown, 1000 + POPUP_GAP_MS)).toBe(events[1]);
    });

    it('waits 5.5 s after a finding so it can be read', () => {
      const events = [finding('f', 1), step('b')];
      const shown = [at(events[0], 0)];
      expect(nextToShow(events, shown, 5000)).toBeNull();
      expect(nextToShow(events, shown, POPUP_GAP_AFTER_FINDING_MS)).toBe(events[1]);
    });

    it('shows nothing when everything has been shown, and catches up at once when forced', () => {
      const events = [step('a'), step('b')];
      const shown = [at(events[0], 0)];
      expect(nextToShow(events, shown, 1, true)).toBe(events[1]);
      expect(nextToShow(events, [at(events[0], 0), at(events[1], 3000)], 9000)).toBeNull();
    });

    it('keeps at most two popups on the view, newest first, each for about 7.5 s', () => {
      const shown = [at(step('a'), 0), at(step('b'), 3000), at(step('c'), 6000)];
      expect(MAX_POPUPS).toBe(2);
      expect(visiblePopups(shown, 6500).map((s) => s.event.id)).toEqual(['c', 'b']);
      // 'b' went at 3000 + 7500; 'a' is long gone
      expect(visiblePopups(shown, 3000 + POPUP_STAY_MS).map((s) => s.event.id)).toEqual(['c']);
      expect(visiblePopups(shown, 6000 + POPUP_STAY_MS)).toEqual([]);
    });
  });

  describe('the bar', () => {
    it('climbs steadily, never faster than the pace, and never past what the popups have caught up with', () => {
      expect(easeProgress(0.5, 0.4, 1, 100)).toBe(0.5); // never goes back
      expect(easeProgress(0.2, 1, 0.3, 10_000)).toBe(0.3); // held at the ceiling
      const jump = easeProgress(0, 1, 1, 1000);
      expect(jump).toBeGreaterThan(0);
      expect(jump).toBeLessThanOrEqual(0.07 + 0.001); // a second moves it only a few percent
    });

    it('names the stage from the progress', () => {
      expect(stageLabel(0)).toBe('Opening your file');
      expect(stageLabel(0.6)).toBe('Looking for overhangs');
      expect(stageLabel(1)).toBe('Finishing up');
    });
  });
});
