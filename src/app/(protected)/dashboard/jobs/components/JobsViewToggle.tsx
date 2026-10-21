'use client';

import { useRouter } from 'next/navigation';
import { LayoutList, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobsView, saveJobsView } from '../lib/jobs-view';

const VIEWS: { value: JobsView; label: string; icon: typeof LayoutList }[] = [
  { value: 'list', label: 'List view', icon: LayoutList },
  { value: 'table', label: 'Table view', icon: Table2 },
];

/** Switches My Jobs between the card list and the compact table, and remembers the choice. */
export function JobsViewToggle({ view }: { view: JobsView }) {
  const router = useRouter();

  const choose = (next: JobsView) => {
    if (next === view) return;
    saveJobsView(next);
    router.refresh();
  };

  return (
    <div
      role="group"
      aria-label="Jobs layout"
      className="hidden shrink-0 rounded-lg border bg-card p-0.5 md:flex"
    >
      {VIEWS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            'flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none fine:size-8',
            view === value
              ? 'bg-purple-light/15 text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
