'use client';

import { useId } from 'react';
import { Share, SquarePlus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InstallMoment } from '@/lib/pwa/install-prompt';
import { useInstallPrompt } from './useInstallPrompt';

interface InstallPromptProps {
  /** The moment of value we are at. Null means "not now": nothing is shown. */
  moment: InstallMoment | null;
  /** "note" is the short version for the end of the orientation results screen. */
  variant?: 'card' | 'note';
  className?: string;
}

const COPY: Record<InstallMoment, { heading: string; body: string }> = {
  'orientation-passed': {
    heading: 'Install the 3D Western app',
    body: 'Keep it on your home screen so it opens like any other app, and be ready for ready-for-pickup alerts as soon as we switch them on.',
  },
  'print-submitted': {
    heading: "Get notified when it's ready",
    body: 'Install the 3D Western app on your home screen. Pickup alerts are coming, and the app is how you will get them.',
  },
};

/**
 * Asks the student to add the dashboard to their home screen. It shows itself only when that is
 * possible and welcome: see `resolveInstallPrompt` for the rules (never on desktop, never once
 * installed, quiet for 30 days after "Not now").
 *  - Android/Chrome: our own card with an Install button that opens the browser's dialog.
 *  - iPhone/iPad: no install button exists, so it shows the two steps with their icons.
 */
export function InstallPrompt({ moment, variant = 'card', className }: InstallPromptProps) {
  const { mode, install, dismiss } = useInstallPrompt(moment);
  const headingId = useId();
  if (mode === 'hidden' || !moment) return null;

  const copy = COPY[moment];
  const heading = variant === 'note' ? 'Add the 3D Western app to your home screen' : copy.heading;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'rounded-xl border border-purple-light/50 bg-purple-light/10',
        variant === 'note' ? 'space-y-3 p-4' : 'space-y-4 p-5 sm:p-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-6 shrink-0 text-purple-light" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 id={headingId} className={variant === 'note' ? 'text-base' : 'text-lg'}>
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.body}</p>
        </div>
      </div>

      {mode === 'ios-steps' && (
        <ol className="space-y-2 text-sm">
          <li className="flex items-center gap-3">
            <StepNumber n={1} />
            <span>
              Tap the <strong className="font-semibold">Share</strong> button
              <Share className="mx-1.5 inline size-4 align-text-bottom" aria-hidden="true" />
              at the bottom of Safari (or the top of the screen on an iPad).
            </span>
          </li>
          <li className="flex items-center gap-3">
            <StepNumber n={2} />
            <span>
              Choose <strong className="font-semibold">Add to Home Screen</strong>
              <SquarePlus className="mx-1.5 inline size-4 align-text-bottom" aria-hidden="true" />
              then tap Add.
            </span>
          </li>
        </ol>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {mode === 'native' && (
          <Button
            type="button"
            onClick={() => void install()}
            className="min-h-11 w-full sm:w-auto"
          >
            Install app
          </Button>
        )}
        <Button
          type="button"
          variant={mode === 'native' ? 'outline' : 'secondary'}
          onClick={dismiss}
          className="min-h-11 w-full sm:w-auto"
        >
          Not now
        </Button>
      </div>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-light/20 text-xs font-semibold"
    >
      {n}
    </span>
  );
}
