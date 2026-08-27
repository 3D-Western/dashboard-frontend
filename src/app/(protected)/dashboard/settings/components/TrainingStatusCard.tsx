'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrainingLevel } from '@/hooks/useTraining';
import { canAccessBooking } from '@/utils/usage-calculators';
import { SettingsSectionSkeleton } from './SettingsSectionSkeleton';
import { SectionEmptyState } from './SectionEmptyState';
import { SectionErrorState } from './SectionErrorState';
import { TrainingLevelBadge } from './TrainingLevelBadge';
import { CertificateAcquiredNote } from './CertificateAcquiredNote';

export function TrainingStatusCard() {
  const { trainingLevel, isLoading, error, refetch } = useTrainingLevel();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Status</CardTitle>
        <CardDescription>Your current makerspace training level</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SettingsSectionSkeleton label="Loading training status" rows={1} />
        ) : error ? (
          <SectionErrorState message="Unable to load your training status." onRetry={refetch} />
        ) : !trainingLevel ? (
          <SectionEmptyState
            title="No training status"
            description="Contact makerspace staff to get your training status set up."
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrainingLevelBadge level={trainingLevel} />
              {trainingLevel === 'LEVEL_2' && <CertificateAcquiredNote />}
            </div>
            <p className="text-sm text-muted-foreground">
              {canAccessBooking(trainingLevel)
                ? 'Level 2 training is complete — you can book equipment.'
                : 'Level 2 training is required to book equipment.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
