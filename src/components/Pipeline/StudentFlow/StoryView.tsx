'use client';

import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlanChangedError, pipelineApi } from '@/api/client/pipeline';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trackScreen } from '@/lib/analytics';
import { highlightsUrlOf, modelUrlOf, previewUrlOf } from '@/lib/plan-artifacts';
import { formatGrams, formatPrintTime } from '@/lib/pipeline-state';
import { settingReasons, settingsDiffer, settingsFromPlan } from '@/lib/pipeline-settings';
import {
  artifactKey,
  isWebGLAvailable,
  shouldAskBeforeLoading,
  type PartHighlight,
} from '@/lib/part-viewer';
import { TAG_LABEL, allChosen, buildStory, summaryLine, type StoryCard } from '@/lib/story-cards';
import type { Plan, StudentSettings, StudentStatus } from '@/types/pipeline';
import { DisagreePanel } from '../DisagreePanel';
import { PartFocusProvider, usePartFocus } from '../PartFocus';
import type { ViewerStatus } from '../PartViewer/PartViewerCanvas';
import { SpecifySettings } from '../SpecifySettings';

const PartViewerCanvas = lazy(() => import('../PartViewer/PartViewerCanvas'));

const subscribeNever = () => () => {};

/**
 * The student's picks, kept per job outside the component. A pick makes the pipeline write a new
 * plan, and the screen may remount for it (the panel keys the story by plan id); the picks made on
 * the other cards must still be there. Only choices that still exist in the plan on screen are used.
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

export interface StoryViewProps {
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
 * The story and the inspection summary (P-200): the part in 3D beside (or above) one card at a
 * time, tagged Your choice / Handled for you / Worth knowing, choices made right on the card, then
 * the summary and "Yes, print this". Nothing goes to the farm until that yes, which quotes this
 * plan's id so a plan that moved on is refused and shown again.
 */
export function StoryView(props: StoryViewProps) {
  return (
    <PartFocusProvider>
      <StoryInner {...props} />
    </PartFocusProvider>
  );
}

