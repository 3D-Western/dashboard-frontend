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
  'Succeeded'
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
  Failed: 'Job Failed'
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
              hour12: true
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
            (currentStatus === 'Failed' && step === 'InQueue') || // failed before printing
            (currentStatus === 'Failed' && step === 'Printing');   // failed during printing

          if (isLastCompletedStep) {
            showExceptionHere = true;
          }
        }

        return (
          <React.Fragment key={step}>
            {/* Standard Step Item */}
            <div className="flex relative items-start">
              {/* Vertical Connector Line */}
              {index !== CORE_PROGRESSION.length - 1 && (
                <div
                  className={`absolute left-3 top-6 bottom-[-26px] w-0.5 ${
                    isPastStep && !isExceptionState ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}

              <div className="flex gap-4 z-10 w-full">
                {/* Step Icon Indicator */}
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-background">
                  {isPastStep ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : isCurrentStep ? (
                    <Circle className="h-5 w-5 text-primary fill-primary/20 border-primary animate-pulse" />
                  ) : step === 'PendingFile' && !historyEntry ? (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted border-muted" />
                  )}
                </div>

                {/* Step Text Metadata */}
                <div className="flex flex-col flex-1">
                  <span
                    className={`text-sm font-semibold ${
                      isFutureStep || (isExceptionState && !isPastStep)
                        ? 'text-muted-foreground/60'
                        : 'text-foreground'
                      }`}
                  >
                    {STATUS_LABELS[step]}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {timestamp ? `Reached: ${timestamp}` : isCurrentStep ? 'Active Step' : 'Pending'}
                  </span>
                  {historyEntry?.comments && (
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2 rounded border-l-2 border-primary/40">
                      {historyEntry.comments}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Injection of Exception Statuses (Flagged, Error, Failed) */}
            {showExceptionHere && (
              <div className="flex relative items-start pl-0">
                {/* Exception Connector Line linking back to flow */}
                <div className="absolute left-3 top-6 bottom-[-26px] w-0.5 bg-muted" />

                <div className="flex gap-4 z-10 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-background">
                    {currentStatus === 'Flagged' && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    {currentStatus === 'Error' && (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                    {currentStatus === 'Failed' && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>

                  <div className="flex flex-col flex-1 bg-destructive/5 border border-destructive/10 p-3 rounded-xl">
                    <span className="text-sm font-bold text-foreground">
                      {STATUS_LABELS[currentStatus]}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
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
                        <p className="text-xs font-medium text-destructive mt-1.5 border-l-2 border-destructive/40 pl-2">
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