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

/** GET /api/v1/jobs/{id}/pipeline */
export interface PipelineSnapshot {
  studentStatus: StudentStatus;
  plan?: Plan | null;
  pickup?: Pickup | null;
  steps?: StepProgress[];
  message?: string | null;
}

export type PipelineEventType = 'status' | 'step' | 'plan' | 'farm' | 'pickup' | 'notice';

/** One server-sent event from GET /api/v1/jobs/{id}/pipeline/stream. */
export interface PipelineStreamEvent {
  seq: number;
  type: PipelineEventType;
  studentStatus: StudentStatus;
  step?: StepProgress | null;
  plan?: Plan | null;
  pickup?: Pickup | null;
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
