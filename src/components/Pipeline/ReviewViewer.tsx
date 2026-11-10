'use client';

import { buildEntries, currentEntry } from '@/lib/review-lessons';
import type { Plan } from '@/types/pipeline';
import { LessonPanel, MoreChips, NeedsYouStrip, type ChoiceControls } from './LessonPanel';
import { usePartFocus } from './PartFocus';
import { PartViewerSlot } from './PartViewerSlot';

interface ReviewViewerProps {
  plan: Plan;
  previewUrl?: string;
  modelUrl?: string;
  highlightsUrl?: string;
  choiceControls: ChoiceControls;
}

/**
 * The review's centre: the 3D part with a "needs you" strip on it, the selected marker's lesson
 * and choice beside it (under it on a phone), and the lessons with no region as chips below. With
 * no 3D view every lesson is a step in the panel, beside the preview image.
 */
export function ReviewViewer({
  plan,
  previewUrl,
  modelUrl,
  highlightsUrl,
  choiceControls,
}: ReviewViewerProps) {
  const focus = usePartFocus();
  const cards = plan.lessonCards ?? [];
  const choices = plan.choices ?? [];
  return (
    <PartViewerSlot
      previewUrl={previewUrl}
      modelUrl={modelUrl}
      highlightsUrl={highlightsUrl}
      highlights={plan.lessonCards}
      planId={plan.planId}
      compose={({ ready, drawn, heights }) => {
        const entries = buildEntries({ cards, choices, drawn, viewerReady: ready });
        const current = currentEntry(entries, focus.code);
        return {
          strip: (
            <NeedsYouStrip entries={entries} current={current} selected={choiceControls.selected} />
          ),
          below:
            entries.more.length > 0 ? (
              <MoreChips entries={entries.more} current={current} />
            ) : undefined,
          panel: (
            <LessonPanel
              entries={entries}
              current={current}
              heights={heights}
              choiceControls={choiceControls}
            />
          ),
        };
      }}
    />
  );
}
