'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquare, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDisagree, type DisagreeTurn } from '@/hooks/useDisagree';
import {
  DISAGREE_MAX_CHARS,
  formatWait,
  isAboutEarlierPlan,
  questionsLeftText,
} from '@/lib/pipeline-disagree';
import { cn } from '@/lib/utils';
import type { DisagreeAnswer, DisagreeCitation } from '@/types/pipeline';

/**
 * "Ask why" (P-54): a compact chat on a plan or a finished job. The assistant explains from the
 * job's record and changes nothing; "Ask the crew" is always one click away. The conversation
 * lives in memory only, nothing is stored in the browser, and only the student-facing wording the
 * assistant returns is shown.
 */
export function DisagreePanel({
  jobId,
  currentPlanId,
}: {
  jobId: string;
  /** The plan on screen, to flag an answer that was about an earlier one. */
  currentPlanId?: string | null;
}) {
  const { turns, ask, retry, escalation, askCrew } = useDisagree(jobId);
  const [text, setText] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view inside the thread, never scrolling the page.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [turns]);

  const sending = turns.some((turn) => turn.state === 'sending');
  const trimmed = text.trim();
  const last = [...turns].reverse().find((turn) => turn.answer)?.answer;
  const left = last?.questionsLeft;

  function send() {
    if (ask(text)) setText('');
  }

  return (
    <section
      aria-labelledby="ask-why-heading"
      className="space-y-3 rounded-lg border bg-card p-4"
      data-testid="disagree-panel"
    >
      <div>
        <h2 id="ask-why-heading" className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4 shrink-0" aria-hidden="true" />
          Ask why
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Disagree with a decision? Ask, and the assistant explains from your print&apos;s record.
          It can&apos;t change anything; the crew can.
        </p>
      </div>

      {turns.length > 0 && (
        <div
          ref={threadRef}
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          className="max-h-80 space-y-3 overflow-y-auto overscroll-contain"
        >
          {turns.map((turn) => (
            <TurnView
              key={turn.requestId}
              turn={turn}
              currentPlanId={currentPlanId}
              onRetry={() => retry(turn.requestId)}
              retryDisabled={sending}
            />
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Textarea
          aria-label="Your question"
          value={text}
          maxLength={DISAGREE_MAX_CHARS}
          rows={2}
          placeholder="e.g. Why did you add supports?"
          className="max-h-32 min-h-16 resize-none"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              'text-xs tabular-nums',
              text.length >= DISAGREE_MAX_CHARS ? 'text-destructive' : 'text-muted-foreground',
            )}
            aria-label={`${text.length} of ${DISAGREE_MAX_CHARS} characters`}
          >
            {text.length}/{DISAGREE_MAX_CHARS}
          </span>
          <Button type="button" onClick={send} disabled={!trimmed || sending} aria-busy={sending}>
            <Send aria-hidden="true" />
            Ask
          </Button>
        </div>
        {left != null && <p className="text-xs text-muted-foreground">{questionsLeftText(left)}</p>}
      </div>

      <CrewHandOver escalation={escalation} onSend={askCrew} />
    </section>
  );
}

function TurnView({
  turn,
  currentPlanId,
  onRetry,
  retryDisabled,
}: {
  turn: DisagreeTurn;
  currentPlanId?: string | null;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm break-words whitespace-pre-wrap">
          <span className="sr-only">You: </span>
          {turn.question}
        </p>
      </div>
      <div className="flex justify-start">
        {turn.state === 'sending' && <TypingBubble />}
        {turn.state === 'failed' && (
          <div className="max-w-[90%] rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            <p className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Couldn&apos;t reach the assistant. Try again, or ask the crew.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onRetry}
              disabled={retryDisabled}
            >
              Try again
            </Button>
          </div>
        )}
        {turn.state === 'answered' && turn.answer && (
          <AnswerBubble answer={turn.answer} currentPlanId={currentPlanId} />
        )}
      </div>
    </div>
  );
}

/** Reserves one line of height so the answer replaces it without moving anything. */
function TypingBubble() {
  return (
    <div
      role="status"
      aria-label="The assistant is typing"
      className="flex h-9 items-center gap-1 rounded-lg bg-muted px-3"
    >
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          aria-hidden="true"
          className="size-1.5 rounded-full bg-muted-foreground/70 motion-safe:animate-pulse"
          style={{ animationDelay: `${dot * 150}ms` }}
        />
      ))}
    </div>
  );
}

