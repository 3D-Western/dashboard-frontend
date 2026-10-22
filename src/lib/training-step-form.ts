import type { AdminStep, StepBody, StepType } from '@/types/training-admin';

export interface CheckpointDraft {
  uid: number;
  /** Seconds into the video, as typed. */
  at: string;
  questionVersionId: number | null;
}

export interface StepFormValues {
  title: string;
  addonScope: boolean;
  /** Reading text or attestation statement. */
  body: string;
  assetKey: string | null;
  /** Video length in seconds, as typed. */
  duration: string;
  minWatch: string;
  /** Comma-separated outcome names. */
  outcomes: string;
  checkpoints: CheckpointDraft[];
  gate: number | null;
}

export interface StepFormErrors {
  title?: string;
  body?: string;
  duration?: string;
  minWatch?: string;
  outcomes?: string;
  /** About the checkpoints as a whole. */
  checkpoints?: string;
  /** Per checkpoint row, by its uid. */
  rows: Record<number, { at?: string; question?: string }>;
}

/** A typo guard (a whole day), not a policy: videos over 10 minutes only draw a warning. */
export const LONGEST_VIDEO_SECONDS = 86_400;
export const MAX_CHECKPOINTS = 20;
export const OUTCOME_NAME = /^[A-Za-z][A-Za-z0-9_.:-]*$/;

let nextUid = 1;
export const newCheckpointUid = () => nextUid++;

export function formFromStep(step: AdminStep | null): StepFormValues {
  return {
    title: step?.title ?? '',
    addonScope: step?.addonScope ?? false,
    body: step?.bodyMarkdown ?? '',
    assetKey: step?.videoAssetKey ?? null,
    duration: step?.videoDurationSeconds != null ? String(step.videoDurationSeconds) : '',
    minWatch: String(step?.minWatchPercent ?? 90),
    outcomes: (step?.settings?.outcomes ?? (step ? [] : ['watched'])).join(', '),
    checkpoints: (step?.settings?.checkpoints ?? []).map((checkpoint) => ({
      uid: newCheckpointUid(),
      at: String(checkpoint.atSeconds),
      questionVersionId: checkpoint.questionVersionId,
    })),
    gate: step?.gateQuestionVersionId ?? null,
  };
}

