'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { pipelineApi } from '@/api/client/pipeline';
import { isTerminalStatus } from '@/lib/student-status';
import { initialPipelineState, pipelineReducer } from '@/lib/pipeline-state';
import type { Plan, StudentStatus } from '@/types/pipeline';

export type StreamConnection = 'connecting' | 'live' | 'reconnecting' | 'closed';

export interface UsePipelineJobOptions {
  /** Pause between reconnect attempts grows from this (ms), doubling up to `maxRetryMs`. */
  retryBaseMs?: number;
  maxRetryMs?: number;
  /** Off for jobs the pipeline has nothing to say about. */
  enabled?: boolean;
}

/**
 * Follows one job's pipeline run: loads the snapshot at once, then streams events live (steps,
 * status, plan) and applies them in order. If the stream breaks it reconnects with backoff and
 * re-reads the snapshot each time, so a proxy that buffers or drops it degrades to polling
 * instead of a frozen screen. Stops by itself once the job reaches a final status.
 */
export function usePipelineJob(
  jobId: string,
  { retryBaseMs = 1000, maxRetryMs = 10_000, enabled = true }: UsePipelineJobOptions = {},
) {
  const [state, dispatch] = useReducer(pipelineReducer, initialPipelineState);
  const [connection, setConnection] = useState<StreamConnection>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const lastSeq = useRef(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const { signal } = controller;
    let attempt = 0;

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
          const snapshot = await pipelineApi.getState(jobId, { signal });
          if (signal.aborted) return;
          dispatch({ type: 'snapshot', snapshot });
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
              if (isTerminalStatus(event.studentStatus)) controller.abort();
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
      if (signal.aborted) setConnection('closed');
    });
    return () => controller.abort();
  }, [jobId, enabled, retryBaseMs, maxRetryMs, refreshToken]);

  /** Re-reads the snapshot and reopens the stream (after an action, or on "try again"). */
  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);
  const showPlan = useCallback((plan: Plan) => dispatch({ type: 'plan', plan }), []);
  const setOptimisticStatus = useCallback(
    (studentStatus: StudentStatus) => dispatch({ type: 'optimistic', studentStatus }),
    [],
  );

  return { ...state, connection, error, refresh, showPlan, setOptimisticStatus };
}
