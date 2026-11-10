'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, FileBox, Loader2 } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { isConflictError, pipelineApi } from '@/api/client/pipeline';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadDropzone } from '@/components/FileUploadDropzone';
import { OrientationLockNotice } from '@/components/Training/OrientationLockNotice';
import { PipelineJobPanel } from '@/components/Pipeline/PipelineJobPanel';
import { RatingRequiredPrompt } from '@/components/Pipeline/RatingRequiredPrompt';
import { PreparingSteps } from '@/components/Pipeline/PreparingSteps';
import { ReportProblem } from '@/components/Pipeline/ReportProblem';
import {
  PURPOSES,
  cleanPurposeDetails,
  loadRememberedPurpose,
  rememberPurpose,
} from '@/lib/purpose-memory';
import { trackScreen } from '@/lib/analytics';
import { PRINT_MODEL_ACCEPT, REJECTED_FILE_MESSAGE, validateModelFile } from '@/lib/model-files';
import type { Purpose, StudentInputs, StudentStatus, UnratedPrint } from '@/types/pipeline';
import { useJobUpload } from './useJobUpload';

const MAX_DESCRIPTION = 1000;
const MIN_DESCRIPTION = 2;
/** The purpose and its details are saved this long after the last change. */
const SAVE_DELAY_MS = 600;
/**
 * The description is saved when the student stops typing (or leaves the field), so there is no
 * "Continue" to tap (P-137): after a pause of this long, shorter for a real sentence, longer for a
 * word or two that may not be finished.
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

const CHIP =
  'min-h-11 rounded-full border border-control-border px-3.5 py-1.5 text-sm transition-colors outline-none hover:border-purple-light focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-purple-light data-[state=checked]:bg-purple-light/25 fine:min-h-0';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const REVIEW_STATUSES: readonly StudentStatus[] = ['needs_confirmation', 'needs_choice'];
/** Statuses in which the pipeline still takes the student's answers (before and during the review). */
const EDITABLE_STATUSES: readonly StudentStatus[] = ['preparing', ...REVIEW_STATUSES];