export function parseOutcomes(text: string): string[] {
  return text
    .split(/[,\s]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

/** The rules of a step, as the server applies them (StepRules / SettingsRules in AuthoringRules.kt). */
export function validateStep(type: StepType, values: StepFormValues): StepFormErrors | null {
  const errors: StepFormErrors = { rows: {} };
  let bad = false;
  const fail = () => {
    bad = true;
  };

  if (values.title.trim() === '') {
    errors.title = 'The step needs a title.';
    fail();
  }

  if (type === 'VIDEO') {
    const durationText = values.duration.trim();
    let duration: number | null = null;
    if (durationText !== '') {
      if (!/^\d+$/.test(durationText) || Number(durationText) < 1) {
        errors.duration = 'Enter the length in whole seconds.';
        fail();
      } else if (Number(durationText) > LONGEST_VIDEO_SECONDS) {
        errors.duration = 'That is longer than a day. Enter the length in seconds.';
        fail();
      } else {
        duration = Number(durationText);
      }
    }

    if (
      !/^\d+$/.test(values.minWatch.trim()) ||
      Number(values.minWatch) < 1 ||
      Number(values.minWatch) > 100
    ) {
      errors.minWatch = 'Enter a percentage from 1 to 100.';
      fail();
    }

    const names = parseOutcomes(values.outcomes);
    if (names.some((name) => !OUTCOME_NAME.test(name))) {
      errors.outcomes =
        'Outcome names start with a letter and use only letters, digits and _ . : -';
      fail();
    } else if (new Set(names).size !== names.length) {
      errors.outcomes = 'Each outcome name can only be listed once.';
      fail();
    }

    if (values.checkpoints.length > MAX_CHECKPOINTS) {
      errors.checkpoints = `At most ${MAX_CHECKPOINTS} questions per video.`;
      fail();
    }
    if (values.checkpoints.length > 0 && duration === null && !errors.duration) {
      errors.checkpoints = 'Enter the video length before adding questions to it.';
      fail();
    }
    const seenAt = new Set<number>();
    const seenQuestions = new Set<number>();
    for (const row of values.checkpoints) {
      const rowErrors: { at?: string; question?: string } = {};
      const at = row.at.trim();
      if (!/^\d+$/.test(at)) {
        rowErrors.at = 'Enter the second the question appears, for example 95.';
      } else if (duration !== null && Number(at) > duration) {
        rowErrors.at = `Must be inside the video (0 to ${duration}).`;
      } else if (seenAt.has(Number(at))) {
        rowErrors.at = 'Two questions cannot appear at the same second.';
      } else {
        seenAt.add(Number(at));
      }
      if (row.questionVersionId === null) {
        rowErrors.question = 'Choose the question to ask.';
      } else if (seenQuestions.has(row.questionVersionId)) {
        rowErrors.question = 'A question can only be asked once per video.';
      } else {
        seenQuestions.add(row.questionVersionId);
      }
      if (rowErrors.at || rowErrors.question) {
        errors.rows[row.uid] = rowErrors;
        fail();
      }
    }
  }

  return bad ? errors : null;
}

/** The body to send when saving. Settings the form does not know about are passed through. */
export function toStepBody(
  type: StepType,
  values: StepFormValues,
  existing: AdminStep | null,
): StepBody {
  const body: StepBody = {
    type,
    title: values.title.trim(),
    addonScope: values.addonScope,
  };

  if (type === 'VIDEO') {
    body.videoAssetKey = values.assetKey;
    body.videoDurationSeconds = values.duration.trim() === '' ? null : Number(values.duration);
    body.minWatchPercent = Number(values.minWatch);
    body.settings = {
      ...(existing?.settings ?? {}),
      outcomes: parseOutcomes(values.outcomes),
      checkpoints: [...values.checkpoints]
        .map((row) => ({ atSeconds: Number(row.at), questionVersionId: row.questionVersionId! }))
        .sort((a, b) => a.atSeconds - b.atSeconds),
    };
  } else if (type === 'READING') {
    body.bodyMarkdown = values.body;
    body.gateQuestionVersionId = values.gate;
    if (existing?.settings) body.settings = existing.settings;
  } else if (type === 'ATTESTATION') {
    body.bodyMarkdown = values.body;
    if (existing?.settings) body.settings = existing.settings;
  } else if (existing?.settings) {
    body.settings = existing.settings;
  }
  return body;
}

/** A line about what is in a step, for the step list. */
export function describeStep(step: AdminStep): string {
  switch (step.type) {
    case 'VIDEO': {
      const parts = [
        step.videoAssetKey ? 'Video uploaded' : 'No video uploaded yet',
        step.videoDurationSeconds ? `${step.videoDurationSeconds} s` : null,
      ];
      const questions = step.settings?.checkpoints?.length ?? 0;
      if (questions > 0)
        parts.push(`${questions} ${questions === 1 ? 'question' : 'questions'} during it`);
      return parts.filter(Boolean).join(' · ');
    }
    case 'READING': {
      const words = (step.bodyMarkdown ?? '').trim().split(/\s+/).filter(Boolean).length;
      return `${words} ${words === 1 ? 'word' : 'words'}${step.gateQuestionVersionId ? ' · question after reading' : ''}`;
    }
    case 'QUIZ': {
      const topics = step.blueprint.length;
      return topics === 0
        ? 'No topics chosen yet'
        : `${topics} ${topics === 1 ? 'topic' : 'topics'} · ${step.blueprint.reduce((n, r) => n + r.drawCount, 0)} questions`;
    }
    case 'ATTESTATION':
      return step.bodyMarkdown?.trim() ? 'Statement written' : 'No statement yet';
  }
}
