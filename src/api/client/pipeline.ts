import type {
  ChoiceRequest,
  ConfirmRequest,
  DisagreeAnswer,
  DisagreeEscalateRequest,
  DisagreeQuestion,
  FollowupAnswer,
  FollowupAnswerRequest,
  PipelineSnapshot,
  PipelineStreamEvent,
  Plan,
  QualityReportRequest,
  Rating,
  RatingRequest,
  StudentInputs,
  UnratedPrint,
} from '@/types/pipeline';
import type { ApiResponseRaw } from '../types';
import { ApiError, ErrorCodes } from './errors';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

/**
 * The browser side of the print pipeline: the "Browser ↔ backend" endpoints in
 * slicing-pipeline/docs/design/dashboard-contract.md. Meant for client components (it uses the
 * relative base URL and the session cookie). A server component can read a snapshot too (the job
 * page does, so the review is in the first HTML): there the session cookies are forwarded by hand.
 * The server never needs the live stream.
 */

/** Server side only: the auth cookies of the current request, as apiRequest forwards them. */
async function serverCookieHeader(): Promise<Record<string, string>> {
  if (typeof window !== 'undefined') return {};
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const pairs = ['sessionToken', 'mfaToken']
    .map((name) => [name, store.get(name)?.value] as const)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`);
  return pairs.length > 0 ? { Cookie: pairs.join('; ') } : {};
}

/** The plan changed while the student was looking at the old one (HTTP 409): ask again. */
export class PlanChangedError extends Error {
  constructor(
    /** The new plan to show for a second yes, when the response carried it. */
    public plan: Plan | null,
    message = 'The plan changed. Please review it again.',
  ) {
    super(message);
    this.name = 'PlanChangedError';
  }
}

const isPlan = (value: unknown): value is Plan =>
  typeof value === 'object' && value !== null && typeof (value as Plan).planId === 'string';

/** A 409 carries the new plan at `data.plan` of the usual ApiResponse (dashboard contract). */
export function planFromConflictBody(body: unknown): Plan | null {
  const plan = (body as { data?: { plan?: unknown } } | null)?.data?.plan;
  return isPlan(plan) ? plan : null;
}

/** Error code of a 409 on an action that is not about the plan (not ready to rate, already answered). */
export const CONFLICT_CODE = 'CONFLICT';

/**
 * The prints to rate before a new 3D-print job, when the backend refused to create or reorder one
 * with 409 `RATING_REQUIRED` (P-20: a hard block); null for any other error.
 */
export function unratedPrintsOf(error: unknown): UnratedPrint[] | null {
  if (!(error instanceof ApiError) || error.code !== ErrorCodes.RATING_REQUIRED) return null;
  return unratedPrintsIn(error.data);
}

/** The `unratedPrints` list of a `RATING_REQUIRED` body or of the look-ahead; empty when missing. */
function unratedPrintsIn(data: unknown): UnratedPrint[] {
  const prints = (data as { unratedPrints?: unknown } | null | undefined)?.unratedPrints;
  return Array.isArray(prints)
    ? prints.filter(
        (print): print is UnratedPrint =>
          typeof print === 'object' &&
          print !== null &&
          typeof (print as UnratedPrint).jobId === 'string',
      )
    : [];
}

/** The backend refused the action because of the job's state (HTTP 409), not the plan. */
export const isConflictError = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === CONFLICT_CODE;

interface PipelineRequestOptions {
  /** A 409 means "the plan changed" (confirm, choices); elsewhere it is a plain conflict. */
  conflictIsPlanChange?: boolean;
}

async function pipelineRequest<T>(
  url: string,
  init: RequestInit = {},
  { conflictIsPlanChange = true }: PipelineRequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${url}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(await serverCookieHeader()),
        ...init.headers,
      },
    });
  } catch (error) {
    throw new ApiError(
      ErrorCodes.REQUEST_FAILED,
      `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { url, originalError: error },
    );
  }

  if (response.status === 204) return undefined as T;

  let body: ApiResponseRaw<T> | null = null;
  try {
    body = (await response.json()) as ApiResponseRaw<T>;
  } catch {
    body = null;
  }

  if (response.status === 409) {
    if (conflictIsPlanChange) throw new PlanChangedError(planFromConflictBody(body));
    throw new ApiError(
      CONFLICT_CODE,
      body?.error?.message ?? 'That is no longer possible for this job.',
      body?.error?.details,
    );
  }

  if (!body) {
    throw new ApiError(
      ErrorCodes.RESPONSE_INVALID_CONTENT_TYPE,
      'Failed to parse response as JSON',
      { url, status: response.status },
    );
  }
  if (!body.success || body.error) {
    throw new ApiError(
      body.error?.code || 'UNKNOWN_ERROR',
      body.error?.message,
      body.error?.details,
    );
  }
  return body.data;
}

