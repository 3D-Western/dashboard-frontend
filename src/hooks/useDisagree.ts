'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isConflictError, pipelineApi } from '@/api/client/pipeline';
import { DISAGREE_MAX_CHARS, newRequestId } from '@/lib/pipeline-disagree';
import type { DisagreeAnswer } from '@/types/pipeline';

/** One exchange in the panel: the student's question at once, the answer when it arrives. */
export interface DisagreeTurn {
  /** The idempotency key; a retry of this turn sends the same one. */
  requestId: string;
  question: string;
  state: 'sending' | 'answered' | 'failed';
  answer?: DisagreeAnswer;
}

export type EscalationState = 'idle' | 'sending' | 'sent' | 'already' | 'failed';

/**
 * The "Ask why" conversation (P-54). Memory only: nothing is written to storage, a reload starts
 * a clean panel (the pipeline keeps the record). One question is in flight at a time and the guard
 * is a ref, so a double click cannot send twice before React re-renders.
 */
export function useDisagree(jobId: string) {
  const [turns, setTurns] = useState<DisagreeTurn[]>([]);
  const [escalation, setEscalation] = useState<EscalationState>('idle');
  const inFlight = useRef(false);
  const escalating = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = useCallback((requestId: string, change: Partial<DisagreeTurn>) => {
    if (!mounted.current) return;
    setTurns((previous) =>
      previous.map((turn) => (turn.requestId === requestId ? { ...turn, ...change } : turn)),
    );
  }, []);

  const run = useCallback(
    async (requestId: string, text: string) => {
      try {
        const answer = await pipelineApi.disagree(jobId, { requestId, text });
        patch(requestId, { state: 'answered', answer });
      } catch {
        // Only a transport or request error lands here; the assistant's own refusals are answers.
        patch(requestId, { state: 'failed' });
      } finally {
        inFlight.current = false;
      }
    },
    [jobId, patch],
  );

  /** Shows the question at once and asks. Returns false when nothing was sent. */
  const ask = useCallback(
    (raw: string): boolean => {
      const text = raw.trim().slice(0, DISAGREE_MAX_CHARS);
      if (!text || inFlight.current) return false;
      inFlight.current = true;
      const requestId = newRequestId();
      setTurns((previous) => [...previous, { requestId, question: text, state: 'sending' }]);
      void run(requestId, text);
      return true;
    },
    [run],
  );

  /** Sends a failed question again under the same request id. */
  const retry = useCallback(
    (requestId: string) => {
      if (inFlight.current) return;
      const turn = turns.find((candidate) => candidate.requestId === requestId);
      if (!turn || turn.state !== 'failed') return;
      inFlight.current = true;
      patch(requestId, { state: 'sending' });
      void run(requestId, turn.question);
    },
    [turns, patch, run],
  );

  /** "Ask the crew": the conversation goes to staff with the student's own words, if any. */
  const askCrew = useCallback(
    async (text?: string) => {
      if (escalating.current) return;
      escalating.current = true;
      setEscalation('sending');
      try {
        await pipelineApi.escalateDisagree(jobId, text);
        if (mounted.current) setEscalation('sent');
      } catch (error) {
        // 409: it is already with the crew, which is what the student wanted.
        if (mounted.current) setEscalation(isConflictError(error) ? 'already' : 'failed');
      } finally {
        escalating.current = false;
      }
    },
    [jobId],
  );

  return { turns, ask, retry, escalation, askCrew, busy: turns.some((t) => t.state === 'sending') };
}
