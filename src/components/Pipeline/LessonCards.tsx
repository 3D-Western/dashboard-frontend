'use client';

import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { LessonCard, Severity } from '@/types/pipeline';

const SEVERITY_STYLE: Record<Severity, { label: string; bar: string; text: string }> = {
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
  return (
    <article
      className="relative overflow-hidden rounded-lg border bg-card p-4 pl-5"
      data-severity={card.severity}
      data-code={card.code}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', style.bar)} />
      <p className={cn('eyebrow text-xs', style.text)}>{style.label}</p>
      <h3 className="mt-1 text-base">{card.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
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
