import type {
  ChoiceRequest,
  ConfirmRequest,
  FollowupAnswer,
  FollowupAnswerRequest,
  PipelineSnapshot,
  PipelineStreamEvent,
  Plan,
  QualityReportRequest,
  Rating,
  RatingRequest,
  StudentInputs,
} from '@/types/pipeline';
import type { ApiResponseRaw } from '../types';
import { ApiError, ErrorCodes } from './errors';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

/**
 * The browser side of the print pipeline: the "Browser ↔ backend" endpoints in
 * slicing-pipeline/docs/design/dashboard-contract.md. Meant for client components (it uses the
 * relative base URL and the session cookie); the server never needs the live stream.
 */

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

/** Error code of a 409 on an action that is not about the plan (nothing to collect, already answered). */
export const CONFLICT_CODE = 'CONFLICT';

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

/** An action after the print (collect, rate, report, answer): a 409 is a conflict, never a plan change. */
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

  /** Saves what the student typed (`update_inputs`). Safe to call again with the same values. */
  saveInputs: (jobId: string, inputs: StudentInputs) =>
    post<void>(endpoints.pipeline.inputs(jobId), inputs),

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
   * "I've collected it" (P-78). Rejected with a conflict (see `isConflictError`) when nothing is
   * ready to collect, e.g. it was already marked, or the print isn't done.
   */
  collected: (jobId: string) => postAction<void>(endpoints.pipeline.collected(jobId)),

  /** The one-tap thumbs up or down (P-20). Answers with the stored rating. */
  rate: (jobId: string, rating: Rating) =>
    postAction<{ rating?: Rating } | null>(endpoints.pipeline.rating(jobId), {
      rating,
    } satisfies RatingRequest),

  /**
   * The optional "report print quality" step after a thumbs-down (P-102): reasons from the
   * pipeline's list (it refuses others) and the student's own words.
   */
  reportQuality: (jobId: string, report: QualityReportRequest) =>
    postAction<void>(endpoints.pipeline.quality(jobId), {
      reasons: report.reasons,
      ...(report.text?.trim() ? { text: report.text.trim() } : {}),
    } satisfies QualityReportRequest),

  /** One follow-up answer (P-109). A second answer to the same question is a conflict. */
  answerFollowup: (jobId: string, questionId: number, answer: FollowupAnswer) =>
    postAction<void>(endpoints.pipeline.followup(jobId, questionId), {
      answer,
    } satisfies FollowupAnswerRequest),
};
