// What the browser sees of the print pipeline: the dashboard backend's student-safe projection
// ("Browser ↔ backend" in slicing-pipeline/docs/design/dashboard-contract.md). Field names are
// the camelCase forms of the contract models. Staff statuses, staff findings and storage keys
// never reach the browser, so they are not modelled here.

/** What a student sees for a job (the backend derives it; the browser never maps staff statuses). */
export type StudentStatus =
  | 'preparing'
  | 'needs_confirmation'
  | 'needs_choice'
  | 'cannot_print'
  | 'queued'
  | 'printing'
  | 'reprinting'
  | 'ready_for_pickup'
  | 'collected'
  | 'not_collected'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type Purpose = 'venture' | 'class' | 'personal' | 'other';

export type PrintProfile = 'draft' | 'standard' | 'fine' | 'strong';
export type SupportsMode = 'auto' | 'always' | 'never';
export type BrimMode = 'auto' | 'on' | 'off';

/** "Specify settings" (P-96). Every field is optional: unset means the pipeline decides. */
export interface StudentSettings {
  profile?: PrintProfile | null;
  infillPercent?: number | null;
  supports?: SupportsMode | null;
  supportsBuildPlateOnly?: boolean | null;
  brim?: BrimMode | null;
}

/** The student's own words and choices; sent whenever they save (`update_inputs`). */
export interface StudentInputs {
  purpose?: Purpose | null;
  /** Venture name/type, course/project, or project name/type: short free-text answers. */
  purposeDetails?: Record<string, string>;
  /** "Tell us about your part", written by the student. */
  description?: string | null;
  settings?: StudentSettings | null;
}

export type Answer = 'works' | 'works_with_adjustments' | 'needs_choice' | 'held' | 'cannot_print';

export type Severity = 'info' | 'adjusted' | 'choice' | 'hold' | 'cannot_print';

/** Where on the part a card applies, for the 3D viewer to highlight later. */
export interface Region {
  faces?: number[] | null;
  /** xmin, ymin, zmin, xmax, ymax, zmax */
  bboxMm?: [number, number, number, number, number, number] | null;
  /** First and last layer index in the slice. */
  layers?: [number, number] | null;
}

export interface LessonCard {
  code: string;
  title: string;
  body: string;
  severity: Severity;
  region?: Region | null;
  /** Consequential cards (a fix was applied, or a choice is needed) are shown up front (P-29). */
  consequential: boolean;
}

export interface ChoiceOption {
  optionId: string;
  label: string;
  explanation: string;
  recommended?: boolean;
}

export interface Choice {
  choiceId: string;
  question: string;
  options: ChoiceOption[];
  findingCodes?: string[];
}

export type ArtifactKind =
  | 'preview_png'
  | 'model_glb'
  | 'highlights_json'
  | 'project_3mf'
  | 'timelapse'
  | 'plate_png';

/** A pipeline file as the browser gets it: a short-lived download link, no storage keys. */
export interface PlanArtifact {
  kind: ArtifactKind;
  url: string;
}

export interface Plan {
  /** Changes whenever the plan changes; `confirm` must quote the one the student saw. */
  planId: string;
  answer: Answer;
  summary: string;
  printTimeS?: number | null;
  filamentG?: number | null;
  /** Prefills "Specify settings": the pipeline's choices, as the same StudentSettings. */
  settingsChosen?: StudentSettings;
  /** Why each setting was chosen, by the same keys. */
  settingsReasons?: Partial<Record<keyof StudentSettings, string>>;
  lessonCards?: LessonCard[];
  choices?: Choice[];
  artifacts?: PlanArtifact[];
}

export type StepState = 'started' | 'done' | 'skipped';

export interface StepProgress {
  /** Stable id, e.g. "intake.load_mesh". */
  step: string;
  /** "Checking your file". */
  title: string;
  /** One-line teaching moment (P-61). */
  teaching?: string | null;
  state: StepState;
  durationMs?: number | null;
}

/** Where the student collects the part (P-78, P-82), known once it is ready for pickup. */
export interface Pickup {
  /** Shelf slot, e.g. "14". */
  slot: string;
  /** The through-hole tag code, e.g. "K7Q2". */
  tag: string;
  /** End of the 3-day pickup window (ISO date). */
  windowEndsAt: string;
  /** Photo or preview of the part. */
  artifacts?: PlanArtifact[];
}

/** The one-tap rating after collection (P-20). */
export type Rating = 'up' | 'down';

/**
 * Why a print was not good: the pipeline's `QualityReason` values, which are all it accepts
 * (`report_quality` with another value is 422).
 */
export type QualityReason =
  | 'warping'
  | 'stringing'
  | 'rough_layers'
  | 'rough_surface'
  | 'wrong_size'
  | 'weak'
  | 'support_marks'
  | 'detail_lost'
  | 'broke_on_removal'
  | 'other';

export type FollowupAnswer = 'yes' | 'no' | 'unsure';

/** One targeted follow-up question about something a check flagged (P-109). Reviewed wording. */
export interface FollowupQuestion {
  /** Quoted back in the answer. */
  questionId: number;
  /** Shown to the student as is. */
  text: string;
}

/** GET /api/v1/jobs/{id}/pipeline */
export interface PipelineSnapshot {
  studentStatus: StudentStatus;
  plan?: Plan | null;
  pickup?: Pickup | null;
  steps?: StepProgress[];
  message?: string | null;
  /** Unanswered follow-up questions, in the order to ask them. */
  followups?: FollowupQuestion[];
  /**
   * True when the print is collected and the student has not rated it yet: the screen shows the
   * one-tap rating, and a new 3D-print job is refused (`RATING_REQUIRED`) until it is given (P-20).
   */
  ratingPending?: boolean;
}

/** A collected print the student has not rated (an item of `data.unratedPrints` of `RATING_REQUIRED`). */
export interface UnratedPrint {
  jobId: string;
  name?: string | null;
  collectedAt?: string | null;
}

export type PipelineEventType =
  | 'status'
  | 'step'
  | 'plan'
  | 'farm'
  | 'pickup'
  | 'followup'
  | 'notice';

/** One server-sent event from GET /api/v1/jobs/{id}/pipeline/stream. */
export interface PipelineStreamEvent {
  seq: number;
  type: PipelineEventType;
  studentStatus: StudentStatus;
  step?: StepProgress | null;
  plan?: Plan | null;
  pickup?: Pickup | null;
  /** On a `followup` event: the questions to ask (it carries no `message`). */
  followups?: FollowupQuestion[];
  message?: string | null;
}

/** POST .../pipeline/confirm and .../pipeline/choices bodies. */
export interface ConfirmRequest {
  planId: string;
}

export interface ChoiceRequest {
  planId: string;
  choiceId: string;
  optionId: string;
}

/** POST .../pipeline/rating body, and what comes back (`data.rating`). */
export interface RatingRequest {
  rating: Rating;
}

/** POST .../pipeline/quality body (P-102): the reasons ticked, and the student's own words. */
export interface QualityReportRequest {
  reasons: QualityReason[];
  text?: string;
}

/** POST .../pipeline/followups/{questionId} body. */
export interface FollowupAnswerRequest {
  answer: FollowupAnswer;
}
