'use client';

import { PackageCheck } from 'lucide-react';
import { useLocalTime } from '@/hooks/useLocalTime';
import type { Pickup } from '@/types/pipeline';

/** "Slot 14, tag K7Q2": where to find the print, with a picture of it and when the window ends. */
export function PickupCard({ pickup }: { pickup: Pickup }) {
  const until = useLocalTime(pickup.windowEndsAt, 'EEE, MMM d, h:mm a');
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
                Please collect it by <time dateTime={pickup.windowEndsAt}>{until}</time>.
              </>
            )}
          </p>
        </div>
      </div>
      {photo && (
        // A short-lived signed link from another origin, so next/image's optimiser doesn't apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt="Your finished print"
          className="aspect-[4/3] w-full border-t object-contain"
        />
      )}
    </section>
  );
}
