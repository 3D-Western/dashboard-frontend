'use client';

import Link from 'next/link';
import { CalendarDays, ExternalLink, Lock, Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';
import { WEBSITE_EVENTS_URL } from '@/constants/website';
import { useOrientationLock } from '@/hooks/useOrientationLock';

const ACTION_CLASS = 'h-auto w-full justify-start px-4 py-3 text-sm';

/** Needs a TrainingsProvider above it: "New print" is locked until Maker Orientation is done. */
export function QuickActions() {
  const { locked } = useOrientationLock();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {locked ? (
        <Button asChild variant="secondary" className={ACTION_CLASS}>
          <Link href={Routes.training.home}>
            <Lock aria-hidden="true" />
            <span className="flex flex-col items-start text-left whitespace-normal">
              <span>New print is locked</span>
              <span className="text-xs font-normal text-muted-foreground">
                Finish Maker Orientation to submit prints
              </span>
            </span>
          </Link>
        </Button>
      ) : (
        <Button asChild className={ACTION_CLASS}>
          <Link href={Routes.jobs.newPrintJob}>
            <Plus aria-hidden="true" />
            New print
          </Link>
        </Button>
      )}
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
