'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { isConflictError, pipelineApi } from '@/api/client/pipeline';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { OrientationLockNotice } from '@/components/Training/OrientationLockNotice';
import { PipelineJobPanel } from '@/components/Pipeline/PipelineJobPanel';
import { RatingRequiredPrompt } from '@/components/Pipeline/RatingRequiredPrompt';
import { ReportProblem } from '@/components/Pipeline/ReportProblem';
import '@/components/Pipeline/StudentFlow/student-flow.css';
import { IntakeForm } from '@/components/Pipeline/StudentFlow/IntakeForm';
import { LoadingView } from '@/components/Pipeline/StudentFlow/LoadingView';
import { PartBackdrop } from '@/components/Pipeline/StudentFlow/PartBackdrop';
import {
  cleanPurposeDetails,
  detailsComplete,
  loadRecentAnswers,
  optionFor,
  rememberAnswer,
  type RecentAnswer,
} from '@/lib/purpose-memory';
import { trackScreen } from '@/lib/analytics';
import { PRINT_MODEL_ACCEPT, REJECTED_FILE_MESSAGE, validateModelFile } from '@/lib/model-files';
import type { Purpose, StudentInputs, StudentStatus, UnratedPrint } from '@/types/pipeline';
import { useJobUpload } from './useJobUpload';

const MIN_DESCRIPTION = 2;
/** The purpose and its details are saved this long after the last change. */
const SAVE_DELAY_MS = 600;
/**
 * The description is saved when the student stops typing (or leaves the field): after a pause of
 * this long, shorter for a real sentence, longer for a word or two that may not be finished. The
 * answers save in the background because the pipeline starts as soon as the file arrives (P-137);
 * Continue (P-200) is only the visual step.
 */
const DESCRIPTION_IDLE_MS = 2500;
const SHORT_DESCRIPTION_IDLE_MS = 4000;
const SENTENCE_LENGTH = 12;
/**
 * Every save makes the pipeline look at the part again (P-192): while the student keeps typing, saves
 * are at least this far apart. Leaving the field saves at once; the pipeline also waits for the typing to settle.
 */
const MIN_SAVE_GAP_MS = 8000;
/** The pipeline said "too many changes" (429): try again after this long. */
const RATE_LIMITED_RETRY_MS = 30_000;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const REVIEW_STATUSES: readonly StudentStatus[] = ['needs_confirmation', 'needs_choice'];
/** Statuses in which the pipeline still takes the student's answers (before and during the review). */
const EDITABLE_STATUSES: readonly StudentStatus[] = ['preparing', ...REVIEW_STATUSES];

/**
 * The student's print flow on one page that never scrolls (P-200): the file drop moves to the top
 * and shows the part; the intake is a frosted card over the dimmed, blurred part; Continue brings
 * the part forward into the loading view, which turns in place into the story, the summary and the
 * yes. The file starts uploading the moment it is chosen and the pipeline works on it at once; the
 * answers are saved in the background as they are typed (P-137, P-192).
 */
