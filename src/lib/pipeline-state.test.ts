import { describe, it, expect } from 'vitest';
import {
  formatGrams,
  formatPrintTime,
  initialPipelineState,
  pipelineReducer,
} from './pipeline-state';
import { settingReasons, settingsDiffer, settingsFromPlan } from './pipeline-settings';
import type { Answer } from '@/types/pipeline';
import { isTerminalStatus, studentStage } from './student-status';
import {
  createMockEvent,
  createMockPickup,
  createMockPlan,
  createMockSnapshot,
  createMockStep,
} from '@test/utils/pipelineFactories';

describe('pipelineReducer', () => {
  it('starts from a snapshot', () => {
    const plan = createMockPlan();
    const state = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: createMockSnapshot({
        studentStatus: 'needs_confirmation',
        plan,
        steps: [createMockStep()],
      }),
    });

    expect(state).toMatchObject({ loaded: true, studentStatus: 'needs_confirmation', plan });
    expect(state.steps).toHaveLength(1);
  });

  it('knows from the snapshot only whether a live view is on (events do not carry it)', () => {
    let state = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: createMockSnapshot({ studentStatus: 'printing', liveView: true }),
    });
    expect(state.liveView).toBe(true);

    state = pipelineReducer(state, {
      type: 'event',
      event: createMockEvent({ seq: 4, type: 'status', studentStatus: 'printing' }),
    });
    expect(state.liveView).toBe(true);

    state = pipelineReducer(state, {
      type: 'snapshot',
      snapshot: createMockSnapshot({ studentStatus: 'ready_for_pickup' }),
    });
    expect(state.liveView).toBe(false); // an older backend, or a print that is over: no control
  });

  it('updates a step in place when it finishes, and adds new ones in order', () => {
    let state = pipelineReducer(initialPipelineState, {
      type: 'event',
      event: createMockEvent({ seq: 1, step: createMockStep({ step: 'a', state: 'started' }) }),
    });
    state = pipelineReducer(state, {
      type: 'event',
      event: createMockEvent({ seq: 2, step: createMockStep({ step: 'b', state: 'started' }) }),
    });
    state = pipelineReducer(state, {
      type: 'event',
      event: createMockEvent({ seq: 3, step: createMockStep({ step: 'a', state: 'done' }) }),
    });

    expect(state.steps.map((s) => [s.step, s.state])).toEqual([
      ['a', 'done'],
      ['b', 'started'],
    ]);
  });

  it('ignores an event it has already seen (delivery is at least once)', () => {
    const first = pipelineReducer(initialPipelineState, {
      type: 'event',
      event: createMockEvent({ seq: 5, studentStatus: 'needs_confirmation' }),
    });
    const replay = pipelineReducer(first, {
      type: 'event',
      event: createMockEvent({ seq: 4, studentStatus: 'preparing' }),
    });

    expect(replay).toBe(first);
    expect(replay.studentStatus).toBe('needs_confirmation');
  });

  it('keeps the pickup from a snapshot or an event until a newer one arrives', () => {
    const pickup = createMockPickup();
    let state = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: createMockSnapshot({ studentStatus: 'ready_for_pickup', pickup }),
    });
    state = pipelineReducer(state, {
      type: 'event',
      event: createMockEvent({ seq: 1, studentStatus: 'ready_for_pickup' }),
    });
    expect(state.pickup).toEqual(pickup);

    const moved = createMockPickup({ slot: '3' });
    state = pipelineReducer(state, {
      type: 'event',
      event: createMockEvent({
        seq: 2,
        type: 'pickup',
        studentStatus: 'ready_for_pickup',
        pickup: moved,
      }),
    });
    expect(state.pickup).toEqual(moved);
  });

  it('keeps the plan when a later event does not carry one', () => {
    const plan = createMockPlan();
    let state = pipelineReducer(initialPipelineState, {
      type: 'event',
      event: createMockEvent({ seq: 1, type: 'plan', plan, studentStatus: 'needs_confirmation' }),
    });
    state = pipelineReducer(state, {
      type: 'event',
      event: createMockEvent({
        seq: 2,
        type: 'notice',
        message: 'Reminder',
        studentStatus: 'needs_confirmation',
      }),
    });

    expect(state.plan).toEqual(plan);
    expect(state.message).toBe('Reminder');
  });

  it('shows the new plan from a 409 for a second yes', () => {
    const next = createMockPlan({ planId: 'plan-2' });
    const state = pipelineReducer(initialPipelineState, { type: 'plan', plan: next });

    expect(state).toMatchObject({ plan: next, studentStatus: 'needs_confirmation' });
  });

  it('derives the status of a plan from a 409 from its answer', () => {
    const statusAfter = (answer: Answer) =>
      pipelineReducer(initialPipelineState, {
        type: 'plan',
        plan: createMockPlan({ planId: 'plan-2', answer }),
      }).studentStatus;

    expect(statusAfter('works')).toBe('needs_confirmation');
    expect(statusAfter('works_with_adjustments')).toBe('needs_confirmation');
    expect(statusAfter('needs_choice')).toBe('needs_choice');
    expect(statusAfter('cannot_print')).toBe('cannot_print');
    expect(statusAfter('held')).toBe('preparing');
  });

  it('starts after the events a snapshot already includes (no history replay)', () => {
    const snap = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: createMockSnapshot({ lastSeq: 7 }),
    });
    expect(snap.lastSeq).toBe(7);

    const stale = pipelineReducer(snap, {
      type: 'event',
      event: createMockEvent({ seq: 6, studentStatus: 'preparing' }),
    });
    expect(stale).toBe(snap);

    const next = pipelineReducer(snap, {
      type: 'event',
      event: createMockEvent({ seq: 8, studentStatus: 'queued' }),
    });
    expect(next.studentStatus).toBe('queued');
  });

  it("takes the snapshot's lastSeq as is, even below an earlier number (renumbered streams)", () => {
    const afterEvent = pipelineReducer(initialPipelineState, {
      type: 'event',
      event: createMockEvent({ seq: 40 }),
    });
    const snap = pipelineReducer(afterEvent, {
      type: 'snapshot',
      snapshot: createMockSnapshot({ lastSeq: 3 }),
    });
    expect(snap.lastSeq).toBe(3);
    expect(
      pipelineReducer(snap, {
        type: 'event',
        event: createMockEvent({ seq: 4, studentStatus: 'queued' }),
      }).studentStatus,
    ).toBe('queued');
  });

  describe('the read after an accepted action', () => {
    const queued = () =>
      pipelineReducer(
        pipelineReducer(initialPipelineState, {
          type: 'snapshot',
          snapshot: createMockSnapshot({
            studentStatus: 'needs_confirmation',
            plan: createMockPlan(),
            lastSeq: 5,
          }),
        }),
        { type: 'optimistic', studentStatus: 'queued' },
      );

    it('does not move the status back when nothing newer happened', () => {
      const state = queued();
      const next = pipelineReducer(state, {
        type: 'reread',
        snapshot: createMockSnapshot({
          studentStatus: 'needs_confirmation',
          plan: createMockPlan(),
          lastSeq: 5,
        }),
      });
      expect(next).toBe(state);
      expect(next.studentStatus).toBe('queued');
    });

    it('applies what is strictly newer', () => {
      const next = pipelineReducer(queued(), {
        type: 'reread',
        snapshot: createMockSnapshot({ studentStatus: 'printing', lastSeq: 6 }),
      });
      expect(next).toMatchObject({ studentStatus: 'printing', lastSeq: 6 });
    });

    it('brings the review back with the note when the pipeline refused the action', () => {
      const next = pipelineReducer(queued(), {
        type: 'reread',
        snapshot: createMockSnapshot({
          studentStatus: 'needs_confirmation',
          plan: createMockPlan(),
          lastSeq: 5,
          message: 'We could not take your yes.',
        }),
      });
      expect(next).toMatchObject({
        studentStatus: 'needs_confirmation',
        message: 'We could not take your yes.',
      });
    });

    it('ignores a message the screen already has', () => {
      const withNote = pipelineReducer(queued(), {
        type: 'event',
        event: createMockEvent({ seq: 6, studentStatus: 'queued', message: 'Old note' }),
      });
      const next = pipelineReducer(withNote, {
        type: 'reread',
        snapshot: createMockSnapshot({
          studentStatus: 'needs_confirmation',
          lastSeq: 5,
          message: 'Old note',
        }),
      });
      expect(next).toBe(withNote);
    });
  });

  it('keeps its seq when a snapshot has none (older backend)', () => {
    const afterEvent = pipelineReducer(initialPipelineState, {
      type: 'event',
      event: createMockEvent({ seq: 4 }),
    });
    const snap = pipelineReducer(afterEvent, { type: 'snapshot', snapshot: createMockSnapshot() });
    expect(snap.lastSeq).toBe(4);
  });
});