/**
 * The student's print flow, upload first (SCOPE §2, P-63, P-117): the file starts uploading the
 * moment it is chosen, and the pipeline starts working on it the moment it arrives. While that
 * happens the student says what it is for and tells us about the part; those answers are saved
 * in the background as they go (no "Continue" to tap, P-137), and each pipeline step shows up live
 * under the form. The review with its explicit yes appears right below, on the same page.
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
  const [focusDescription, setFocusDescription] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  // When the last save of the description went out, so typing does not make a save at every pause (see MIN_SAVE_GAP_MS).
  const lastDescriptionSaveAt = useRef<number | null>(null);
  // Rate first (P-20): the prints to rate before the file is asked for, looked up as the screen
  // opens. null = nothing to rate (or the lookup failed: the 409 on create is the fallback).
  // The live status of the job, and whether the review has been on screen already.
  const [jobStatus, setJobStatus] = useState<StudentStatus | null>(null);
  const [reviewShown, setReviewShown] = useState(false);
  // Why the chosen file was not taken (wrong type, too big): nothing was uploaded.
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  // The server refused an answer because the job is closed (the student already said yes).
  const [closedByServer, setClosedByServer] = useState(false);
  const [rateFirst, setRateFirst] = useState<UnratedPrint[] | null>(null);

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

  // What the student answered last time is offered again (once the page is on screen).
  useEffect(() => {
    const remembered = loadRememberedPurpose();
    if (!remembered) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
    setPurpose((current) => current ?? remembered.purpose);
    setDetails((current) => (Object.keys(current).length ? current : remembered.details));
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
  // Everything asked is answered and saved: now the review can show (and nothing is left to tap).
  const answered = purpose !== null && descriptionOk && savedKey === inputsKey;
  // Past the review (the yes was said, or the job was refused) the answers are locked: the pipeline
  // no longer takes them, and editing would only fail.
  const locked = closedByServer || (jobStatus !== null && !EDITABLE_STATUSES.includes(jobStatus));
  // Once the review was shown it stays: an edit never sends the student back to the steps view.
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

  // Returning students (purpose remembered) go straight to the description, no tap to start typing.
  useEffect(() => {
    if (focusDescription && file) descriptionRef.current?.focus();
  }, [focusDescription, file]);

  // Which screen of the new-print flow the student is on, for the steps-to-submit metric (P-137)
  const stage = ratingFirst || ratingBlocked ? 'rate_first' : !file ? 'file' : 'form';
  useEffect(() => {
    trackScreen(`print_new.${stage}`);
  }, [stage]);

  function choosePurpose(next: Purpose) {
    if (locked) return;
    setPurpose(next);
    rememberPurpose({ purpose: next, details });
  }

  function setDetail(key: string, value: string) {
    if (!purpose || locked) return;
    const next = { ...details, [purpose]: { ...details[purpose], [key]: value } };
    setDetails(next);
    rememberPurpose({ purpose, details: next });
  }

  function handleFile(accepted: File | null) {
    if (!accepted || file) return;
    const problem = validateModelFile(accepted);
    setFileProblem(problem);
    if (problem) return;
    setFile(accepted);
    if (purpose) setFocusDescription(true);
    void upload.start(accepted);
  }

  const purposeOption = PURPOSES.find((option) => option.value === purpose);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {uploadError?.kind === 'orientation' && <OrientationLockNotice interrupt />}

      {/* Rate first (P-20): the backend holds a new job until the last collected print is rated. */}
      {uploadError?.kind === 'rating-required' && (
        <RatingRequiredPrompt prints={uploadError.prints} onDone={upload.retry} />
      )}

      {ratingFirst && (
        <RatingRequiredPrompt
          prints={rateFirst}
          fileChosen={false}
          onDone={() => setRateFirst(null)}
        />
      )}

      {/* 1. Upload first (after the rating, when one is due) */}
      {!ratingFirst && (
        <section aria-labelledby="upload-heading" className="space-y-3">
          <h2 id="upload-heading" className="text-lg">
            1. Your file
          </h2>
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <FileBox className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground" role="status">
                  {upload.state.phase === 'done' && 'Uploaded. We are already checking it.'}
                  {upload.state.phase === 'uploading' &&
                    'Uploading. Keep going, this runs in the background.'}
                  {upload.state.phase === 'error' &&
                    (ratingBlocked
                      ? 'One quick rating first, then your file goes up.'
                      : 'The upload did not finish.')}
                </p>
              </div>
              {upload.state.phase === 'uploading' && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
              )}
              {upload.state.phase === 'done' && (
                <Check className="size-4 text-status-green" aria-hidden="true" />
              )}
            </div>
          ) : (
            <div data-track="choose_file">
              <FileUploadDropzone
                onFileAccepted={handleFile}
                accept={PRINT_MODEL_ACCEPT}
                onError={() => setFileProblem(REJECTED_FILE_MESSAGE)}
              />
            </div>
          )}
          {!file && (
            <p className="text-sm text-muted-foreground">
              STL, STEP or 3MF. A 3MF project can carry your own settings. We start checking the
              moment it arrives.
            </p>
          )}
          {fileProblem && !file && (
            <Alert variant="destructive" data-testid="file-problem">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>That file can&apos;t be uploaded</AlertTitle>
              <AlertDescription>{fileProblem}</AlertDescription>
            </Alert>
          )}
          {uploadError &&
            uploadError.kind !== 'orientation' &&
            uploadError.kind !== 'rating-required' && (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Couldn&apos;t upload your file</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{uploadError.message}</p>
                  {uploadError.kind === 'other' && (
                    <Button type="button" variant="outline" onClick={upload.retry}>
                      Try again
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
        </section>
      )}

      {file && !ratingBlocked && (
        <>
          {/* 2. Purpose, with its short sub-form */}
          <section aria-labelledby="purpose-heading" className="space-y-3">
            <div>
              <h2 id="purpose-heading" className="text-lg">
                2. What&apos;s it for?
              </h2>
              <p className="text-sm text-muted-foreground">
                Fill this in while we check your part. We remember your answer for next time.
              </p>
            </div>
            <RadioGroupPrimitive.Root
              aria-labelledby="purpose-heading"
              value={purpose ?? ''}
              onValueChange={(value) => choosePurpose(value as Purpose)}
              disabled={locked}
              className="flex flex-wrap gap-2"
              data-track="purpose"
            >
              {PURPOSES.map((option) => (
                <RadioGroupPrimitive.Item key={option.value} value={option.value} className={CHIP}>
                  {option.label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>

            {purposeOption && (
              <div className="space-y-3 rounded-lg border bg-card p-4">
                {purposeOption.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`purpose-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`purpose-${field.key}`}
                      value={details[purposeOption.value]?.[field.key] ?? ''}
                      maxLength={80}
                      placeholder={field.placeholder}
                      disabled={locked}
                      onChange={(event) => setDetail(field.key, event.target.value)}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {purposeOption.value === 'venture'
                    ? 'Thanks. Ventures at Western can also get funding and programmes through the Morrissette Institute for Entrepreneurship.'
                    : 'This helps us share printer time fairly. Building something you could sell? The Morrissette Institute for Entrepreneurship at Western has funding, programmes and people to talk to.'}
                </p>
              </div>
            )}
          </section>

          {/* 3. Tell us about your part: the student's own words */}
          <section aria-labelledby="part-heading" className="space-y-3">
            <div>
              <h2 id="part-heading" className="text-lg">
                3. Tell us about your part
              </h2>
              <p className="text-sm text-muted-foreground">
                In your own words: what is it, what will it do, and what matters most about it?
              </p>
            </div>
            <Textarea
              ref={descriptionRef}
              aria-labelledby="part-heading"
              value={description}
              maxLength={MAX_DESCRIPTION}
              disabled={locked}
              onChange={(event) => {
                setDescription(event.target.value);
                setLeftDescription(false);
              }}
              onBlur={() => setLeftDescription(true)}
              placeholder="e.g. A replacement gear for the robot arm in my capstone project. The teeth take the load."
              className="min-h-28"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div role="status" className="min-h-4">
                {locked && 'Your print is on its way, so your answers are locked.'}
                {!locked && saveState === 'saving' && 'Saving your answers'}
                {!locked && saveState === 'saved' && answered && (
                  <span className="text-status-green-foreground">Your answers are saved</span>
                )}
                {!locked && !purpose && description.length > 0 && 'Pick what it’s for too.'}
              </div>
              <span>
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
            {!locked && saveState === 'error' && (
              <p
                className="flex flex-wrap items-center gap-2 text-xs text-destructive"
                role="alert"
              >
                We couldn&apos;t save your answers.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveAttempt((n) => n + 1)}
                >
                  Try again
                </Button>
              </p>
            )}
          </section>
        </>
      )}

      {/* Progress: live from the moment the upload completes, before the student has typed. */}
      {file && !uploadError && (
        <div className="pt-2">
          {uploadJobId ? (
            <PipelineJobPanel
              jobId={uploadJobId}
              jobName={file.name}
              file={file}
              stepsOnly={!answered && !reviewShown}
              answersRevision={answersRevision}
              inputsPending={inputsPending}
              onStatusChange={setJobStatus}
              showJobLink
            />
          ) : (
            <section className="space-y-4" aria-labelledby="uploading-heading">
              <h2 id="uploading-heading" className="text-xl">
                Preparing your print
              </h2>
              <PreparingSteps steps={[]} file={file} purpose={purpose} />
            </section>
          )}
        </div>
      )}

      {uploadJobId && (
        <p className="text-sm text-muted-foreground">
          You can leave this page any time: your job keeps going and is in My Jobs.
        </p>
      )}

      <ReportProblem jobId={knownJobId} />
    </div>
  );
}