export function PrintFlow({ mockMode = false }: { mockMode?: boolean }) {
  const upload = useJobUpload({ mockMode });
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [details, setDetails] = useState<Partial<Record<Purpose, Record<string, string>>>>({});
  const [description, setDescription] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveAttempt, setSaveAttempt] = useState(0);
  // What the pipeline has of the student's answers (as the JSON that was sent), and how often it changed.
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [answersRevision, setAnswersRevision] = useState(0);
  // The student left the description field: save it now rather than after the pause.
  const [leftDescription, setLeftDescription] = useState(false);
  // When the last save of the description went out, so typing does not make a save at every pause (see MIN_SAVE_GAP_MS).
  const lastDescriptionSaveAt = useRef<number | null>(null);
  // The live status of the job, and whether the review has been on screen already.
  const [jobStatus, setJobStatus] = useState<StatusOrNull>(null);
  const [reviewShown, setReviewShown] = useState(false);
  // Why the chosen file was not taken (wrong type, too big): nothing was uploaded.
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  // The server refused an answer because the job is closed (the student already said yes).
  const [closedByServer, setClosedByServer] = useState(false);
  // Rate first (P-20): the prints to rate before the file is asked for, looked up as the screen
  // opens. null = nothing to rate (or the lookup failed: the 409 on create is the fallback).
  const [rateFirst, setRateFirst] = useState<UnratedPrint[] | null>(null);
  // Continue was pressed: the intake collapsed to a line and the loading view took over.
  const [continued, setContinued] = useState(false);
  const [editing, setEditing] = useState(false);
  const [recent, setRecent] = useState<RecentAnswer[]>([]);
  const [stageName, setStageName] = useState<'loading' | 'story' | 'sent' | null>(null);

  const uploadJobId = upload.state.phase === 'done' ? upload.state.jobId : null;
  const knownJobId =
    upload.state.phase === 'uploading' || upload.state.phase === 'error'
      ? upload.state.jobId
      : uploadJobId;

  useEffect(() => {
    const controller = new AbortController();
    const look = async () => {
      try {
        const prints = await pipelineApi.pendingRatings({ signal: controller.signal });
        if (!controller.signal.aborted && prints.length > 0) setRateFirst(prints);
      } catch {
        // Not fatal: creating the job answers 409 RATING_REQUIRED and the same prompt shows then.
      }
    };
    void look();
    return () => controller.abort();
  }, []);

  // Past answers wait in the "Recent" pill. They are never applied by themselves.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
    setRecent(loadRecentAnswers());
  }, []);

  const uploadError = upload.state.phase === 'error' ? upload.state : null;
  const ratingBlocked = uploadError?.kind === 'rating-required';
  // Before a file is chosen the one-tap rating comes first and the upload waits for it. A file
  // chosen before the lookup answered goes up as usual (the 409 fallback covers it).
  const ratingFirst = rateFirst !== null && !file;

  const cleanDetails = purpose ? cleanPurposeDetails(purpose, details[purpose]) : {};
  const descriptionText = description.trim();
  const descriptionOk = descriptionText.length >= MIN_DESCRIPTION;

  // What the pipeline needs from the student: purpose (with its details) and their own description.
  const inputs: StudentInputs = {};
  if (purpose) {
    inputs.purpose = purpose;
    inputs.purposeDetails = cleanDetails;
  }
  if (descriptionOk) inputs.description = descriptionText;
  const inputsKey = JSON.stringify(inputs);
  // Everything asked is answered and saved: now the story can show.
  const answered = purpose !== null && descriptionOk && savedKey === inputsKey;
  // Continue is open when the answers are valid (they are already being saved).
  const valid = purpose !== null && descriptionOk && detailsComplete(purpose, details[purpose]);
  // Past the review (the yes was said, or the job was refused) the answers are locked: the pipeline
  // no longer takes them, and editing would only fail.
  const locked = closedByServer || (jobStatus !== null && !EDITABLE_STATUSES.includes(jobStatus));
  // Once the review was shown it stays: an edit never sends the student back to the loading view.
  if (!reviewShown && answered && jobStatus !== null && REVIEW_STATUSES.includes(jobStatus)) {
    setReviewShown(true);
  }
  const inputsPending = Object.keys(inputs).length > 0 && savedKey !== inputsKey;

  // Background save: the purpose a moment after it's chosen, the description once the student
  // pauses or leaves the field. Waits for the upload to finish (the pipeline only knows the job
  // after that); never blocks.
  useEffect(() => {
    if (!uploadJobId || locked) return;
    if (Object.keys(inputs).length === 0 || inputsKey === savedKey) return;
    let cancelled = false;
    const descriptionPending = inputs.description !== undefined;
    const delay = !descriptionPending
      ? SAVE_DELAY_MS
      : leftDescription
        ? 0
        : descriptionText.length >= SENTENCE_LENGTH
          ? DESCRIPTION_IDLE_MS
          : SHORT_DESCRIPTION_IDLE_MS;
    const sinceLastSave =
      lastDescriptionSaveAt.current === null
        ? Infinity
        : Date.now() - lastDescriptionSaveAt.current;
    const spaced =
      !descriptionPending || leftDescription
        ? delay
        : Math.max(delay, MIN_SAVE_GAP_MS - sinceLastSave);
    const timer = setTimeout(async () => {
      setSaveState('saving');
      if (descriptionPending) lastDescriptionSaveAt.current = Date.now();
      try {
        await pipelineApi.saveInputs(uploadJobId, inputs);
        if (cancelled) return;
        setSavedKey(inputsKey);
        setAnswersRevision((n) => n + 1);
        setSaveState('saved');
      } catch (error) {
        if (cancelled) return;
        // 409: the job is closed (the yes went through first). Lock the form instead of an error.
        if (isConflictError(error)) {
          setClosedByServer(true);
          setSaveState('idle');
        } else if (error instanceof ApiError && error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
          // Too many changes in a short time: nothing is lost, the answers are saved a little later by themselves.
          setSaveState('saving');
          retryTimer = setTimeout(() => setSaveAttempt((n) => n + 1), RATE_LIMITED_RETRY_MS);
        } else {
          setSaveState('error');
        }
      }
    }, spaced);
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(retryTimer);
    };
    // inputs and descriptionText are derived from inputsKey's parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadJobId, locked, inputsKey, savedKey, leftDescription, saveAttempt]);

  // Which screen of the new-print flow the student is on, for the steps-to-submit metric (P-137)
  const stage =
    ratingFirst || ratingBlocked ? 'rate_first' : !file ? 'file' : continued ? 'loading' : 'form';
  useEffect(() => {
    trackScreen(`print_new.${stage}`);
  }, [stage]);

  // The intake must fit the screen without scrolling: shrink the small print step by step if not.
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fit = () => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    body.classList.remove('t1', 't2', 't3');
    for (let tier = 1; tier <= 3 && root.scrollHeight > root.clientHeight + 1; tier++) {
      body.classList.add(`t${tier}`);
    }
  };
  useLayoutEffect(fit);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    return () => observer.disconnect();
  }, [file, continued]);

  function choosePurpose(next: Purpose) {
    if (locked) return;
    setPurpose(next);
  }

  function setDetail(key: string, value: string) {
    if (!purpose || locked) return;
    setDetails((current) => ({ ...current, [purpose]: { ...current[purpose], [key]: value } }));
  }

  function useRecent(answer: RecentAnswer) {
    if (locked) return;
    setPurpose(answer.purpose);
    setDetails((current) => ({ ...current, [answer.purpose]: { ...answer.details } }));
  }

  function handleFile(accepted: File | null) {
    if (!accepted || file) return;
    const problem = validateModelFile(accepted);
    setFileProblem(problem);
    if (problem) return;
    setFile(accepted);
    void upload.start(accepted);
  }

  function handleContinue() {
    if (!valid || !purpose) return;
    rememberAnswer({ purpose, details: cleanDetails });
    setRecent(loadRecentAnswers());
    setContinued(true);
  }

  const dropzone = useDropzone({
    accept: PRINT_MODEL_ACCEPT,
    maxFiles: 1,
    multiple: false,
    noKeyboard: false,
    disabled: Boolean(file),
    onDropAccepted: (accepted) => handleFile(accepted[0] ?? null),
    onDropRejected: () => setFileProblem(REJECTED_FILE_MESSAGE),
  });

  // The rate-first gate and a locked orientation are their own screens, in the ordinary page frame.
  if (uploadError?.kind === 'orientation') {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6 pr-11 md:px-6">
        <OrientationLockNotice interrupt />
      </div>
    );
  }
  if (ratingBlocked && uploadError?.kind === 'rating-required') {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6 pr-11 md:px-6">
        <RatingRequiredPrompt prints={uploadError.prints} onDone={upload.retry} />
      </div>
    );
  }
  if (ratingFirst) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6 pr-11 md:px-6">
        <RatingRequiredPrompt
          prints={rateFirst}
          fileChosen={false}
          onDone={() => setRateFirst(null)}
        />
      </div>
    );
  }

  const option = optionFor(purpose);
  const summaryParts = [
    file?.name,
    option?.label,
    ...Object.values(cleanDetails),
    descriptionText ? `“${descriptionText}”` : null,
  ].filter(Boolean);
  const uploadMessage =
    upload.state.phase === 'done'
      ? 'Uploaded. We are already checking it.'
      : upload.state.phase === 'uploading'
        ? 'Uploading. This runs in the background.'
        : upload.state.phase === 'error'
          ? 'The upload did not finish.'
          : 'Receiving file';
  // (orientation and rate-first errors returned above)
  const hasUploadError = Boolean(uploadError);

  const saveStatus = locked ? (
    'Your print is on its way, so your answers are locked.'
  ) : saveState === 'saving' ? (
    'Saving'
  ) : saveState === 'saved' && answered ? (
    <span className="sf-saved">
      <Check aria-hidden="true" /> Saved
    </span>
  ) : saveState === 'error' ? (
    <span className="sf-save-error" role="alert">
      We couldn&apos;t save your answers.{' '}
      <button type="button" className="sf-lk" onClick={() => setSaveAttempt((n) => n + 1)}>
        Try again
      </button>
    </span>
  ) : null;

  const form = (inDialog: boolean) => (
    <IntakeForm
      purpose={purpose}
      details={details}
      description={description}
      disabled={locked}
      recent={recent}
      status={saveStatus}
      inDialog={inDialog}
      onPurpose={choosePurpose}
      onDetail={setDetail}
      onDescription={(value) => {
        setDescription(value);
        setLeftDescription(false);
      }}
      onDescriptionBlur={() => setLeftDescription(true)}
      onUseRecent={useRecent}
    />
  );

  const rootProps = file ? {} : dropzone.getRootProps();

  return (
    <div
      ref={rootRef}
      className="sf"
      data-stage={!file ? 'up' : continued ? 'work' : 'in'}
      data-view={stageName ?? undefined}
    >
      <h1 className="sr-only">Create 3D Print Job</h1>

      {/* The part, full-bleed behind the intake, dimmed and blurred */}
      {file && !continued && (
        <div className="sf-bgv" data-on aria-hidden="true">
          <PartBackdrop file={file} />
        </div>
      )}

      {!continued && (
        <div
          className="sf-top"
          {...rootProps}
          {...(file ? {} : { 'data-track': 'choose_file' })}
          data-testid="file-top"
        >
          {!file && (
            <>
              <input {...dropzone.getInputProps()} />
              <div className="sf-drop-ui">
                <UploadCloud aria-hidden="true" />
                <b>Drop your 3D model here</b>
                <span className="sf-muted">
                  STL, STEP or 3MF. We start checking the moment it arrives.
                </span>
                <span className="sf-btn sf-btn-inline">Choose a file</span>
                {fileProblem && (
                  <p className="sf-problem" role="alert" data-testid="file-problem">
                    <AlertTriangle aria-hidden="true" /> {fileProblem}
                  </p>
                )}
              </div>
            </>
          )}
          {file && (
            <div className="sf-file-ui">
              <div className="sf-prev" aria-hidden="true">
                <PartBackdrop file={file} />
              </div>
              <div className="sf-finfo">
                <b>{file.name}</b>
                <span role="status">{uploadMessage}</span>
                {hasUploadError && uploadError && (
                  <span className="sf-problem" role="alert">
                    {uploadError.message}{' '}
                    {uploadError.kind === 'other' && (
                      <button type="button" className="sf-lk" onClick={upload.retry}>
                        Try again
                      </button>
                    )}
                  </span>
                )}
              </div>
              {upload.state.phase === 'uploading' && (
                <Loader2 className="sf-spin" aria-hidden="true" />
              )}
              {upload.state.phase === 'done' && <Check className="sf-ok" aria-hidden="true" />}
            </div>
          )}
        </div>
      )}

      {continued && file && (
        <button
          type="button"
          className="sf-sum"
          onClick={() => setEditing(true)}
          disabled={locked && !editing}
          data-testid="intake-summary"
        >
          <i aria-hidden="true">&#10003;</i>
          <span className="sf-tx">{summaryParts.join(' · ')}</span>
          {!locked && <span className="sf-ed">Edit</span>}
        </button>
      )}

      {file && !continued && <div className="sf-sp" aria-hidden="true" />}

      {file && !continued && (
        <div className="sf-in" data-testid="intake">
          <div className="sf-mpanel">
            <div ref={bodyRef} className="sf-form-wrap">
              {form(false)}
            </div>
          </div>
        </div>
      )}

      {file && !continued && (
        <div className="sf-bar">
          <button
            type="button"
            className="sf-btn"
            disabled={!valid}
            data-track="continue"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      )}

      {file && uploadJobId && (
        <div className="sf-work" hidden={!continued}>
          <PipelineJobPanel
            jobId={uploadJobId}
            jobName={file.name}
            file={file}
            purpose={purpose}
            held={!continued}
            stepsOnly={!answered && !reviewShown}
            answersRevision={answersRevision}
            inputsPending={inputsPending}
            onStatusChange={setJobStatus}
            onStageChange={setStageName}
            showJobLink
          />
        </div>
      )}
      {file && !uploadJobId && continued && (
        <div className="sf-work">
          <LoadingView
            steps={[]}
            file={file}
            purpose={purpose}
            ready={false}
            onFinished={() => {}}
          />
        </div>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sf-dialog">
          <DialogTitle>Your answers</DialogTitle>
          <DialogDescription className="sr-only">
            Change what the print is for or your description. Changes are saved as you go.
          </DialogDescription>
          <div className="sf">{form(true)}</div>
          <Button type="button" onClick={() => setEditing(false)}>
            Save changes
          </Button>
        </DialogContent>
      </Dialog>

      <ReportProblem jobId={knownJobId} />
    </div>
  );
}

type StatusOrNull = StudentStatus | null;