function AnswerBubble({
  answer,
  currentPlanId,
}: {
  answer: DisagreeAnswer;
  currentPlanId?: string | null;
}) {
  const earlier = isAboutEarlierPlan(answer.planId, currentPlanId);
  const citations = answer.citations ?? [];
  return (
    <div
      className="max-w-[90%] space-y-2 rounded-lg bg-muted px-3 py-2 text-sm"
      data-status={answer.status}
    >
      <p className="break-words whitespace-pre-wrap">
        <span className="sr-only">Assistant: </span>
        {answer.answer}
      </p>
      {answer.status === 'rate_limited' && answer.retryAfterS != null && (
        <p className="text-xs text-muted-foreground">
          You can ask again in {formatWait(answer.retryAfterS)}.
        </p>
      )}
      {answer.status === 'rate_limited' && answer.questionsLeft != null && (
        <p className="text-xs text-muted-foreground">{questionsLeftText(answer.questionsLeft)}</p>
      )}
      {earlier && (
        <p className="text-xs text-status-yellow-foreground">
          This answer was about an earlier version of your plan. The plan on screen has changed
          since.
        </p>
      )}
      {citations.length > 0 && (
        <ul aria-label="Based on" className="flex flex-wrap gap-1.5">
          {citations.map((citation) => (
            <li key={citation.entryId}>
              <CitationChip citation={citation} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CHIP_CLASS = 'rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground';

/**
 * A chip with the entry's title. A lesson card's chip has its finding `code`: when that card is on
 * this page the chip takes the student to it and selects it, as tapping the card does (which also
 * lights up its region on the part).
 */
function CitationChip({ citation }: { citation: DisagreeCitation }) {
  const card =
    citation.kind === 'lesson_card' && citation.code && typeof document !== 'undefined'
      ? document.getElementById(`lesson-card-${citation.code}`)
      : null;
  if (!card) return <span className={CHIP_CLASS}>{citation.title}</span>;
  return (
    <button
      type="button"
      className={cn(CHIP_CLASS, 'hover:border-purple-light hover:text-foreground')}
      aria-label={`${citation.title} (show this card)`}
      onClick={() => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        card.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        card.click();
      }}
    >
      {citation.title}
    </button>
  );
}

/** The always-visible way out: one click opens an optional reason box, a second one sends. */
function CrewHandOver({
  escalation,
  onSend,
}: {
  escalation: ReturnType<typeof useDisagree>['escalation'];
  onSend: (text?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (escalation === 'sent' || escalation === 'already') {
    return (
      <p role="status" className="flex items-start gap-2 text-sm">
        <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {escalation === 'sent'
          ? 'Thanks. The crew has your question and this conversation.'
          : 'This is already with the crew.'}
      </p>
    );
  }

  const sending = escalation === 'sending';
  return (
    <div className="space-y-2 border-t pt-3">
      {open && (
        <Textarea
          aria-label="Anything to add for the crew? (optional)"
          placeholder="Anything to add for the crew? (optional)"
          value={reason}
          maxLength={DISAGREE_MAX_CHARS}
          rows={2}
          className="max-h-32 min-h-16 resize-none"
          onChange={(event) => setReason(event.target.value)}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={sending}
          aria-busy={sending}
          onClick={() => (open ? onSend(reason) : setOpen(true))}
        >
          {sending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Users aria-hidden="true" />
          )}
          {open ? 'Send to the crew' : 'Ask the crew'}
        </Button>
        {escalation === 'failed' && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t reach the crew. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
