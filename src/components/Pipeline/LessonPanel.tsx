'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEVERITY_COLOR } from '@/lib/part-viewer';
import type { LessonEntry, ReviewEntries } from '@/lib/review-lessons';
import { cn } from '@/lib/utils';
import { ChoiceList } from './ChoiceList';
import { SEVERITY_STYLE } from './LessonCards';
import { usePartFocus } from './PartFocus';

export interface ChoiceControls {
  /** choiceId -> optionId the student picked. */
  selected: Record<string, string>;
  saving?: string | null;
  disabled?: boolean;
  onSelect: (choiceId: string, optionId: string) => void;
}

const chosen = (entry: LessonEntry, selected: Record<string, string>) =>
  entry.choices.length > 0 && entry.choices.every((choice) => selected[choice.choiceId]);

/** The "Needs you" strip on the viewer: only what the student must act on, or a few words saying nothing does. */
export function NeedsYouStrip({
  entries,
  current,
  selected,
}: {
  entries: ReviewEntries;
  current?: LessonEntry;
  selected: Record<string, string>;
}) {
  const { focus } = usePartFocus();
  const needs = entries.steps.filter((entry) => entry.choices.length > 0);
  return (
    <div data-slot="needs-you" className="border-b px-3 py-2">
      {needs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing needs your decision.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow text-xs text-status-yellow-foreground">Needs you</span>
          <ul className="flex flex-wrap gap-2">
            {needs.map((entry) => {
              const done = chosen(entry, selected);
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    aria-pressed={current?.key === entry.key}
                    onClick={() => focus(entry.key, 'panel')}
                    className={cn(
                      'inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs',
                      done ? 'border-status-green' : 'border-status-yellow',
                      current?.key === entry.key && 'bg-accent ring-2 ring-ring',
                    )}
                  >
                    {entry.number !== null && (
                      <span
                        aria-hidden="true"
                        className="flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: SEVERITY_COLOR[entry.card?.severity ?? 'choice'] }}
                      >
                        {entry.number}
                      </span>
                    )}
                    <span className="truncate">{entry.title}</span>
                    {done ? (
                      <Check
                        className="size-3.5 text-status-green-foreground"
                        aria-label="Picked"
                      />
                    ) : (
                      <span className="text-status-yellow-foreground">Choose</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** "More about your part": lessons with no region on the part, as chips that open in the panel. */
export function MoreChips({ entries, current }: { entries: LessonEntry[]; current?: LessonEntry }) {
  const { focus } = usePartFocus();
  if (entries.length === 0) return null;
  return (
    <div data-slot="more-about" className="mt-3">
      <p className="text-xs font-medium">More about your part</p>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              aria-pressed={current?.key === entry.key}
              onClick={() => focus(entry.key, 'panel')}
              className={cn(
                'inline-flex min-h-9 max-w-full items-center rounded-full border px-2.5 py-1 text-left text-xs',
                current?.key === entry.key && 'border-ring bg-accent',
              )}
            >
              <span className="truncate">{entry.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The selected marker's lesson beside the viewer: what it is, why it matters on this part, what to
 * do, and the choice it needs. Arrows step through the markers. Every lesson keeps its
 * `lesson-card-<code>` element in the page (hidden until it is the one shown) so links to it work.
 */
export function LessonPanel({
  entries,
  current,
  heights,
  choiceControls,
}: {
  entries: ReviewEntries;
  current?: LessonEntry;
  heights: Record<string, [number, number]>;
  choiceControls: ChoiceControls;
}) {
  const { focus } = usePartFocus();
  const { steps, more } = entries;
  const position = current ? steps.findIndex((entry) => entry.key === current.key) : -1;
  const go = (delta: number) => {
    if (steps.length === 0) return;
    const next =
      position < 0
        ? delta > 0
          ? 0
          : steps.length - 1
        : (position + delta + steps.length) % steps.length;
    focus(steps[next].key, 'panel');
  };

  const style = current?.card
    ? (SEVERITY_STYLE[current.card.severity] ?? SEVERITY_STYLE.info)
    : null;
  const range = current ? heights[current.key] : undefined;
  const paragraphs = current?.card?.body.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <aside
      aria-label="About this part"
      data-slot="lesson-panel"
      className="min-w-0 rounded-lg border bg-card p-4"
    >
      {current ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className={cn('eyebrow text-xs', style?.text)}>
              {style?.label ?? (current.choices.length > 0 ? 'Your choice' : 'Good to know')}
            </p>
            {steps.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous"
                  className="flex size-11 items-center justify-center rounded-full border fine:size-8"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                  {position >= 0 ? `${position + 1} of ${steps.length}` : `${steps.length} steps`}
                </span>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next"
                  className="flex size-11 items-center justify-center rounded-full border fine:size-8"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <article
            id={current.card ? `lesson-card-${current.card.code}` : undefined}
            data-code={current.key}
            data-severity={current.card?.severity}
            data-active
            className="mt-1"
          >
            {(current.card || current.highlight) && (
              <h3 className="flex items-start gap-2 text-base">
                {current.number !== null && (
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{
                      background:
                        SEVERITY_COLOR[
                          current.card?.severity ?? current.highlight?.severity ?? 'info'
                        ],
                    }}
                  >
                    {current.number}
                  </span>
                )}
                {current.title}
              </h3>
            )}
            {paragraphs.map((text) => (
              <p key={text} className="mt-2 text-sm text-muted-foreground">
                {text}
              </p>
            ))}
            {!current.card && current.highlight && (
              <p className="mt-2 text-sm text-muted-foreground">
                This area of your part is marked on the model.
              </p>
            )}
            {range && (
              <p className="mt-2 text-xs text-muted-foreground">
                {range[1] - range[0] < 0.5
                  ? `On your part ${range[0].toFixed(1)} mm above the plate.`
                  : `On your part ${range[0].toFixed(1)} to ${range[1].toFixed(1)} mm above the plate.`}
              </p>
            )}
          </article>

          {current.choices.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <ChoiceList choices={current.choices} {...choiceControls} />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing else to know about your part.</p>
      )}

      {/* The other lessons keep their element (and id) so a link to one can open it. */}
      {[...steps, ...more]
        .filter((entry) => entry.card && entry.key !== current?.key)
        .map((entry) => (
          <article
            key={entry.key}
            id={`lesson-card-${entry.key}`}
            hidden
            data-code={entry.key}
            data-severity={entry.card!.severity}
            onClick={() => focus(entry.key, 'card')}
          />
        ))}
    </aside>
  );
}