const post = <T>(url: string, payload: unknown) =>
  pipelineRequest<T>(url, { method: 'POST', body: JSON.stringify(payload) });

/** An action after the print (rate, report, answer): a 409 is a conflict, never a plan change. */
const postAction = <T>(url: string, payload?: unknown) =>
  pipelineRequest<T>(
    url,
    { method: 'POST', ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) },
    { conflictIsPlanChange: false },
  );

// -- Server-sent events ----------------------------------------------------------------------

/** One parsed SSE frame. */
export interface SseFrame {
  event?: string;
  id?: string;
  data: string;
}

/**
 * Incremental parser for text/event-stream: feed it decoded chunks (frames may be split anywhere)
 * and it calls `onFrame` for each complete frame. Comment lines (": keep-alive") are ignored.
 */
export function createSseParser(onFrame: (frame: SseFrame) => void) {
  let buffer = '';
  return {
    push(chunk: string) {
      buffer += chunk;
      let match: RegExpExecArray | null;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const raw = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const frame: SseFrame = { data: '' };
        const data: string[] = [];
        for (const line of raw.split(/\r?\n/)) {
          if (!line || line.startsWith(':')) continue;
          const colon = line.indexOf(':');
          const field = colon === -1 ? line : line.slice(0, colon);
          const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
          if (field === 'data') data.push(value);
          else if (field === 'event') frame.event = value;
          else if (field === 'id') frame.id = value;
        }
        frame.data = data.join('\n');
        if (data.length > 0) onFrame(frame);
      }
    },
  };
}

export interface StreamOptions {
  signal?: AbortSignal;
  /** The last `seq` already seen, sent as Last-Event-ID so the backend can skip what we have. */
  lastSeq?: number;
  onOpen?: () => void;
  onEvent: (event: PipelineStreamEvent) => void;
}

