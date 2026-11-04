import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import type {
  PipelineSnapshot,
  PipelineStreamEvent,
  Plan,
  StepProgress,
  StudentInputs,
} from '@/types/pipeline';
import { createMockLessonCard, createMockPlan } from '../../../test/utils/pipelineFactories';
import { MOCK_HIGHLIGHTS_URL, MOCK_MODEL_URL } from './data/mock-part';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

// A scripted pipeline for development without a backend (MOCK_ENABLED=true). Each job id plays
// the same story, paced by the clock from the first time it is asked about:
//   steps arrive one by one -> a choice is needed (unless the id says otherwise) -> review -> yes.
// Ids containing "pickup" are ready for collection, "review" start at the review, "cannot" ends in "can't print", "choice" asks for a choice.

const STEP_MS = 1500;

// A stand-in for the pipeline's preview image: a bracket on a print plate, as an inline SVG
const PREVIEW_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1c1f26"/>' +
    '<rect x="40" y="215" width="320" height="14" rx="4" fill="#2d333d"/>' +
    '<path d="M110 215V120h40v60h130v35z" fill="#8a38f5"/><path d="M150 120h40l90 60H150z" fill="#a96cf8"/>' +
    '<path d="M190 120l90 60v35" fill="none" stroke="#3fb950" stroke-width="3" stroke-dasharray="6 5"/></svg>',
);
const PREVIEW_URL = `data:image/svg+xml;charset=utf-8,${PREVIEW_SVG}`;

const STEPS: Omit<StepProgress, 'state'>[] = [
  {
    step: 'intake.load_mesh',
    title: 'Checking your file',
    teaching: 'We make sure the model is one solid piece, with no holes in its skin.',
  },
  {
    step: 'intake.measure',
    title: 'Measuring your part',
    teaching: 'Size, thin walls and overhangs all decide how a part should be printed.',
  },
  {
    step: 'orient.candidates',
    title: 'Trying ways to lay it on the plate',
    teaching: 'A flat face on the plate sticks best; we try several and score each one.',
  },
  {
    step: 'slice.default',
    title: 'Slicing a test print',
    teaching: 'Slicing cuts the part into layers. Our real slice shows where it would struggle.',
  },
  {
    step: 'decide.packs',
    title: 'Tuning settings for your part',
    teaching: 'Thin parts, overhangs and strong parts each get their own small adjustments.',
  },
  {
    step: 'verify.final',
    title: 'Double-checking the final file',
    teaching: 'A separate checker looks at the finished file before anything reaches a printer.',
  },
];

interface Session {
  startedAt: number;
  confirmed: boolean;
  choiceDone: boolean;
  inputs: StudentInputs | null;
  planVersion: number;
}

const sessions = new Map<string, Session>();

function sessionFor(jobId: string): Session {
  let session = sessions.get(jobId);
  if (!session) {
    session = {
      startedAt: jobId.includes('review') ? 0 : Date.now(),
      confirmed: false,
      choiceDone: false,
      inputs: null,
      planVersion: 1,
    };
    sessions.set(jobId, session);
  }
  return session;
}

function planFor(jobId: string, session: Session): Plan {
  const planId = `${jobId}-plan-${session.planVersion}`;
  if (jobId.includes('cannot')) {
    return createMockPlan({
      planId,
      artifacts: [
        { kind: 'preview_png', url: PREVIEW_URL },
        { kind: 'model_glb', url: MOCK_MODEL_URL },
        { kind: 'highlights_json', url: MOCK_HIGHLIGHTS_URL.cannot },
      ],
      answer: 'cannot_print',
      summary:
        'The walls of your part are 0.3 mm thick, and our printers cannot make anything thinner than 0.8 mm that will survive being ejected.',
      printTimeS: null,
      filamentG: null,
      lessonCards: [
        {
          code: 'walls.too_thin',
          title: 'The walls are too thin',
          body: 'Make every wall at least 1.2 mm thick (0.8 mm is the absolute minimum). Thicken the 3 areas marked on the part, then upload it again.',
          severity: 'cannot_print',
          consequential: true,
        },
      ],
      choices: [],
    });
  }
  const needsChoice = !session.choiceDone && !jobId.includes('review');
  return createMockPlan({
    planId,
    artifacts: [
      { kind: 'preview_png', url: PREVIEW_URL },
      { kind: 'model_glb', url: MOCK_MODEL_URL },
      { kind: 'highlights_json', url: MOCK_HIGHLIGHTS_URL.review },
    ],
    lessonCards: [
      createMockLessonCard(),
      createMockLessonCard({
        code: 'base.brim_added',
        title: 'We added a brim around the base',
        body: 'The base is narrow, so a thin extra ring of plastic helps it stay stuck to the plate. It snaps off after printing.',
        region: { faces: [2, 3] },
      }),
      createMockLessonCard({
        code: 'surface.minor_stringing',
        title: 'Small gaps may leave fine strings',
        body: 'Thin gaps can pick up a few wisps of plastic. They pull off by hand.',
        severity: 'info',
        region: null,
        consequential: false,
      }),
    ],
    answer: needsChoice ? 'needs_choice' : 'works_with_adjustments',
    choices: needsChoice
      ? [
          {
            choiceId: 'orientation',
            question: 'How should we lay your part on the plate?',
            options: [
              {
                optionId: 'flat',
                label: 'Lying flat (recommended)',
                explanation: 'Sticks best and needs few supports. Layer lines run across the hook.',
                recommended: true,
              },
              {
                optionId: 'upright',
                label: 'Standing up',
                explanation: 'Stronger along the hook, but a small base risks tipping over.',
              },
            ],
          },
        ]
      : [],
  });
}

