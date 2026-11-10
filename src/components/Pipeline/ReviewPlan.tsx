'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Scale, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { PlanChangedError, pipelineApi } from '@/api/client/pipeline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { trackScreen } from '@/lib/analytics';
import { formatGrams, formatPrintTime } from '@/lib/pipeline-state';
import { settingReasons, settingsDiffer, settingsFromPlan } from '@/lib/pipeline-settings';
import type { Answer, Plan, StudentSettings, StudentStatus } from '@/types/pipeline';
import { ChoiceList } from './ChoiceList';
import { AnalysisDetails, ConsequentialCards, splitLessonCards } from './LessonCards';
import { PartFocusProvider } from './PartFocus';
import { PartViewerSlot } from './PartViewerSlot';
import { SpecifySettings } from './SpecifySettings';

const ANSWER_HEADLINE: Record<Answer, { text: string; icon: typeof CheckCircle2; tone: string }> = {
  works: {
    text: 'Good news: this should print just as it is.',
    icon: CheckCircle2,
    tone: 'text-status-green-foreground',
  },
  works_with_adjustments: {
    text: 'This will print, with a few automatic adjustments.',
    icon: Wrench,
    tone: 'text-status-blue-foreground',
  },
  needs_choice: {
    text: 'This can print, but we need you to choose something first.',
    icon: AlertTriangle,
    tone: 'text-status-yellow-foreground',
  },
  held: {
    text: 'We are still checking your part.',
    icon: Clock,
    tone: 'text-muted-foreground',
  },
  cannot_print: {
    text: "This part can't be printed as it is.",
    icon: AlertTriangle,
    tone: 'text-status-red-foreground',
  },
};

export function previewUrlOf(plan: Plan | null | undefined) {
  return plan?.artifacts?.find((artifact) => artifact.kind === 'preview_png')?.url;
}

export function modelUrlOf(plan: Plan | null | undefined) {
  return plan?.artifacts?.find((artifact) => artifact.kind === 'model_glb')?.url;
}

export function highlightsUrlOf(plan: Plan | null | undefined) {
  return plan?.artifacts?.find((artifact) => artifact.kind === 'highlights_json')?.url;
}

/** Print time and plastic, the two numbers students ask about first. */
export function PlanFacts({ plan }: { plan: Plan }) {
  if (plan.printTimeS == null && plan.filamentG == null) return null;
  return (
    <dl className="grid grid-cols-2 gap-3">
      {plan.printTimeS != null && (
        <div className="rounded-lg border bg-card p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            Print time
          </dt>
          <dd className="mt-1 text-lg font-semibold">{formatPrintTime(plan.printTimeS)}</dd>
        </div>
      )}
      {plan.filamentG != null && (
        <div className="rounded-lg border bg-card p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="size-3.5" aria-hidden="true" />
            Plastic
          </dt>
          <dd className="mt-1 text-lg font-semibold">{formatGrams(plan.filamentG)}</dd>
        </div>
      )}
    </dl>
  );
}

/**
 * The student's picks, kept per job outside the component. A pick makes the pipeline write a new
 * plan, and the screen may remount for it (PipelineJobPanel keys the review by plan id); the picks
 * made on the other cards must still be there. Only choices that still exist in the plan on screen
 * are used, matched by choice id.
 */
const pickMemory = new Map<string, Record<string, string>>();

function picksFor(jobId: string, choices: Plan['choices']): Record<string, string> {
  const remembered = pickMemory.get(jobId) ?? {};
  const kept: Record<string, string> = {};
  for (const choice of choices ?? []) {
    const optionId = remembered[choice.choiceId];
    if (optionId && choice.options.some((option) => option.optionId === optionId)) {
      kept[choice.choiceId] = optionId;
    }
  }
  return kept;
}

interface ReviewPlanProps {
  jobId: string;
  plan: Plan;
  studentStatus: StudentStatus;
  /** The student said yes: show the next status at once; the stream confirms it. */
  onConfirmed: () => void;
  /** The plan changed under the student (409): show the new one for a second yes. */
  onPlanChanged: (plan: Plan | null) => void;
  /** The student's own change (a choice, new settings) will make a new plan: that's not a surprise. */
  onStudentChange: () => void;
  /** Set when the plan on screen replaced one the student had already seen. */
  planWasUpdated?: boolean;
  /** The student has answers still being saved: the yes waits so it quotes the plan they will get. */
  inputsPending?: boolean;
  /** A message from the pipeline for the student (e.g. why a yes or an answer was not taken). */
  notice?: string | null;
}

/**
 * Review with an explicit yes (SCOPE §2.5): the answer, what matters, the choices, the preview,
 * time and plastic, and optional settings. Nothing goes to the farm until "Yes, print this", which
 * quotes this plan's id so a plan that moved on is refused and shown again.
 */