describe('formatting', () => {
  it('words print time and plastic', () => {
    expect(formatPrintTime(12_300)).toBe('3 h 25 min');
    expect(formatPrintTime(3600)).toBe('1 h');
    expect(formatPrintTime(1500)).toBe('25 min');
    expect(formatPrintTime(10)).toBe('under a minute');
    expect(formatGrams(41.6)).toBe('42 g');
    expect(formatGrams(4.26)).toBe('4.3 g');
  });
});

describe('student status', () => {
  it('words every status a student can see, and tolerates one it does not know', () => {
    expect(studentStage('needs_confirmation')).toMatchObject({
      label: 'Review needed',
      needsAction: true,
    });
    expect(studentStage('cannot_print').label).toBe("Can't print");
    expect(studentStage('brand_new_status').label).toBe('brand new status');
  });

  it('knows which statuses end the story', () => {
    expect(isTerminalStatus('collected')).toBe(true);
    expect(isTerminalStatus('printing')).toBe(false);
  });
});

describe('Specify settings prefill', () => {
  it('reads the pipeline choices from the plan (a StudentSettings with camelCase keys)', () => {
    expect(settingsFromPlan(createMockPlan())).toEqual({
      profile: 'standard',
      infillPercent: 25,
      supports: 'auto',
      supportsBuildPlateOnly: true,
      brim: 'on',
    });
  });

  it('ignores values it does not understand', () => {
    const settings = settingsFromPlan(
      createMockPlan({
        settingsChosen: { profile: 'ultra', infillPercent: 400, brim: 7 } as never,
      }),
    );

    expect(settings).toEqual({
      profile: null,
      infillPercent: null,
      supports: null,
      supportsBuildPlateOnly: null,
      brim: null,
    });
  });

  it('keeps the reason for each setting and notices an edit', () => {
    const plan = createMockPlan();

    expect(settingReasons(plan).infillPercent).toMatch(/load/);
    expect(settingsDiffer(settingsFromPlan(plan), settingsFromPlan(plan))).toBe(false);
    expect(
      settingsDiffer({ ...settingsFromPlan(plan), infillPercent: 50 }, settingsFromPlan(plan)),
    ).toBe(true);
  });
});

