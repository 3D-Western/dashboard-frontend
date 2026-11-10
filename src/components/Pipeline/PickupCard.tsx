'use client';

import { PackageCheck } from 'lucide-react';
import { useLocalTime } from '@/hooks/useLocalTime';
import type { Pickup } from '@/types/pipeline';
import { PartViewerSlot } from './PartViewerSlot';

/**
 * "Slot 14, tag K7Q2": where to find the print, with a picture of it and when the window ends.
 * Nothing to do or confirm here: collection is inferred (P-136), the student just goes and gets it.
 */
export function PickupCard({
  pickup,
  modelUrl: planModelUrl,
}: {
  pickup: Pickup;
  /** The plan's `model_glb` link, when the page has the plan: the part is then shown in 3D. */
  modelUrl?: string;
}) {
  const until = useLocalTime(pickup.windowEndsAt, 'EEE, MMM d, h:mm a');
  const modelUrl =
    planModelUrl ?? pickup.artifacts?.find((artifact) => artifact.kind === 'model_glb')?.url;
  const photo = pickup.artifacts?.find(
    (artifact) => artifact.kind === 'preview_png' || artifact.kind === 'plate_png',
  );

  return (
    <section
      aria-labelledby="pickup-heading"
      className="overflow-hidden rounded-lg border bg-card"
      data-testid="pickup-card"
    >
      <div className="flex items-start gap-3 p-4">
        <PackageCheck
          className="mt-0.5 size-5 shrink-0 text-status-pink-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3 id="pickup-heading" className="text-lg font-semibold">
            Slot {pickup.slot}, tag {pickup.tag}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Find your print on shelf slot {pickup.slot}. Its tag reads {pickup.tag}.
            {until && (
              <>
                {' '}
                It is yours to take until <time dateTime={pickup.windowEndsAt}>{until}</time>.
              </>
            )}
          </p>
        </div>
      </div>
      {(modelUrl || photo) && (
        <div className="border-t p-3">
          {modelUrl ? (
            // The same interactive 3D view as the review, without the problem markers.
            <div className="mx-auto max-w-xl" data-testid="pickup-viewer">
              <PartViewerSlot previewUrl={photo?.url} modelUrl={modelUrl} />
            </div>
          ) : (
            photo && (
              <div
                className="mx-auto max-w-xl overflow-hidden rounded-lg border bg-muted/30"
                data-testid="pickup-photo"
              >
                {/* A short-lived signed link from another origin, so next/image's optimiser doesn't apply. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Your finished print"
                  className="aspect-[4/3] w-full object-contain"
                />
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
