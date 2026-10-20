import type { AdminQuestion, AdminQuestionType, QuestionBody } from '@/types/training-admin';

export interface OptionDraft {
  /** A local key for React; not sent to the server. */
  uid: number;
  /** The option's real id when editing, so an unused question keeps its option identities. */
  id?: number;
  label: string;
  correct: boolean;
}

export interface QuestionFormValues {
  topicId: string;
  type: AdminQuestionType;
  prompt: string;
  explanation: string;
  critical: boolean;
  /** A step position as text, or '' for none. */
  remediation: string;
  options: OptionDraft[];
}

export type QuestionFormErrors = Partial<
  Record<'topic' | 'prompt' | 'options' | 'remediation' | 'type', string>
>;

export const MAX_OPTIONS = 10;
export const TRUE_FALSE_LABELS = ['True', 'False'] as const;

let nextUid = 1;
export const newUid = () => nextUid++;

export function blankOptions(count = 2): OptionDraft[] {
  return Array.from({ length: count }, () => ({ uid: newUid(), label: '', correct: false }));
}

export function trueFalseOptions(correctIndex: number | null, previous?: OptionDraft[]) {
  return TRUE_FALSE_LABELS.map((label, index) => ({
    uid: newUid(),
    id: previous?.[index]?.label === label ? previous[index].id : undefined,
    label,
    correct: correctIndex === index,
  }));
}

export function formFromQuestion(question: AdminQuestion): QuestionFormValues {
  const latest = question.latest;
  return {
    topicId: String(question.topicId),
    type: latest.type === 'HOTSPOT' ? 'SINGLE' : latest.type,
    prompt: latest.promptMarkdown,
    explanation: latest.explanationMarkdown ?? '',
    critical: latest.critical,
    remediation:
      latest.remediationStepPosition === null ? '' : String(latest.remediationStepPosition),
    options: [...latest.options]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({
        uid: newUid(),
        id: option.id,
        label: option.labelMarkdown,
        correct: option.correct,
      })),
  };
}

export function emptyForm(topicId: string): QuestionFormValues {
  return {
    topicId,
    type: 'SINGLE',
    prompt: '',
    explanation: '',
    critical: false,
    remediation: '',
    options: blankOptions(3),
  };
}

function isTrueFalse(options: OptionDraft[]) {
  return (
    options.length === 2 && options.every((option, i) => option.label === TRUE_FALSE_LABELS[i])
  );
}

/** Options that suit [type] after the author switches it, keeping what can be kept. */
export function optionsForType(type: AdminQuestionType, options: OptionDraft[]): OptionDraft[] {
  if (type === 'TRUE_FALSE') {
    if (isTrueFalse(options)) return options;
    const correct = options.findIndex((option) => option.correct);
    return trueFalseOptions(correct === 0 || correct === 1 ? correct : null, options);
  }
  const base = isTrueFalse(options) ? blankOptions(3) : options;
  if (type === 'SINGLE') {
    // Only one option may stay correct.
    let seen = false;
    return base.map((option) => {
      if (!option.correct) return option;
      if (!seen) {
        seen = true;
        return option;
      }
      return { ...option, correct: false };
    });
  }
  return base;
}

/** The same rules the server applies (QuestionRules in AuthoringRules.kt). */
export function validateQuestion(values: QuestionFormValues): QuestionFormErrors {
  const errors: QuestionFormErrors = {};
  if (values.topicId === '') errors.topic = 'Choose a topic.';
  if (values.prompt.trim() === '') errors.prompt = 'The question needs a prompt.';
  if (values.remediation !== '' && !/^[1-9]\d*$/.test(values.remediation)) {
    errors.remediation = 'Choose a step, or leave it empty.';
  }
  const labels = values.options.map((option) => option.label.trim());
  const correct = values.options.filter((option) => option.correct).length;
  if (labels.some((label) => label === '')) {
    errors.options = 'Every option needs text.';
  } else if (values.type === 'TRUE_FALSE') {
    if (correct !== 1) errors.options = 'Choose whether the statement is true or false.';
  } else if (values.options.length < 2 || values.options.length > MAX_OPTIONS) {
    errors.options = `A question needs 2 to ${MAX_OPTIONS} options.`;
  } else if (values.type === 'SINGLE' && correct !== 1) {
    errors.options = 'A single-answer question needs exactly one correct option.';
  } else if (values.type === 'MULTI' && correct < 1) {
    errors.options = 'A multiple-answer question needs at least one correct option.';
  }
  return errors;
}

export function toQuestionBody(values: QuestionFormValues, topicId: number): QuestionBody {
  return {
    topicId,
    type: values.type,
    promptMarkdown: values.prompt.trim(),
    explanationMarkdown: values.explanation.trim() === '' ? null : values.explanation.trim(),
    critical: values.critical,
    remediationStepPosition: values.remediation === '' ? null : Number(values.remediation),
    options: values.options.map((option) => ({
      ...(option.id !== undefined ? { id: option.id } : {}),
      labelMarkdown: option.label.trim(),
      correct: option.correct,
    })),
  };
}

export const QUESTION_TYPE_LABELS: Record<AdminQuestionType, string> = {
  SINGLE: 'Single answer (pick one)',
  MULTI: 'Multiple answers (pick all that apply)',
  TRUE_FALSE: 'True or false',
};