describe('after the print', () => {
  const questions = [
    { questionId: 1, text: 'Did the top overhang curl?' },
    { questionId: 2, text: 'Is the text readable?' },
  ];

  it('takes the follow-up questions from the snapshot and from a followup event', () => {
    let state = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected', followups: [questions[0]] },
    });
    expect(state.followups).toEqual([questions[0]]);

    state = pipelineReducer(state, {
      type: 'event',
      event: {
        seq: 5,
        type: 'followup',
        studentStatus: 'collected',
        followups: questions,
      },
    });
    expect(state.followups).toEqual(questions);
  });

  it('keeps the questions when a later event carries none', () => {
    let state = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected', followups: questions },
    });
    state = pipelineReducer(state, {
      type: 'event',
      event: { seq: 1, type: 'status', studentStatus: 'collected' },
    });
    expect(state.followups).toEqual(questions);
  });

  it('remembers each question handled once, and a repeat changes nothing', () => {
    const once = pipelineReducer(initialPipelineState, { type: 'followup-handled', questionId: 1 });
    const twice = pipelineReducer(once, { type: 'followup-handled', questionId: 1 });
    expect(once.handledFollowups).toEqual([1]);
    expect(twice).toBe(once);
  });

  it('keeps a rating given here when a late snapshot still says it is pending', () => {
    let state = pipelineReducer(initialPipelineState, { type: 'rated', rating: 'down' });
    state = pipelineReducer(state, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected', ratingPending: true },
    });
    expect(state.ratingPending).toBe(false);
    expect(state.rating).toBe('down');
  });

  it('takes a rating back when the server could not save it, so the card asks again', () => {
    const rated = pipelineReducer(
      pipelineReducer(initialPipelineState, {
        type: 'snapshot',
        snapshot: createMockSnapshot({ studentStatus: 'collected', ratingPending: true }),
      }),
      { type: 'rated', rating: 'up' },
    );
    expect(rated).toMatchObject({ rating: 'up', ratingPending: false });

    const failed = pipelineReducer(rated, { type: 'rating-failed' });

    expect(failed).toMatchObject({ rating: null, ratingPending: true });
  });

  it('learns from the snapshot whether the collected print still needs its rating', () => {
    const unknown = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected' },
    });
    expect(unknown.ratingPending).toBeNull();

    const pending = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected', ratingPending: true },
    });
    expect(pending.ratingPending).toBe(true);

    const rated = pipelineReducer(pending, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected', ratingPending: false },
    });
    expect(rated.ratingPending).toBe(false);
  });
});
