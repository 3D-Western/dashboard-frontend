'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown, Crosshair } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { LessonCard, Severity } from '@/types/pipeline';
import { useCardFocus } from './PartFocus';

export const SEVERITY_STYLE: Record<Severity, { label: string; bar: string; text: string }> = {
  info: { label: 'Good to know', bar: 'bg-status-gray', text: 'text-status-gray-foreground' },
  adjusted: { label: 'Fixed for you', bar: 'bg-status-blue', text: 'text-status-blue-foreground' },
  choice: { label: 'Your choice', bar: 'bg-status-yellow', text: 'text-status-yellow-foreground' },
  hold: { label: 'Good to know', bar: 'bg-status-gray', text: 'text-status-gray-foreground' },
  cannot_print: {
    label: "Can't print",
    bar: 'bg-status-red',
    text: 'text-status-red-foreground',
  },
};

export function LessonCardView({ card }: { card: LessonCard }) {
  const style = SEVERITY_STYLE[card.severity] ?? SEVERITY_STYLE.info;
  const { linked, active, select, focusState } = useCardFocus(card.code);
  const ref = useRef<HTMLElement>(null);
  const requestedBy = focusState?.code === card.code ? focusState.source : null;
  const nonce = focusState?.nonce;

  // Tapping the region on the part brings its card into view.
  useEffect(() => {
    if (requestedBy !== 'viewer') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const box = ref.current?.getBoundingClientRect();
    // Already comfortably on screen (above the sticky yes button on phones)? Leave the page alone.
    if (box && box.top >= 0 && box.bottom <= window.innerHeight - 96) return;
    ref.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }, [requestedBy, nonce]);

  return (
    <article
      ref={ref}
      id={`lesson-card-${card.code}`}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card p-4 pl-5',
        linked && 'cursor-pointer',
        active && 'ring-2 ring-ring',
      )}
      data-severity={card.severity}
      data-code={card.code}
      data-active={active || undefined}
      // One handler for the whole card; the button inside is the keyboard and screen-reader way in.
      onClick={linked ? select : undefined}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', style.bar)} />
      <p className={cn('eyebrow text-xs', style.text)}>{style.label}</p>
      <h3 className="mt-1 text-base">{card.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
      {linked && (
        <button
          type="button"
          aria-pressed={active}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline fine:min-h-0"
        >
          <Crosshair className="size-4" aria-hidden="true" />
          Show on your part
        </button>
      )}
    </article>
  );
}

/** Consequential cards (a fix was applied, or a choice is needed) go first and in full (P-29). */
export function splitLessonCards(cards: LessonCard[] | undefined) {
  const all = cards ?? [];
  return {
    consequential: all.filter((card) => card.consequential),
    rest: all.filter((card) => !card.consequential),
  };
}

export function ConsequentialCards({ cards }: { cards: LessonCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label="What matters for your part" className="space-y-3">
      {cards.map((card) => (
        <LessonCardView key={card.code} card={card} />
      ))}
    </section>
  );
}

/** Everything else the analysis found, out of the way until the student wants it (P-29). */
export function AnalysisDetails({ cards }: { cards: LessonCard[] }) {
  if (cards.length === 0) return null;
  return (
    <Collapsible className="rounded-lg border bg-card">
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm font-medium fine:min-h-0">
        <span>
          How your part was analysed
          <span className="ml-2 text-muted-foreground">({cards.length})</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t p-4">
        {cards.map((card) => (
          <LessonCardView key={card.code} card={card} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
