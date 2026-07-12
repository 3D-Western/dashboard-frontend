import React from 'react';
import { CheckCircle2, Circle, XCircle, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { PrintJobStatus, StatusHistory } from '@/types/jobs';

interface StatusStepperProps {
  currentStatus: PrintJobStatus;
  history?: StatusHistory[];
}

// 1. Core successful progression path
const CORE_PROGRESSION: PrintJobStatus[] = [
  'PendingFile',
  'InQueue',
  'Printing',
  'Ready',
  'Succeeded',
];

// 2. Map human-readable labels for all 8 statuses
const STATUS_LABELS: Record<PrintJobStatus, string> = {
  PendingFile: 'File Pending',
  InQueue: 'In Queue',
  Printing: 'Fabricating',
  Ready: 'Ready for Pickup',
  Succeeded: 'Completed Successfully',
  Flagged: 'Flagged / Under Review',
  Error: 'Technical Error',
  Failed: 'Job Failed',
};

export function StatusStepper({ currentStatus, history = [] }: StatusStepperProps) {
  // Helper to find recorded history timestamps
  const getHistoryData = (status: PrintJobStatus) => {
    return history.find((h) => h.status === status);
  };

  const coreIndex = CORE_PROGRESSION.indexOf(currentStatus);

  // Identify if the current state is an exception state
  const isExceptionState = ['Flagged', 'Error', 'Failed'].includes(currentStatus);

  return (
    <div className="flex flex-col gap-6 py-2">
      {CORE_PROGRESSION.map((step, index) => {
        const historyEntry = getHistoryData(step);
        const timestamp = historyEntry
          ? new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }).format(new Date(historyEntry.changedAt))
          : null;

        // Visual calculation states
        const isPastStep = coreIndex > index;
        const isCurrentStep = currentStatus === step;
        const isFutureStep = coreIndex < index && coreIndex !== -1;

        // Logic for breaking the line if a failure/halt state occurs downstream
        let showExceptionHere = false;
        if (isExceptionState) {
          // Rule: show the exception item right below the last successful/completed step
          const isLastCompletedStep =
            (currentStatus === 'Flagged' && step === 'Printing') ||
            (currentStatus === 'Error' && step === 'Printing') ||
            (currentStatus === 'Failed' && step === 'InQueue' && !getHistoryData('Printing')) || // failed before printing
            (currentStatus === 'Failed' && step === 'Printing' && !!getHistoryData('Printing')); // failed during printing

          if (isLastCompletedStep) {
            showExceptionHere = true;
          }
        }

        return (
          <React.Fragment key={step}>
            {/* Standard Step Item */}
            <div className="relative flex items-start">
              {/* Vertical Connector Line */}
              {index !== CORE_PROGRESSION.length - 1 && (
                <div
                  className={`absolute top-6 bottom-[-26px] left-3 w-0.5 ${
                    isPastStep && !isExceptionState ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}

              <div className="z-10 flex w-full gap-4">
                {/* Step Icon Indicator */}
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background">
                  {isPastStep ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : isCurrentStep ? (
                    <Circle className="h-5 w-5 animate-pulse border-primary fill-primary/20 text-primary" />
                  ) : step === 'PendingFile' && !historyEntry ? (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Circle className="h-5 w-5 border-muted text-muted" />
                  )}
                </div>

                {/* Step Text Metadata */}
                <div className="flex flex-1 flex-col">
                  <span
                    className={`text-sm font-semibold ${
                      isFutureStep || (isExceptionState && !isPastStep)
                        ? 'text-muted-foreground/60'
                        : 'text-foreground'
                    }`}
                  >
                    {STATUS_LABELS[step]}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    {timestamp
                      ? `Reached: ${timestamp}`
                      : isCurrentStep
                        ? 'Active Step'
                        : 'Pending'}
                  </span>
                  {historyEntry?.comments && (
                    <p className="mt-1 rounded border-l-2 border-primary/40 bg-muted/40 p-2 text-xs text-muted-foreground">
                      {historyEntry.comments}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Injection of Exception Statuses (Flagged, Error, Failed) */}
            {showExceptionHere && (
              <div className="relative flex items-start pl-0">
                {/* Exception Connector Line linking back to flow */}
                <div className="absolute top-6 bottom-[-26px] left-3 w-0.5 bg-muted" />

                <div className="z-10 flex w-full animate-in gap-4 duration-200 fade-in slide-in-from-bottom-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background">
                    {currentStatus === 'Flagged' && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    {currentStatus === 'Error' && (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                    {currentStatus === 'Failed' && <XCircle className="h-5 w-5 text-destructive" />}
                  </div>

                  <div className="flex flex-1 flex-col rounded-xl border border-destructive/10 bg-destructive/5 p-3">
                    <span className="text-sm font-bold text-foreground">
                      {STATUS_LABELS[currentStatus]}
                    </span>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {(() => {
                        const exEntry = getHistoryData(currentStatus);
                        return exEntry
                          ? `Recorded: ${new Date(exEntry.changedAt).toLocaleString()}`
                          : 'Halted';
                      })()}
                    </span>
                    {(() => {
                      const exEntry = getHistoryData(currentStatus);
                      return exEntry?.comments ? (
                        <p className="mt-1.5 border-l-2 border-destructive/40 pl-2 text-xs font-medium text-destructive">
                          Reason: {exEntry.comments}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
