import Link from 'next/link';
import { CalendarDays, ExternalLink, Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';
import { WEBSITE_EVENTS_URL } from '@/constants/website';

const ACTION_CLASS = 'h-auto w-full justify-start px-4 py-3 text-sm';

export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Button asChild className={ACTION_CLASS}>
        <Link href={Routes.jobs.newPrintJob}>
          <Plus aria-hidden="true" />
          New print
        </Link>
      </Button>
      <Button asChild variant="outline" className={ACTION_CLASS}>
        <Link href={Routes.jobs.home}>
          <Printer aria-hidden="true" />
          My jobs
        </Link>
      </Button>
      {/* The calendar isn't in the dashboard yet, so this opens the one on the website */}
      <Button asChild variant="outline" className={ACTION_CLASS}>
        <a href={WEBSITE_EVENTS_URL} target="_blank" rel="noopener noreferrer">
          <CalendarDays aria-hidden="true" />
          Events calendar
          <ExternalLink className="ml-auto size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Button>
    </div>
  );
}