function snapshotFor(jobId: string): PipelineSnapshot {
  const session = sessionFor(jobId);
  if (jobId.includes('pickup')) {
    return {
      studentStatus: 'ready_for_pickup',
      plan: planFor(jobId, session),
      pickup: {
        slot: '14',
        tag: 'K7Q2',
        windowEndsAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        artifacts: [{ kind: 'preview_png', url: PREVIEW_URL }],
      },
      steps: allSteps('done'),
    };
  }
  if (session.confirmed)
    return { studentStatus: 'queued', plan: planFor(jobId, session), steps: allSteps('done') };

  const elapsed = Date.now() - session.startedAt;
  const done = Math.min(STEPS.length, Math.floor(elapsed / STEP_MS));
  if (done < STEPS.length) {
    const steps: StepProgress[] = STEPS.slice(0, done + 1).map((step, index) => ({
      ...step,
      state: index < done ? 'done' : 'started',
    }));
    return { studentStatus: 'preparing', plan: null, steps };
  }
  const plan = planFor(jobId, session);
  const studentStatus = jobId.includes('cannot')
    ? 'cannot_print'
    : plan.choices?.length
      ? 'needs_choice'
      : 'needs_confirmation';
  return { studentStatus, plan, steps: allSteps('done') };
}

const allSteps = (state: StepProgress['state']): StepProgress[] =>
  STEPS.map((step) => ({ ...step, state }));

function requireUser(cookies: Record<string, string>) {
  return db.validateSession(cookies['sessionToken'] || '');
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const pipelineHandlers = [
  http.get(`${apiUrl}/api/v1/jobs/:jobId/pipeline`, ({ cookies, params }) => {
    if (!requireUser(cookies)) return createInvalidSessionResponse();
    return HttpResponse.json(generateSuccessResponse(snapshotFor(String(params.jobId))));
  }),

  // Server-sent events: what changed since the last poll, until the job stops needing the clock.
  http.get(`${apiUrl}/api/v1/jobs/:jobId/pipeline/stream`, ({ cookies, params, request }) => {
    if (!requireUser(cookies)) return createInvalidSessionResponse();
    const jobId = String(params.jobId);
    const encoder = new TextEncoder();
    let seq = 0;
    let lastKey = '';
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        request.signal.addEventListener('abort', () => (closed = true));
        const send = (event: Omit<PipelineStreamEvent, 'seq'>) => {
          seq += 1;
          controller.enqueue(
            encoder.encode(`id: ${seq}\ndata: ${JSON.stringify({ seq, ...event })}\n\n`),
          );
        };
        const seen = new Map<string, string>();
        for (let tick = 0; tick < 40 && !closed; tick += 1) {
          const snap = snapshotFor(jobId);
          for (const step of snap.steps ?? []) {
            if (seen.get(step.step) === step.state) continue;
            seen.set(step.step, step.state);
            send({ type: 'step', studentStatus: 'preparing', step });
          }
          const key = `${snap.studentStatus}|${snap.plan?.planId ?? ''}`;
          if (key !== lastKey) {
            lastKey = key;
            send({
              type: snap.plan ? 'plan' : 'status',
              studentStatus: snap.studentStatus,
              plan: snap.plan,
            });
          }
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch {
            return;
          }
          await sleep(500);
        }
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      },
      cancel() {
        closed = true;
      },
    });

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }),

  http.post(
    `${apiUrl}${endpoints.pipeline.inputs(':jobId')}`,
    async ({ cookies, params, request }) => {
      if (!requireUser(cookies)) return createInvalidSessionResponse();
      const session = sessionFor(String(params.jobId));
      const inputs = (await request.json()) as StudentInputs;
      session.inputs = { ...session.inputs, ...inputs };
      if (inputs.settings) session.planVersion += 1;
      return HttpResponse.json(generateSuccessResponse(null), { status: 202 });
    },
  ),

  http.post(
    `${apiUrl}${endpoints.pipeline.confirm(':jobId')}`,
    async ({ cookies, params, request }) => {
      if (!requireUser(cookies)) return createInvalidSessionResponse();
      const jobId = String(params.jobId);
      const session = sessionFor(jobId);
      const { planId } = (await request.json()) as { planId: string };
      const current = planFor(jobId, session);
      if (planId !== current.planId) {
        return HttpResponse.json(generateSuccessResponse({ plan: current }), { status: 409 });
      }
      session.confirmed = true;
      return HttpResponse.json(generateSuccessResponse(null), { status: 202 });
    },
  ),

  http.post(`${apiUrl}${endpoints.pipeline.choices(':jobId')}`, async ({ cookies, params }) => {
    if (!requireUser(cookies)) return createInvalidSessionResponse();
    const session = sessionFor(String(params.jobId));
    session.choiceDone = true;
    session.planVersion += 1;
    return HttpResponse.json(generateSuccessResponse(null), { status: 202 });
  }),

  http.post(`${apiUrl}${endpoints.pipeline.report(':jobId')}`, ({ cookies }) => {
    if (!requireUser(cookies)) return createInvalidSessionResponse();
    return HttpResponse.json(generateSuccessResponse(null), { status: 202 });
  }),
];
