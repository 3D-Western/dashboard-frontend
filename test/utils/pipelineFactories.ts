import type {
  LessonCard,
  PipelineSnapshot,
  PipelineStreamEvent,
  Plan,
  StepProgress,
} from '@/types/pipeline';

export function createMockStep(overrides: Partial<StepProgress> = {}): StepProgress {
  return {
    step: 'intake.load_mesh',
    title: 'Checking your file',
    teaching: 'We make sure the model is one solid piece with no holes in its skin.',
    state: 'done',
    durationMs: 420,
    ...overrides,
  };
}

export function createMockLessonCard(overrides: Partial<LessonCard> = {}): LessonCard {
  return {
    code: 'overhang.supports_added',
    title: 'We added supports under the arm',
    body: 'The arm sticks out sideways by more than 45 degrees, so plastic would sag without something under it. The supports peel off after printing.',
    severity: 'adjusted',
    region: { bboxMm: [10, 0, 5, 40, 12, 18] },
    consequential: true,
    ...overrides,
  };
}

export function createMockPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    planId: 'plan-1',
    answer: 'works_with_adjustments',
    summary:
      'Your bracket prints well lying on its back. We added supports under the arm and a brim to keep the thin base stuck down.',
    printTimeS: 12_300,
    filamentG: 41.6,
    settingsChosen: {
      profile: 'standard',
      infill_percent: 25,
      supports: 'auto',
      supports_build_plate_only: true,
      brim: 'on',
    },
    settingsReasons: {
      profile: 'Standard balances speed and a smooth surface for a part like this.',
      infill_percent: 'You said it holds a load, so we went above the 15% default.',
      brim: 'The base is narrow, and a brim helps it stay stuck to the plate.',
    },
    lessonCards: [
      createMockLessonCard(),
      createMockLessonCard({
        code: 'surface.minor_stringing',
        title: 'Small gaps may leave fine strings',
        body: 'Thin gaps can pick up a few wisps of plastic. They pull off by hand.',
        severity: 'info',
        region: null,
        consequential: false,
      }),
    ],
    choices: [],
    artifacts: [{ kind: 'preview_png', url: '/preview.png' }],
    ...overrides,
  };
}

export function createMockSnapshot(overrides: Partial<PipelineSnapshot> = {}): PipelineSnapshot {
  return {
    studentStatus: 'preparing',
    plan: null,
    steps: [],
    message: null,
    ...overrides,
  };
}

export function createMockEvent(overrides: Partial<PipelineStreamEvent> = {}): PipelineStreamEvent {
  return {
    seq: 1,
    type: 'step',
    studentStatus: 'preparing',
    ...overrides,
  };
}

/** One text/event-stream body from events (what the backend's stream endpoint sends). */
export function sseBody(events: PipelineStreamEvent[]): string {
  return events.map((event) => `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`).join('');
}

/** A streaming Response that delivers the body in the given pieces, then ends. */
export function sseResponse(pieces: string[], init: ResponseInit = {}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      pieces.forEach((piece) => controller.enqueue(encoder.encode(piece)));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
    ...init,
  });
}
