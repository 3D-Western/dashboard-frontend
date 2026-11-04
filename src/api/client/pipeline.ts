import type {
  ChoiceRequest,
  ConfirmRequest,
  PipelineSnapshot,
  PipelineStreamEvent,
  Plan,
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

/**
 * Where a 409 carries the new plan isn't fixed by the contract ("the response carries the new
 * plan"), so look in the places the backend's ApiResponse wrapper could put it.
 */
export function planFromConflictBody(body: unknown): Plan | null {
  if (typeof body !== 'object' || body === null) return null;
  const { data, error, plan } = body as {
    data?: unknown;
    error?: { details?: unknown };
    plan?: unknown;
  };
  const candidates: unknown[] = [
    (data as { plan?: unknown } | null | undefined)?.plan,
    data,
    (error?.details as { plan?: unknown } | null | undefined)?.plan,
    error?.details,
    plan,
  ];
  return candidates.find(isPlan) ?? null;
}

async function pipelineRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
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

  if (response.status === 409) throw new PlanChangedError(planFromConflictBody(body));

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
};
