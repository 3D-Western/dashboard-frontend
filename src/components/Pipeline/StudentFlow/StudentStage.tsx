'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { Routes } from '@/lib/routes';
import { modelUrlOf } from '@/lib/plan-artifacts';
import type { Plan, Purpose, StepProgress, StudentStatus } from '@/types/pipeline';
import './student-flow.css';
import { LoadingView } from './LoadingView';
import { StoryView, type StoryViewProps } from './StoryView';

/**
 * The loading view that turns, in place, into the story (P-200). Loading ends only when the plan
 * is really in (`ready`) and the paced show has caught up; then the story takes over with no menu
 * in between. A student who opens a job already in review (`skipLoading`) gets the story at once,
 * and once the story has been shown it stays, whatever the pipeline does next (an edit that makes
 * a new plan does not send the student back to the loading view).
 */
export function StudentStage({
  steps,
  plan,
  status,
  file,
  purpose,
  ready,
  skipLoading,
  takingLonger,
  story,
}: {
  steps: StepProgress[];
  plan: Plan | null;
  status: StudentStatus | null;
  file: File | null;
  purpose: Purpose | null;
  /** The plan is in and the student's answers are saved: the analysis is really done. */
  ready: boolean;
  skipLoading: boolean;
  takingLonger: boolean;
  story: Omit<StoryViewProps, 'plan' | 'studentStatus'>;
}) {
  const [shown, setShown] = useState(skipLoading);
  if (plan && status && (shown || (skipLoading && ready))) {
    return (
      <StoryView
        // A different plan starts a fresh story: choices and edits belong to the old one.
        key={plan.planId}
        plan={plan}
        studentStatus={status}
        {...story}
      />
    );
  }
  return (
    <LoadingView
      steps={steps}
      file={file}
      modelUrl={modelUrlOf(plan)}
      purpose={purpose}
      ready={ready}
      takingLonger={takingLonger}
      onFinished={() => setShown(true)}
    />
  );
}

/** "Sent to print queue", centred, once the student has said yes. */
export function SentView({
  jobId,
  showJobLink,
  onClose,
}: {
  jobId: string;
  showJobLink: boolean;
  onClose: () => void;
}) {
  return (
    <div className="sf-fin" data-testid="sent-view">
      <div className="sf-fdone">
        <CircleCheck aria-hidden="true" />
        <h3>Sent to print queue</h3>
        <p>We will tell you when it is ready to collect.</p>
        {showJobLink ? (
          <Link href={Routes.jobs.detail(jobId)} className="sf-btn sf-btn-ghost sf-btn-sm">
            View this job
          </Link>
        ) : (
          <button type="button" className="sf-btn sf-btn-ghost sf-btn-sm" onClick={onClose}>
            See where it is
          </button>
        )}
      </div>
    </div>
  );
}
