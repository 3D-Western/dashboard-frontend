import type {
  FollowupQuestion,
  PipelineSnapshot,
  PipelineStreamEvent,
  Pickup,
  Plan,
  Rating,
  StepProgress,
  StudentStatus,
} from '@/types/pipeline';

/** Everything the job screens show, built from a snapshot and then the live stream. */
export interface PipelineState {
  /** A snapshot (or the first event) has arrived. */
  loaded: boolean;
  studentStatus: StudentStatus | null;
  plan: Plan | null;
  pickup: Pickup | null;
  steps: StepProgress[];
  message: string | null;
  /** Follow-up questions the pipeline has sent (P-109), in the order to ask them. */
  followups: FollowupQuestion[];
  /** Question ids answered or skipped here, so a repeated event never asks them again. */
  handledFollowups: number[];
  /** The backend says this collected print still needs its rating; null = not known yet. */
  ratingPending: boolean | null;
  /** The rating the student gave on this screen. */
  rating: Rating | null;
  /** The backend says a live view of this print is on (P-100); only the snapshot knows, events do not carry it. */
  liveView: boolean;
  /** Highest event `seq` applied; older or repeated events are ignored (delivery is at least once). */
  lastSeq: number;
}

export const initialPipelineState: PipelineState = {
  loaded: false,
  studentStatus: null,
  plan: null,
  pickup: null,
  steps: [],
  message: null,
  followups: [],
  handledFollowups: [],
  ratingPending: null,
  rating: null,
  liveView: false,
  lastSeq: 0,
};

export type PipelineAction =
  | { type: 'snapshot'; snapshot: PipelineSnapshot }
  /**
   * The read made a moment after an accepted yes, choice or answer. It must not undo what the
   * student already sees: only what is strictly newer than the screen, or a message that says the
   * pipeline refused the action, is applied.
   */
  | { type: 'reread'; snapshot: PipelineSnapshot }
  | { type: 'event'; event: PipelineStreamEvent }
  /** Show a status before the server confirms it (the student's yes); the next snapshot corrects it. */
  | { type: 'optimistic'; studentStatus: StudentStatus }
  /** A 409 carried the new plan: show it for a second yes (or choice, per its answer). */
  | { type: 'plan'; plan: Plan }
  /** The student tapped thumbs up or down (shown at once; the server may still refuse it). */
  | { type: 'rated'; rating: Rating }
  /** The server could not save that rating: the card asks again. */
  | { type: 'rating-failed' }
  /** A follow-up question was answered or skipped. */
  | { type: 'followup-handled'; questionId: number };

const upsertStep = (steps: StepProgress[], step: StepProgress): StepProgress[] => {
  const index = steps.findIndex((existing) => existing.step === step.step);
  if (index === -1) return [...steps, step];
  const next = steps.slice();
  next[index] = step;
  return next;
};

/**
 * The student status a plan implies, for a plan that arrives outside the stream (a 409 carries the
 * new one). A plan that needs a choice asks for it; a held plan reads as preparing to students (P-43).
 */
export function statusForPlan(plan: Plan): StudentStatus {
  switch (plan.answer) {
    case 'needs_choice':
      return 'needs_choice';
    case 'cannot_print':
      return 'cannot_print';
    case 'held':
      return 'preparing';
    default:
      return 'needs_confirmation';
  }
}

export function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'snapshot': {
      const { snapshot } = action;
      return {
        ...state,
        loaded: true,
        studentStatus: snapshot.studentStatus,
        plan: snapshot.plan ?? null,
        pickup: snapshot.pickup ?? null,
        // A snapshot lists the steps so far; keep the ones we already streamed if it omits them.
        steps: snapshot.steps ?? state.steps,
        message: snapshot.message ?? null,
        followups: snapshot.followups ?? state.followups,
        // A rating given here outlasts a snapshot that doesn't know about it yet.
        ratingPending: state.rating ? false : (snapshot.ratingPending ?? state.ratingPending),
        liveView: snapshot.liveView === true,
        // The snapshot's own number, as is (the student's gap-free numbering, 0 when none): events up
        // to it are already included, later ones apply. Never a number remembered from before.
        lastSeq: snapshot.lastSeq ?? state.lastSeq,
      };
    }
    case 'reread': {
      const { snapshot } = action;
      const newer = (snapshot.lastSeq ?? 0) > state.lastSeq;
      const refusal = snapshot.message != null && snapshot.message !== state.message;
      return newer || refusal ? pipelineReducer(state, { type: 'snapshot', snapshot }) : state;
    }
    case 'event': {
      const { event } = action;
      if (event.seq <= state.lastSeq) return state;
      return {
        ...state,
        loaded: true,
        lastSeq: event.seq,
        studentStatus: event.studentStatus,
        plan: event.plan ?? state.plan,
        pickup: event.pickup ?? state.pickup,
        steps: event.step ? upsertStep(state.steps, event.step) : state.steps,
        message: event.message ?? state.message,
        followups: event.followups ?? state.followups,
      };
    }
    case 'optimistic':
      return { ...state, studentStatus: action.studentStatus };
    case 'plan':
      return { ...state, plan: action.plan, studentStatus: statusForPlan(action.plan) };
    case 'rated':
      return { ...state, ratingPending: false, rating: action.rating };
    case 'rating-failed':
      return { ...state, ratingPending: true, rating: null };
    case 'followup-handled':
      return state.handledFollowups.includes(action.questionId)
        ? state
        : { ...state, handledFollowups: [...state.handledFollowups, action.questionId] };
  }
}

/** "3 h 20 min", "45 min", "under a minute". */
export function formatPrintTime(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) return 'under a minute';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "42 g" (whole grams from 10 g up, one decimal below). */
export function formatGrams(grams: number): string {
  return grams >= 10 ? `${Math.round(grams)} g` : `${Math.round(grams * 10) / 10} g`;
}
