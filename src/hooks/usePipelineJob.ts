'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { pipelineApi } from '@/api/client/pipeline';
import { isTerminalStatus } from '@/lib/student-status';
import { initialPipelineState, pipelineReducer, type PipelineState } from '@/lib/pipeline-state';
import type { PipelineSnapshot, Plan, Rating, StudentStatus } from '@/types/pipeline';

export type StreamConnection = 'connecting' | 'live' | 'reconnecting' | 'closed';

export interface UsePipelineJobOptions {
  /** Pause between reconnect attempts grows from this (ms), doubling up to `maxRetryMs`. */
  retryBaseMs?: number;
  maxRetryMs?: number;
  /** Off for jobs the pipeline has nothing to say about. */
  enabled?: boolean;
  /**
   * A snapshot the server already read (the job page does). The screen starts from it, so a review
   * is there on the first paint, and the stream opens at once from its `lastSeq` instead of after
   * a second read; later reads (after an action, or a dropped stream) fetch fresh.
   */
  initialSnapshot?: PipelineSnapshot | null;
}

/** Statuses after which the snapshot has facts the stream events lack (the rating card needs `ratingPending`). */
const REREAD_STATUSES: ReadonlySet<StudentStatus> = new Set<StudentStatus>([
  'ready_for_pickup',
  'collected',
]);

/**
 * Follows one job's pipeline run: loads the snapshot at once, then streams events live (steps,
 * status, plan) and applies them in order. If the stream breaks it reconnects with backoff and
 * re-reads the snapshot each time, so a proxy that buffers or drops it degrades to polling
 * instead of a frozen screen. Stops by itself once the job reaches a final status.
 */
export function usePipelineJob(
  jobId: string,
  {
    retryBaseMs = 1000,
    maxRetryMs = 10_000,
    enabled = true,
    initialSnapshot = null,
  }: UsePipelineJobOptions = {},
) {
  const [state, dispatch] = useReducer(
    pipelineReducer,
    initialSnapshot,
    (snapshot): PipelineState =>
      snapshot
        ? pipelineReducer(initialPipelineState, { type: 'snapshot', snapshot })
        : initialPipelineState,
  );
  const [connection, setConnection] = useState<StreamConnection>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const lastSeq = useRef(initialSnapshot?.lastSeq ?? 0);
  // Only the first run may start from the server's snapshot; after that it would be stale.
  const seed = useRef(initialSnapshot);
  const [refreshToken, setRefreshToken] = useState(0);

  /** Re-reads the snapshot and reopens the stream (after an action, or on "try again"). */
  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const { signal } = controller;
    let attempt = 0;
    // A final status arrived on this run. Only then is the stream closed for good: a re-read (refresh)
    // also aborts this run, and must not show the link as closed while the next run is live.
    let finished = false;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        });
      });

    async function run() {
      while (!signal.aborted) {
        let status: StudentStatus | null = null;
        try {
          const seeded = seed.current;
          seed.current = null;
          const snapshot = seeded ?? (await pipelineApi.getState(jobId, { signal }));
          if (signal.aborted) return;
          dispatch({ type: 'snapshot', snapshot });
          // Stream from where the snapshot ends instead of replaying the whole history.
          lastSeq.current = Math.max(lastSeq.current, snapshot.lastSeq ?? 0);
          setError(null);
          status = snapshot.studentStatus;
        } catch (caught) {
          if (signal.aborted) return;
          setError(caught instanceof Error ? caught : new Error('Could not load the job'));
        }

        if (status && isTerminalStatus(status)) {
          setConnection('closed');
          return;
        }

        try {
          await pipelineApi.stream(jobId, {
            signal,
            lastSeq: lastSeq.current,
            onOpen: () => {
              attempt = 0;
              setConnection('live');
            },
            onEvent: (event) => {
              lastSeq.current = Math.max(lastSeq.current, event.seq);
              dispatch({ type: 'event', event });
              // The snapshot carries what a stream event does not (e.g. ratingPending after pickup),
              // so re-read it when the student's screen changes to one of these.
              if (REREAD_STATUSES.has(event.studentStatus)) refresh();
              if (isTerminalStatus(event.studentStatus)) {
                finished = true;
                controller.abort();
              }
            },
          });
        } catch {
          // Fall through to the backoff below; the next loop re-reads the snapshot.
        }
        if (signal.aborted) return;
        setConnection('reconnecting');
        await wait(Math.min(retryBaseMs * 2 ** attempt, maxRetryMs));
        attempt += 1;
      }
    }

    void run().finally(() => {
      if (finished) setConnection('closed');
    });
    return () => controller.abort();
  }, [jobId, enabled, retryBaseMs, maxRetryMs, refreshToken, refresh]);

  const showPlan = useCallback((plan: Plan) => dispatch({ type: 'plan', plan }), []);
  const setOptimisticStatus = useCallback(
    (studentStatus: StudentStatus) => dispatch({ type: 'optimistic', studentStatus }),
    [],
  );

  /** The server took a rating (so a late snapshot can't take it back). */
  const markRated = useCallback((rating: Rating) => dispatch({ type: 'rated', rating }), []);
  /** The rating shown at once could not be saved: ask again. */
  const markRatingFailed = useCallback(() => dispatch({ type: 'rating-failed' }), []);
  /** A follow-up question was answered or skipped. */
  const markFollowupHandled = useCallback(
    (questionId: number) => dispatch({ type: 'followup-handled', questionId }),
    [],
  );

  return {
    ...state,
    connection,
    error,
    refresh,
    showPlan,
    setOptimisticStatus,
    markRated,
    markRatingFailed,
    markFollowupHandled,
  };
}