export const pipelineApi = {
  /**
   * Rate first (P-20), look-ahead: the student's collected prints that still need their one tap,
   * oldest first (empty when none, or when the gate is off). Same rule and shape as the 409
   * `RATING_REQUIRED` that creating a job answers with, so the new-print screen can ask before
   * the file instead of after.
   */
  pendingRatings: async (options?: RequestInit): Promise<UnratedPrint[]> =>
    unratedPrintsIn(
      await pipelineRequest<unknown>(
        endpoints.pipeline.pendingRatings,
        { method: 'GET', ...options },
        { conflictIsPlanChange: false },
      ),
    ),

  /** The student-safe state of a job's pipeline run: status, plan, steps so far, message. */
  getState: (jobId: string, options?: RequestInit) =>
    pipelineRequest<PipelineSnapshot>(endpoints.pipeline.state(jobId), {
      method: 'GET',
      ...options,
    }),

  /**
   * Follows the job live. Resolves when the server closes the stream, rejects when it can't be
   * opened or breaks; the caller decides whether to reconnect. Uses fetch rather than
   * EventSource so the session cookie, abort signal and Last-Event-ID behave the same everywhere.
   */
  stream: async (jobId: string, { signal, lastSeq, onOpen, onEvent }: StreamOptions) => {
    let response: Response;
    try {
      response = await fetch(`${getBaseUrl()}${endpoints.pipeline.stream(jobId)}`, {
        method: 'GET',
        credentials: 'include',
        signal,
        headers: {
          Accept: 'text/event-stream',
          ...(lastSeq ? { 'Last-Event-ID': String(lastSeq) } : {}),
        },
      });
    } catch (error) {
      if (signal?.aborted) return;
      throw new ApiError(ErrorCodes.REQUEST_FAILED, 'Could not open the live stream', {
        originalError: error,
      });
    }
    if (!response.ok || !response.body) {
      throw new ApiError(ErrorCodes.REQUEST_FAILED, `Live stream refused (${response.status})`);
    }

    onOpen?.();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser((frame) => {
      try {
        onEvent(JSON.parse(frame.data) as PipelineStreamEvent);
      } catch {
        // A frame that isn't an event (a ping, a malformed line) is skipped, never fatal.
      }
    });
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (signal?.aborted) return;
      throw new ApiError(ErrorCodes.REQUEST_FAILED, 'The live stream was interrupted', {
        originalError: error,
      });
    }
  },

  /**
   * Saves what the student typed (`update_inputs`). Safe to call again with the same values. A 409
   * means the job no longer takes inputs (the student already said yes), not that the plan changed.
   */
  saveInputs: (jobId: string, inputs: StudentInputs) =>
    postAction<void>(endpoints.pipeline.inputs(jobId), inputs),

  /**
   * The explicit yes. Throws PlanChangedError (HTTP 409) when the plan is no longer the one the
   * student saw; its `plan` is the new one to show for a second yes.
   */
  confirm: (jobId: string, planId: string) =>
    post<void>(endpoints.pipeline.confirm(jobId), { planId } satisfies ConfirmRequest),

  /** Answers one open choice; also refused with PlanChangedError when the plan moved on. */
  choose: (jobId: string, request: ChoiceRequest) =>
    post<void>(endpoints.pipeline.choices(jobId), request),

  /** "Report a problem": free text to the crew, tied to this job. */
  report: (jobId: string, text: string) => post<void>(endpoints.pipeline.report(jobId), { text }),

  /**
   * The one-tap thumbs up or down (P-20), one rating per print: the same again is accepted, a
   * different one is a conflict. Answers with the job's updated student view. A rating also means
   * the student has the print (P-136: there is no "I've collected it" step), so it is accepted
   * while a print is still ready for pickup, and the backend records the collection.
   */
  rate: (jobId: string, rating: Rating) =>
    postAction<PipelineSnapshot>(endpoints.pipeline.rating(jobId), {
      rating,
    } satisfies RatingRequest),

  /**
   * The optional "report print quality" step after a thumbs-down (P-102): reasons from the
   * pipeline's list (it refuses others) and the student's own words.
   */
  reportQuality: (jobId: string, report: QualityReportRequest) =>
    postAction<PipelineSnapshot>(endpoints.pipeline.quality(jobId), {
      reasons: report.reasons,
      ...(report.text?.trim() ? { text: report.text.trim() } : {}),
    } satisfies QualityReportRequest),

  /** One follow-up answer (P-109). A second answer to the same question is a conflict. */
  answerFollowup: (jobId: string, questionId: number, answer: FollowupAnswer) =>
    postAction<PipelineSnapshot>(endpoints.pipeline.followup(jobId, questionId), {
      answer,
    } satisfies FollowupAnswerRequest),

  /**
   * Asks the "Ask why" assistant about a decision (P-54). `request.requestId` is the idempotency
   * key: send the same one again to retry and the stored answer comes back without counting
   * against the limits. A 200 carries whatever `status` the assistant gave (`unavailable` and
   * `rate_limited` included), so only a transport or request error throws. Never cached.
   */
  disagree: (jobId: string, request: DisagreeQuestion) =>
    pipelineRequest<DisagreeAnswer>(
      endpoints.pipeline.disagree(jobId),
      {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({ requestId: request.requestId, text: request.text }),
      },
      { conflictIsPlanChange: false },
    ),

  /**
   * "Ask the crew": hands the conversation to staff, with the student's own words if they add any.
   * A 409 (`isConflictError`) means it is already with the crew.
   */
  escalateDisagree: (jobId: string, text?: string) =>
    pipelineRequest<void>(
      endpoints.pipeline.disagreeEscalate(jobId),
      {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify(
          (text?.trim() ? { text: text.trim() } : {}) satisfies DisagreeEscalateRequest,
        ),
      },
      { conflictIsPlanChange: false },
    ),
};