export function ReviewPlan({
  jobId,
  plan,
  studentStatus,
  onConfirmed,
  onPlanChanged,
  onStudentChange,
  planWasUpdated = false,
  inputsPending = false,
  notice = null,
}: ReviewPlanProps) {
  // The review is a screen of its own in the steps-to-submit metric (P-137)
  useEffect(() => {
    trackScreen('review');
  }, []);

  const [pickedRaw, setPickedRaw] = useState<Record<string, string>>(() =>
    picksFor(jobId, plan.choices),
  );
  // Several picks can be saving at once (one per card); the last one started shows the spinner.
  const [savingChoices, setSavingChoices] = useState<string[]>([]);
  const savingChoice = savingChoices[savingChoices.length - 1] ?? null;
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  // The student's edits belong to the plan they were made on; a new plan starts from its own.
  const [edit, setEdit] = useState<{ planId: string; settings: StudentSettings } | null>(null);

  const planSettings = settingsFromPlan(plan);
  const settings = edit?.planId === plan.planId ? edit.settings : planSettings;
  const settingsDirty = settingsDiffer(settings, planSettings);

  const headline = ANSWER_HEADLINE[plan.answer] ?? ANSWER_HEADLINE.works;
  const Headline = headline.icon;
  const { consequential, rest } = splitLessonCards(plan.lessonCards);
  const choices = useMemo(() => plan.choices ?? [], [plan.choices]);
  const needsChoice = studentStatus === 'needs_choice';
  // Picks for choices that are no longer in this plan are not shown and do not count.
  const picked = useMemo(() => {
    const kept: Record<string, string> = {};
    for (const choice of choices) {
      const optionId = pickedRaw[choice.choiceId];
      if (optionId) kept[choice.choiceId] = optionId;
    }
    return kept;
  }, [choices, pickedRaw]);
  // Picking is the answer: once every choice on screen has one, the yes is open (the pipeline may
  // still be writing the plan that says so).
  const allPicked = choices.length > 0 && choices.every((choice) => picked[choice.choiceId]);
  const choicesSaving = savingChoices.length > 0;

  function setPicks(update: (previous: Record<string, string>) => Record<string, string>) {
    setPickedRaw((previous) => {
      const next = update(previous);
      pickMemory.set(jobId, next);
      return next;
    });
  }

  async function handleChoose(choiceId: string, optionId: string) {
    setPicks((previous) => ({ ...previous, [choiceId]: optionId }));
    setSavingChoices((previous) => [...previous, choiceId]);
    try {
      await pipelineApi.choose(jobId, { planId: plan.planId, choiceId, optionId });
      onStudentChange();
    } catch (error) {
      if (error instanceof PlanChangedError) {
        // Only the pick that was refused is dropped; the others were taken.
        setPicks((previous) => {
          const { [choiceId]: _dropped, ...kept } = previous;
          return kept;
        });
        onPlanChanged(error.plan);
      } else {
        setPicks((previous) => {
          const { [choiceId]: _dropped, ...kept } = previous;
          return kept;
        });
        toast.error("Couldn't save your choice. Please try again.");
      }
    } finally {
      setSavingChoices((previous) => {
        const at = previous.indexOf(choiceId);
        return at < 0 ? previous : previous.filter((_, index) => index !== at);
      });
    }
  }

  async function handleApplySettings() {
    setApplying(true);
    try {
      await pipelineApi.saveInputs(jobId, { settings });
      onStudentChange();
      toast.success('Checking your part again with your settings.');
    } catch {
      toast.error("Couldn't save your settings. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      await pipelineApi.confirm(jobId, plan.planId);
      pickMemory.delete(jobId);
      onConfirmed();
    } catch (error) {
      if (error instanceof PlanChangedError) {
        onPlanChanged(error.plan);
      } else {
        toast.error("Couldn't send your yes. Please try again.");
      }
    } finally {
      setConfirming(false);
    }
  }

  const choicePending = needsChoice && !allPicked;
  const blockedReason = choicePending
    ? 'Choose an option above first.'
    : choicesSaving
      ? 'Saving your choice first.'
      : settingsDirty
        ? 'Update your plan with your new settings first.'
        : inputsPending
          ? 'Saving your changes first, then your plan updates.'
          : null;

  return (
    <PartFocusProvider>
      <div className="space-y-5">
        {notice && (
          <Alert variant="warning" role="status">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>A note about your last step</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        {planWasUpdated && (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Your plan changed while you were reading it</AlertTitle>
            <AlertDescription>
              Take another look at what is below. Nothing has been sent to the printers yet; it
              needs a new yes from you.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <h2 className={`flex items-start gap-2 text-xl ${headline.tone}`}>
            <Headline className="mt-1 size-5 shrink-0" aria-hidden="true" />
            {headline.text}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{plan.summary}</p>
        </div>

        <PartViewerSlot
          previewUrl={previewUrlOf(plan)}
          modelUrl={modelUrlOf(plan)}
          highlightsUrl={highlightsUrlOf(plan)}
          highlights={plan.lessonCards}
        />

        <PlanFacts plan={plan} />

        <ConsequentialCards cards={consequential} />

        <ChoiceList
          choices={choices}
          selected={picked}
          saving={savingChoice}
          disabled={confirming}
          onSelect={handleChoose}
        />

        <AnalysisDetails cards={rest} />

        <SpecifySettings
          settings={settings}
          reasons={settingReasons(plan)}
          dirty={settingsDirty}
          applying={applying}
          onChange={(next) => setEdit({ planId: plan.planId, settings: next })}
          onApply={handleApplySettings}
        />

        {/* Phones: the yes stays in reach at the bottom while the plan scrolls. */}
        <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background px-6 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          {blockedReason && <p className="mb-2 text-sm text-muted-foreground">{blockedReason}</p>}
          <Button
            type="button"
            size="lg"
            disabled={
              confirming ||
              choicesSaving ||
              !(studentStatus === 'needs_confirmation' || (needsChoice && allPicked)) ||
              settingsDirty ||
              inputsPending
            }
            aria-busy={confirming}
            data-track="confirm_print"
            onClick={handleConfirm}
            className="w-full md:w-auto md:min-w-48"
          >
            {confirming && <Loader2 className="animate-spin" aria-hidden="true" />}
            {planWasUpdated ? 'Yes, print this updated plan' : 'Yes, print this'}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing goes to the printers until you say yes.
          </p>
        </div>
      </div>
    </PartFocusProvider>
  );
}
