import type {
  AdminQuestion,
  AdminStep,
  AdminTrainingSummary,
  PublishImpact,
  StepType,
  Topic,
} from '@/types/training-admin';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  VIDEO: 'Video',
  READING: 'Reading',
  QUIZ: 'Quiz',
  ATTESTATION: 'Attestation',
};

export const STEP_TYPE_HELP: Record<StepType, string> = {
  VIDEO: 'A short video (10 minutes or less), optionally with questions asked during it.',
  READING: 'A written section in Markdown, optionally ending with one question.',
  QUIZ: 'The graded quiz. Passing it is what certifies a member.',
  ATTESTATION: 'A statement the member agrees to, such as "I understand how to use this safely".',
};

/** The topic that questions asked inside a video or reading are filed under by the importer. */
export const IN_MATERIAL_TOPIC_SLUG = 'in-material';

/** A URL-safe slug: lowercase letters and digits joined by single hyphens. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** The slug rule the server applies to groups, machines, trainings and topics. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_HELP =
  'Lowercase letters and digits joined by single hyphens, e.g. laser-cutter.';

/** A checklist item key: derived from its label, lowercase with - or _ allowed. */
export function checklistKey(label: string, taken: Set<string>): string {
  const base = slugify(label).replace(/-/g, '_').slice(0, 40) || 'item';
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
}

export const CHECKLIST_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export interface ImpactOption {
  value: PublishImpact;
  label: string;
  summary: string;
  /** What happens to people who are already certified. */
  effect: string;
}

export const IMPACT_OPTIONS: ImpactOption[] = [
  {
    value: 'MINOR',
    label: 'Minor fix',
    summary: 'Wording, typos, a better explanation.',
    effect:
      'Nothing changes for anyone already certified. They stay certified and are not asked to do anything.',
  },
  {
    value: 'ADDON',
    label: 'Add-on update',
    summary: 'New content, such as a new hazard or procedure.',
    effect:
      'People already certified stay certified, but get a deadline (the training’s add-on grace period) to finish only the steps marked as part of the add-on. They are reminded as the deadline nears. If they miss it, they are asked to refresh.',
  },
  {
    value: 'FULL_RETAKE',
    label: 'Full retake',
    summary: 'A serious safety problem with the old content. Use rarely.',
    effect:
      'Everyone who is certified, or waiting for sign-off, loses access until they take the whole training again.',
  },
];

export function impactOption(impact: PublishImpact): ImpactOption {
  return IMPACT_OPTIONS.find((option) => option.value === impact) ?? IMPACT_OPTIONS[0];
}

/** What the published result did to people, in one sentence. */
export function describeEffects(
  impact: PublishImpact,
  effects: { addonRequired: number; lapsed: number; addonDueAt: string | null },
  formatDate: (iso: string) => string,
): string {
  if (impact === 'ADDON') {
    const count = effects.addonRequired;
    if (count === 0) return 'No one was certified, so no one needs to finish the add-on.';
    const due = effects.addonDueAt ? ` by ${formatDate(effects.addonDueAt)}` : '';
    return `${count} certified ${count === 1 ? 'member now needs' : 'members now need'} to finish the add-on${due}.`;
  }
  if (impact === 'FULL_RETAKE') {
    const count = effects.lapsed;
    if (count === 0) return 'No one was certified, so no one needs to retake it.';
    return `${count} ${count === 1 ? 'member must' : 'members must'} now retake the whole training.`;
  }
  return 'Nobody who is already certified was affected.';
}

/** "Published v3", "Draft", "Published v3 + draft", "Not published" ... */
export function trainingStatusLabels(training: AdminTrainingSummary): string[] {
  const labels: string[] = [];
  if (training.currentVersionNo !== null) labels.push(`Published v${training.currentVersionNo}`);
  if (training.draftVersionId !== null) labels.push('Draft in progress');
  if (labels.length === 0) labels.push('Nothing published');
  if (training.archived) labels.push('Archived');
  return labels;
}

/**
 * How many questions of a topic the quiz can draw: active ones, minus those the draft already asks
 * inside its material (a video checkpoint or a reading gate). The server decides at save and
 * publish; this mirrors its rule so the editor can show the number before saving.
 */
export function eligibleCount(
  topic: Topic,
  questions: AdminQuestion[],
  steps: AdminStep[],
): number {
  const inMaterial = new Set<number>();
  for (const step of steps) {
    if (step.gateQuestionVersionId !== null) inMaterial.add(step.gateQuestionVersionId);
    for (const checkpoint of step.settings?.checkpoints ?? []) {
      inMaterial.add(checkpoint.questionVersionId);
    }
  }
  return questions.filter(
    (question) =>
      question.topicId === topic.id && question.active && !inMaterial.has(question.latest.id),
  ).length;
}

/** A question's prompt on one line, for lists and pickers. */
export function promptPreview(markdown: string, max = 90): string {
  const flat = markdown
    .replace(/[#*_`>~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** "420 s" as "7:00". */
export function clock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Bytes as "12.3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