function StoryInner({
  jobId,
  plan,
  studentStatus,
  onConfirmed,
  onPlanChanged,
  onStudentChange,
  planWasUpdated = false,
  inputsPending = false,
  notice = null,
}: StoryViewProps) {
  useEffect(() => {
    trackScreen('review');
  }, []);

  const focus = usePartFocus();
  const story = useMemo(() => buildStory(plan), [plan]);
  const choices = useMemo(() => plan.choices ?? [], [plan.choices]);
  const summaryAt = story.length;
  // The first card that still needs the student, else the first card.
  const [index, setIndex] = useState(() => {
    const open = story.findIndex((card) => card.choices.length > 0);
    return story.length === 0 ? 0 : Math.max(0, open);
  });
  const atSummary = index >= summaryAt;
  const card = atSummary ? undefined : story[index];

  const [exploring, setExploring] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawn, setDrawn] = useState<PartHighlight[]>([]);
  const [viewerState, setViewerState] = useState<'idle' | 'ready' | 'failed'>('idle');

  const [pickedRaw, setPickedRaw] = useState<Record<string, string>>(() =>
    picksFor(jobId, plan.choices),
  );
  const [savingChoices, setSavingChoices] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [edit, setEdit] = useState<{ planId: string; settings: StudentSettings } | null>(null);

  const planSettings = settingsFromPlan(plan);
  const settings = edit?.planId === plan.planId ? edit.settings : planSettings;
  const settingsDirty = settingsDiffer(settings, planSettings);

  const picked = useMemo(() => {
    const kept: Record<string, string> = {};
    for (const choice of choices) {
      const optionId = pickedRaw[choice.choiceId];
      if (optionId) kept[choice.choiceId] = optionId;
    }
    return kept;
  }, [choices, pickedRaw]);
  const everyChoiceMade = allChosen(story, picked);
  const choicesSaving = savingChoices.length > 0;
  const needsChoice = studentStatus === 'needs_choice';

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
      // Only the pick that was refused is dropped; the others were taken.
      setPicks((previous) => {
        const { [choiceId]: _dropped, ...kept } = previous;
        return kept;
      });
      if (error instanceof PlanChangedError) onPlanChanged(error.plan);
      else toast.error("Couldn't save your choice. Please try again.");
    } finally {
      setSavingChoices((previous) => {
        const at = previous.indexOf(choiceId);
        return at < 0 ? previous : previous.filter((_, i) => i !== at);
      });
    }
  }

  async function handleApplySettings() {
    setApplying(true);
    try {
      await pipelineApi.saveInputs(jobId, { settings });
      onStudentChange();
      setSettingsOpen(false);
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
      if (error instanceof PlanChangedError) onPlanChanged(error.plan);
      else toast.error("Couldn't send your yes. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  // Each step of the story brings its place on the part into view (or the whole part).
  const regionOf = (key: string | undefined) =>
    key && drawn.some((h) => h.code === key) ? key : null;
  const { focus: requestFocus } = focus;
  useEffect(() => {
    if (viewerState !== 'ready') return;
    requestFocus(regionOf(card?.key), 'panel');
    // regionOf reads `drawn`, which is final once the viewer is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.key, atSummary, viewerState, requestFocus]);
  // A marker tapped on the part opens its card.
  useEffect(() => {
    if (focus.source !== 'viewer' || !focus.code) return;
    const at = story.findIndex((c) => c.key === focus.code);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the tapped marker is the source of the step
    if (at >= 0) setIndex(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.nonce]);

  const go = (to: number) => {
    setAskOpen(false);
    setMoreOpen(false);
    setIndex(Math.max(0, Math.min(summaryAt, to)));
  };

  const blockedReason =
    studentStatus === 'preparing'
      ? 'Updating your plan first.'
      : !everyChoiceMade
        ? 'Make your choice on the cards first.'
        : choicesSaving
          ? 'Saving your choice first.'
          : settingsDirty
            ? 'Update your plan with your new settings first.'
            : inputsPending
              ? 'Saving your changes first, then your plan updates.'
              : null;
  const canConfirm =
    !confirming &&
    !choicesSaving &&
    !settingsDirty &&
    !inputsPending &&
    (studentStatus === 'needs_confirmation' || (needsChoice && everyChoiceMade));

  const numberOf = (key: string) => {
    const at = drawn.findIndex((h) => h.code === key);
    return at >= 0 ? at + 1 : null;
  };
  const label = atSummary
    ? 'Whole part'
    : regionOf(card?.key)
      ? `Close-up: ${card?.title}`
      : 'Whole part';

  const facts = [
    plan.printTimeS != null ? formatPrintTime(plan.printTimeS) : null,
    plan.filamentG != null ? formatGrams(plan.filamentG) : null,
  ].filter(Boolean);

  return (
    <div
      className="sf-grid sf-story"
      data-view="story"
      data-testid="story-view"
      data-step={atSummary ? 'summary' : index + 1}
      data-exploring={exploring || undefined}
    >
      <div className="sf-vpcol">
        <StoryViewport
          plan={plan}
          cards={plan.lessonCards}
          exploring={exploring}
          onExplore={setExploring}
          onViewer={(status) => {
            setViewerState(status.state === 'ready' ? 'ready' : 'failed');
            setDrawn(status.state === 'ready' ? status.highlights : []);
          }}
          label={label}
          more={
            moreOpen && card ? (
              <div className="sf-moreov" data-testid="story-more">
                <span className={`sf-lab sf-lab-${card.tag}`}>{TAG_LABEL[card.tag]}</span>
                <h4>{card.title}</h4>
                <p className="sf-p">{card.body}</p>
                <button
                  type="button"
                  className="sf-btn sf-btn-sm"
                  onClick={() => setMoreOpen(false)}
                >
                  Close
                </button>
              </div>
            ) : null
          }
        />
      </div>

      <div className="sf-cards">
        {notice && (
          <p className="sf-notice" role="status">
            {notice}
          </p>
        )}
        {planWasUpdated && (
          <p className="sf-notice" role="status">
            Your plan changed while you were reading it. Nothing has been sent to the printers; it
            needs a new yes from you.
          </p>
        )}
        {story.map((c, k) => (
          <StoryCardView
            key={c.key}
            card={c}
            position={k + 1}
            total={story.length + 1}
            active={k === index && !atSummary}
            number={numberOf(c.key)}
            picked={picked}
            saving={savingChoices[savingChoices.length - 1] ?? null}
            disabled={confirming}
            askOpen={askOpen && k === index}
            jobId={jobId}
            planId={plan.planId}
            onChoose={handleChoose}
            onAsk={() => setAskOpen((v) => !v)}
            onMore={() => setMoreOpen(true)}
            go={go}
            index={k}
            summaryAt={summaryAt}
          />
        ))}
        <article
          className="sf-bc sf-summary"
          data-testid="story-summary"
          hidden={!atSummary}
          aria-label="Inspection summary"
        >
          <div className="sf-top-row">
            <span className="sf-kick">Inspection summary</span>
            <span className="sf-grow" />
            <span className="sf-cnt">
              {story.length + 1} of {story.length + 1}
            </span>
          </div>
          <div className="sf-bcb">
            {facts.length > 0 && <p className="sf-facts">{facts.join(' · ')}</p>}
            {plan.summary && <p className="sf-p sf-sumtext">{plan.summary}</p>}
            {story.length === 0 && <p className="sf-p">Nothing needs your decision.</p>}
            <div className="sf-rows">
              {story.map((c, k) => (
                <button
                  type="button"
                  key={c.key}
                  className="sf-rowt"
                  onClick={() => go(k)}
                  aria-label={`${TAG_LABEL[c.tag]}: ${c.title}`}
                >
                  <span className={`sf-pnb sf-pnb-${c.tag}`}>{numberOf(c.key) ?? k + 1}</span>
                  <span className="sf-rowt-tx">
                    <span className={`sf-stp sf-stp-${c.tag}`}>{TAG_LABEL[c.tag]}</span>
                    <b>{c.title}</b>
                    <span className="sf-d">{summaryLine(c, picked)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="sf-bfoot" data-sumfoot>
            {blockedReason && <p className="sf-fine">{blockedReason}</p>}
            <button
              type="button"
              className="sf-btn"
              data-track="confirm_print"
              disabled={!canConfirm}
              aria-busy={confirming}
              onClick={handleConfirm}
            >
              {confirming && <Loader2 className="animate-spin" aria-hidden="true" />}
              {planWasUpdated ? 'Yes, print this updated plan' : 'Yes, print this'}
            </button>
            <div className="sf-bmeta">
              {story.length > 0 && (
                <button type="button" className="sf-lk" onClick={() => go(0)}>
                  Back to the story
                </button>
              )}
              <button type="button" className="sf-lk" onClick={() => setSettingsOpen(true)}>
                Change print settings
              </button>
            </div>
            <p className="sf-fine sf-fine-note">Nothing goes to the printers until you say yes.</p>
          </div>
        </article>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print settings</DialogTitle>
            <DialogDescription>
              We pick these for you. Change one and we check your part again before the yes.
            </DialogDescription>
          </DialogHeader>
          <SpecifySettings
            settings={settings}
            reasons={settingReasons(plan)}
            dirty={settingsDirty}
            applying={applying}
            onChange={(next) => setEdit({ planId: plan.planId, settings: next })}
            onApply={handleApplySettings}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StoryCardView({
  card,
  position,
  total,
  active,
  number,
  picked,
  saving,
  disabled,
  askOpen,
  jobId,
  planId,
  onChoose,
  onAsk,
  onMore,
  go,
  index,
  summaryAt,
}: {
  card: StoryCard;
  position: number;
  total: number;
  active: boolean;
  number: number | null;
  picked: Record<string, string>;
  saving: string | null;
  disabled: boolean;
  askOpen: boolean;
  jobId: string;
  planId: string;
  onChoose: (choiceId: string, optionId: string) => void;
  onAsk: () => void;
  onMore: () => void;
  go: (to: number) => void;
  index: number;
  summaryAt: number;
}) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!active || !el) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, card.body, askOpen]);

  const unanswered = card.choices.some((choice) => !picked[choice.choiceId]);
  const last = index === summaryAt - 1;
  return (
    <article
      id={`lesson-card-${card.key}`}
      className={`sf-bc sf-t-${card.tag}`}
      hidden={!active}
      data-testid="story-card"
      data-code={card.key}
      data-tag={card.tag}
      data-severity={card.card?.severity}
    >
      <div className="sf-top-row">
        <span className={`sf-lab sf-lab-${card.tag}`}>{TAG_LABEL[card.tag]}</span>
        <span className="sf-sub">{card.hint}</span>
        <span className="sf-grow" />
        <span className="sf-cnt">
          {position} of {total}
        </span>
      </div>
      <div className="sf-bcb">
        {askOpen ? (
          <div className="sf-askp">
            <DisagreePanel jobId={jobId} currentPlanId={planId} embedded />
            <button type="button" className="sf-lk" onClick={onAsk}>
              Back
            </button>
          </div>
        ) : (
          <>
            <h4>
              {number !== null && <span className="sf-pnb sf-pnb-inline">{number}</span>}
              {card.title}
            </h4>
            {card.body && (
              <p ref={bodyRef} className="sf-p sf-clamp">
                {card.body}
              </p>
            )}
            {clamped && (
              <button type="button" className="sf-more sf-lk" onClick={onMore}>
                More
              </button>
            )}
            {card.choices.map((choice) => (
              <div
                key={choice.choiceId}
                role="radiogroup"
                aria-label={choice.question}
                className="sf-choice"
                data-testid="story-choice"
              >
                {choice.question !== card.title && (
                  <p className="sf-q">
                    {choice.question}
                    {saving === choice.choiceId && (
                      <Loader2 className="size-4 animate-spin" aria-label="Saving your choice" />
                    )}
                  </p>
                )}
                {choice.options.map((option) => {
                  const on = picked[choice.choiceId] === option.optionId;
                  return (
                    <button
                      type="button"
                      key={option.optionId}
                      role="radio"
                      aria-checked={on}
                      disabled={disabled}
                      className={on ? 'sf-sel' : undefined}
                      onClick={() => onChoose(choice.choiceId, option.optionId)}
                    >
                      <span>
                        {option.label}
                        {on && <Check className="sf-tick" aria-hidden="true" />}
                      </span>
                      <small>
                        {option.recommended
                          ? `Recommended. ${option.explanation}`
                          : option.explanation}
                      </small>
                    </button>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
      <div className="sf-bfoot">
        <div className="sf-bnav">
          <button
            type="button"
            className="sf-btn sf-btn-ghost sf-btn-sm"
            style={{ visibility: index === 0 ? 'hidden' : undefined }}
            onClick={() => go(index - 1)}
          >
            Back
          </button>
          <div className="sf-dots" role="group" aria-label="Steps">
            {Array.from({ length: total }, (_, k) => (
              <button
                type="button"
                key={k}
                className={`sf-dt${k === index ? 'on' : k < index ? 'past' : ''}`}
                aria-label={`Step ${k + 1} of ${total}`}
                aria-current={k === index ? 'step' : undefined}
                onClick={() => go(k)}
              >
                <i />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sf-btn sf-btn-sm"
            disabled={unanswered}
            onClick={() => go(index + 1)}
          >
            {last ? 'Summary' : 'Next'}
          </button>
        </div>
        <div className="sf-bmeta">
          <button type="button" className="sf-lk" onClick={() => go(summaryAt)}>
            Skip to summary
          </button>
          <button type="button" className="sf-lk" onClick={onAsk} aria-expanded={askOpen}>
            Ask about this
          </button>
        </div>
      </div>
    </article>
  );
}

/** The part on its print plate: calm until Explore, with the pins of the card in view. */
function StoryViewport({
  plan,
  cards,
  exploring,
  onExplore,
  onViewer,
  label,
  more,
}: {
  plan: Plan;
  cards: Plan['lessonCards'];
  exploring: boolean;
  onExplore: (on: boolean) => void;
  onViewer: (status: ViewerStatus) => void;
  label: string;
  more: React.ReactNode;
}) {
  const modelUrl = modelUrlOf(plan);
  const previewUrl = previewUrlOf(plan);
  const highlightsUrl = highlightsUrlOf(plan);
  const supported = useSyncExternalStore(subscribeNever, isWebGLAvailable, () => false);
  const askFirst = useSyncExternalStore(subscribeNever, shouldAskBeforeLoading, () => false);
  const [approved, setApproved] = useState(false);
  const [state, setState] = useState<{ key?: string; ready: boolean; failed: boolean }>({
    ready: false,
    failed: false,
  });
  const key = artifactKey(modelUrl);
  const here = state.key === key ? state : { ready: false, failed: false };
  const mount = Boolean(modelUrl) && supported && !here.failed && (!askFirst || approved);

  return (
    <div
      className="sf-vp"
      data-slot="part-viewer"
      data-viewer={here.ready ? 'ready' : here.failed ? 'failed' : mount ? 'loading' : 'preview'}
      data-testid="story-viewer"
    >
      <div className={here.ready ? 'sf-preview sf-invisible' : 'sf-preview'}>
        {previewUrl ? (
          // A short-lived signed link from another origin, so next/image's optimiser doesn't apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Preview of your part on the print plate" />
        ) : (
          <span className="sf-fine">The 3D view will show up here.</span>
        )}
      </div>
      {mount && modelUrl && (
        <Suspense fallback={null}>
          <PartViewerCanvas
            modelUrl={modelUrl}
            highlightsUrl={highlightsUrl}
            cards={cards}
            audience="student"
            explore={{ on: exploring, onChange: onExplore }}
            onStatus={(status) => {
              setState({ key, ready: status.state === 'ready', failed: status.state !== 'ready' });
              onViewer(status);
            }}
          />
        </Suspense>
      )}
      {mount && !here.ready && !here.failed && (
        <span role="status" className="sf-camlbl">
          Loading the 3D view
        </span>
      )}
      {here.ready && <span className="sf-camlbl">{label}</span>}
      {here.ready && exploring && (
        <span className="sf-xcap">Drag to turn. Pinch or Ctrl + scroll to zoom.</span>
      )}
      {Boolean(modelUrl) && supported && askFirst && !approved && (
        <div className="sf-askload">
          <Button type="button" size="sm" variant="secondary" onClick={() => setApproved(true)}>
            Load the 3D view
          </Button>
        </div>
      )}
      {more}
    </div>
  );
}
