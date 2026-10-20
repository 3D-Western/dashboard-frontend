'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { OrientationLockNotice } from '@/components/Training/OrientationLockNotice';
import { useOrientationLock } from '@/hooks/useOrientationLock';
import { TrainingsProvider } from '@/providers/trainings-provider';
import PrintJobForm from './PrintJobForm';

/** The print form, or the locked state while Maker Orientation is required and not done. */
export function PrintSubmissionGate({ mockMode = false }: { mockMode?: boolean }) {
  return (
    <TrainingsProvider>
      <GateContent mockMode={mockMode} />
    </TrainingsProvider>
  );
}

function GateContent({ mockMode }: { mockMode: boolean }) {
  const { locked, isLoading } = useOrientationLock();
  if (isLoading) {
    return (
      <Skeleton className="h-40 w-full max-w-5xl rounded-xl" aria-label="Checking orientation" />
    );
  }
  if (locked) return <OrientationLockNotice className="max-w-5xl" />;
  return <PrintJobForm mockMode={mockMode} />;
}
