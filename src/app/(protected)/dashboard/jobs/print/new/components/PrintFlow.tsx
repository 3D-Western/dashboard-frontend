'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, FileBox, Loader2, Pencil } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { pipelineApi } from '@/api/client/pipeline';
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
import { Routes } from '@/lib/routes';
import type { Purpose, StudentInputs, UnratedPrint } from '@/types/pipeline';
import { useJobUpload } from './useJobUpload';

// STL, STEP, or 3MF (as plain geometry, or as a project carrying the student's own settings; P-53).
const ACCEPTED_FILES = {
  'model/stl': ['.stl'],
  'application/sla': ['.stl'],
  'model/3mf': ['.3mf'],
  'application/vnd.ms-package.3dmanufacturing-3dmodel+xml': ['.3mf'],
  'model/step': ['.step', '.stp'],
  'application/step': ['.step', '.stp'],
  'application/octet-stream': ['.stl', '.3mf', '.step', '.stp'],
};

const MAX_DESCRIPTION = 1000;
const MIN_DESCRIPTION = 2;
const SAVE_DELAY_MS = 600;

const CHIP =
  'min-h-11 rounded-full border border-control-border px-3.5 py-1.5 text-sm transition-colors outline-none hover:border-purple-light focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-purple-light data-[state=checked]:bg-purple-light/25 fine:min-h-0';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * The student's print flow, upload first (SCOPE §2, P-63, P-117): the file starts uploading the
 * moment it is chosen, and the pipeline starts working on it the moment it arrives. While that
 * happens the student says what it is for and tells us about the part; those answers are saved
 * in the background, and each pipeline step shows up live under the form.
 */
export function PrintFlow({ mockMode = false }: { mockMode?: boolean }) {
  const upload = useJobUpload({ mockMode });
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [details, setDetails] = useState<Partial<Record<Purpose, Record<string, string>>>>({});
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveAttempt, setSaveAttempt] = useState(0);
  const lastSaved = useRef<string | null>(null);
  // Rate first (P-20): the prints to rate before the file is asked for, looked up as the screen
  // opens. null = nothing to rate (or the lookup failed: the 409 on create is the fallback).
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

  const cleanDetails = purpose ? cleanPurposeDetails(purpose, details[purpose]) : {};
  const descriptionOk = description.trim().length >= MIN_DESCRIPTION;

  // Background save: purpose as soon as it's chosen, the description once the student continues.
  // Waits for the upload to finish (the pipeline only knows the job after that); never blocks.
  useEffect(() => {
    if (!uploadJobId) return;
    const inputs: StudentInputs = {};
    if (purpose) {
      inputs.purpose = purpose;
      inputs.purposeDetails = cleanDetails;
    }
    if (submitted) inputs.description = description.trim();
    if (Object.keys(inputs).length === 0) return;

    const key = JSON.stringify(inputs);
    if (key === lastSaved.current) return;
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setSaveState('saving');
        try {
          await pipelineApi.saveInputs(uploadJobId, inputs);
          if (cancelled) return;
          lastSaved.current = key;
          setSaveState('saved');
        } catch {
          if (!cancelled) setSaveState('error');
        }
      },
      submitted ? 0 : SAVE_DELAY_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // cleanDetails is derived from purpose and details
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadJobId, purpose, details, description, submitted, saveAttempt]);

  function choosePurpose(next: Purpose) {
    setPurpose(next);
    rememberPurpose({ purpose: next, details });
  }

  function setDetail(key: string, value: string) {
    if (!purpose) return;
    const next = { ...details, [purpose]: { ...details[purpose], [key]: value } };
    setDetails(next);
    rememberPurpose({ purpose, details: next });
  }

  function handleFile(accepted: File | null) {
    if (!accepted || file) return;
    setFile(accepted);
    void upload.start(accepted);
  }

  const purposeOption = PURPOSES.find((option) => option.value === purpose);
  const uploadError = upload.state.phase === 'error' ? upload.state : null;
  const ratingBlocked = uploadError?.kind === 'rating-required';
  // Before a file is chosen the one-tap rating comes first and the upload waits for it. A file
  // chosen before the lookup answered goes up as usual (the 409 fallback covers it).
  const ratingFirst = rateFirst !== null && !file;

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
            <FileUploadDropzone onFileAccepted={handleFile} accept={ACCEPTED_FILES} />
          )}
          {!file && (
            <p className="text-sm text-muted-foreground">
              STL, STEP or 3MF. A 3MF project can carry your own settings. We start checking the
              moment it arrives.
            </p>
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

      {file && !submitted && !ratingBlocked && (
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
              className="flex flex-wrap gap-2"
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
              aria-labelledby="part-heading"
              value={description}
              maxLength={MAX_DESCRIPTION}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. A replacement gear for the robot arm in my capstone project. The teeth take the load."
              className="min-h-28"
            />
            <p className="text-right text-xs text-muted-foreground">
              {description.length}/{MAX_DESCRIPTION}
            </p>

            <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background px-6 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
              {!purpose && (
                <p className="mb-2 text-sm text-muted-foreground">Pick what it&apos;s for first.</p>
              )}
              <Button
                type="button"
                size="lg"
                disabled={!purpose || !descriptionOk}
                onClick={() => setSubmitted(true)}
                className="w-full md:w-auto md:min-w-40"
              >
                Continue
              </Button>
            </div>
          </section>
        </>
      )}

      {file && submitted && (
        <section
          aria-label="Your answers"
          className="space-y-2 rounded-lg border bg-card p-4 text-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{purposeOption?.label}</p>
              <p className="mt-1 break-words text-muted-foreground">{description.trim()}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSubmitted(false)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          </div>
          {saveState === 'saving' && (
            <p className="text-xs text-muted-foreground" role="status">
              Saving your answers
            </p>
          )}
          {saveState === 'saved' && (
            <p className="text-xs text-status-green-foreground" role="status">
              Your answers are saved
            </p>
          )}
          {saveState === 'error' && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-destructive" role="alert">
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
      )}

      {/* Progress: live from the moment the upload completes, before the student has typed. */}
      {file && !uploadError && (
        <div className="pt-2">
          {uploadJobId ? (
            <PipelineJobPanel
              jobId={uploadJobId}
              jobName={file.name}
              stepsOnly={!submitted}
              showJobLink
            />
          ) : (
            <section className="space-y-4" aria-labelledby="uploading-heading">
              <h2 id="uploading-heading" className="text-xl">
                Preparing your print
              </h2>
              <PreparingSteps
                steps={[
                  {
                    step: 'upload',
                    title: 'Uploading your file',
                    teaching:
                      'Your file goes to safe storage first. Checking starts the moment it arrives.',
                    state: 'started',
                  },
                ]}
              />
            </section>
          )}
        </div>
      )}

      {uploadJobId && (
        <p className="text-sm">
          <Link href={Routes.jobs.detail(uploadJobId)} className="text-primary hover:underline">
            Open this job&apos;s page
          </Link>{' '}
          <span className="text-muted-foreground">
            to come back to it later. You will find it in My Jobs.
          </span>
        </p>
      )}

      <ReportProblem jobId={knownJobId} />
    </div>
  );
}
