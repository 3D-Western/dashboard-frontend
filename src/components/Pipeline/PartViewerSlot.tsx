import { Box } from 'lucide-react';
import type { LessonCard } from '@/types/pipeline';

export interface PartViewerSlotProps {
  /** The pipeline's preview image of the part (the `preview_png` artifact's short-lived link). */
  previewUrl?: string;
  /**
   * Cards whose `region` should be highlighted on the part. Unused until the viewer exists; the
   * slot already receives them so the viewer needs no change to the review screen.
   */
  highlights?: LessonCard[];
  /** The `highlights_json` artifact's link: the viewer's own highlight data, when the pipeline made it. */
  highlightsUrl?: string;
}

/**
 * THE SLOT FOR THE 3D VIEWER WITH HIGHLIGHTED REGIONS (SCOPE §2.5, built later).
 *
 * Today it shows the preview image. To add the viewer, replace the body of this component with
 * the three.js canvas (keep the wrapper and `data-slot`); it gets everything it needs through
 * these props, and ReviewPlan and CannotPrint already pass them. The viewer should fall back to
 * the preview image when WebGL is unavailable.
 */
export function PartViewerSlot({ previewUrl, highlights = [] }: PartViewerSlotProps) {
  const highlighted = highlights.filter((card) => card.region).length;

  return (
    <figure
      data-slot="part-viewer"
      data-highlights={highlighted}
      className="overflow-hidden rounded-lg border bg-muted/30"
    >
      <div className="flex aspect-[4/3] items-center justify-center">
        {previewUrl ? (
          // A short-lived signed link from another origin, so next/image's optimiser doesn't apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Preview of your part on the print plate"
            className="size-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <Box className="size-8" aria-hidden="true" />
            <span>The preview image will show up here.</span>
          </div>
        )}
      </div>
      {highlighted > 0 && (
        <figcaption className="border-t px-3 py-2 text-xs text-muted-foreground">
          {highlighted === 1 ? '1 area of your part is' : `${highlighted} areas of your part are`}{' '}
          flagged below. A 3D view that highlights them is coming.
        </figcaption>
      )}
    </figure>
  );
}
