import { describe, it, expect } from 'vitest';
import {
  formatGrams,
  formatPrintTime,
  initialPipelineState,
  pipelineReducer,
} from './pipeline-state';
import { settingReasons, settingsDiffer, settingsFromPlan } from './pipeline-settings';
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

  it('keeps a rating given here when a late snapshot does not know it yet', () => {
    let state = pipelineReducer(initialPipelineState, { type: 'rated', rating: 'down' });
    state = pipelineReducer(state, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected', rated: false },
    });
    expect(state.rated).toBe(true);
    expect(state.rating).toBe('down');
  });

  it('learns from the snapshot whether the print was rated', () => {
    const unknown = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected' },
    });
    expect(unknown.rated).toBeNull();

    const rated = pipelineReducer(initialPipelineState, {
      type: 'snapshot',
      snapshot: { studentStatus: 'collected', rated: true, rating: 'up' },
    });
    expect(rated.rated).toBe(true);
    expect(rated.rating).toBe('up');
  });
});
