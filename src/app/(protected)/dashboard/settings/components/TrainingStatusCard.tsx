'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CertificationBadge } from '@/components/Training/CertificationBadge';
import { daysUntil, displayStatus, formatDate } from '@/lib/training-format';
import { Routes } from '@/lib/routes';
import { TrainingsProvider, useTrainings } from '@/providers/trainings-provider';
import type { TrainingSummary } from '@/types/training';
import { SettingsSectionSkeleton } from './SettingsSectionSkeleton';
import { SectionEmptyState } from './SectionEmptyState';
import { SectionErrorState } from './SectionErrorState';

function expiryNote(training: TrainingSummary): string | null {
  const certification = training.certification;
  if (!certification) return null;
  if (certification.addonRequired && certification.addonDueAt) {
    return `New material due by ${formatDate(certification.addonDueAt)}`;
  }
  if (
    certification.expiresAt &&
    (certification.status === 'ACTIVE' || certification.status === 'REFRESHER_DUE')
  ) {
    return daysUntil(certification.expiresAt) < 0
      ? `Expired on ${formatDate(certification.expiresAt)}`
      : `Valid until ${formatDate(certification.expiresAt)}`;
  }
  if (certification.activeSince && certification.status === 'ACTIVE') {
    return `Certified since ${formatDate(certification.activeSince)}`;
  }
  return null;
}

function TrainingStatusCardContent() {
  const { data, isLoading, error, refetch } = useTrainings();
  const started = data?.trainings.filter((t) => t.certification) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Status</CardTitle>
        <CardDescription>Your makerspace certifications</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SettingsSectionSkeleton label="Loading training status" rows={2} />
        ) : error || !data ? (
          <SectionErrorState
            message="Unable to load your training status."
            onRetry={() => void refetch()}
          />
        ) : started.length === 0 ? (
          <div className="space-y-3">
            <SectionEmptyState
              title="No certifications yet"
              description="Complete a training to earn your first certification."
            />
            <Button asChild variant="outline" size="sm">
              <Link href={Routes.training.home}>Go to training</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y rounded-lg border">
              {started.map((training) => {
                const note = expiryNote(training);
                return (
                  <li
                    key={training.slug}
                    className="flex items-start justify-between gap-3 px-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{training.title}</p>
                      {note && <p className="text-xs text-muted-foreground">{note}</p>}
                    </div>
                    <CertificationBadge status={displayStatus(training)} />
                  </li>
                );
              })}
            </ul>
            <Button asChild variant="outline" size="sm">
              <Link href={Routes.training.home}>Go to training</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrainingStatusCard() {
  return (
    <TrainingsProvider>
      <TrainingStatusCardContent />
    </TrainingsProvider>
  );
}
