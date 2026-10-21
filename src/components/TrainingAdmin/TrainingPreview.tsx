'use client';

import { useCallback, useMemo } from 'react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { TrainingPlayer } from '@/components/Training/TrainingPlayer';
import { TrainingRuntimeProvider } from '@/components/Training/TrainingRuntime';
import { useAdminResource } from '@/hooks/useAdminResource';
import { createPreviewSession } from '@/lib/training-preview-session';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import type { VersionSummary } from '@/types/training-admin';
import type { TrainingPreview as TrainingPreviewData } from '@/types/training-preview';
import { LoadState } from './feedback';
import { useTraining } from './TrainingContext';

const STATUS_WORDS: Record<VersionSummary['status'], string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  RETIRED: 'Retired',
};

/**
 * /admin/training/[id]/preview/[versionId]: the real student player, run on a version of the
 * training with nothing recorded. The server sends the version in the learner's own shape (plus
 * the quiz it would draw and the answer key); everything after that happens in this browser tab.
 */
export function TrainingPreview({ versionId }: { versionId: number }) {
  const { training } = useTraining();
  const load = useCallback(() => trainingAdminAPI.getPreview(versionId), [versionId]);
  const { data, error, isLoading, reload } = useAdminResource(load);
  const version = training.versions.find((v) => v.id === versionId) ?? null;
  const exitHref =
    version?.status === 'DRAFT'
      ? TrainingAdminRoutes.draft(training.id)
      : TrainingAdminRoutes.detail(training.id);
  const versionLabel = version
    ? `${STATUS_WORDS[version.status]} version ${version.versionNo}`
    : `Version ${versionId}`;

  return (
    <LoadState
      isLoading={isLoading}
      error={error}
      hasData={!!data}
      onRetry={() => void reload()}
      what="the preview"
    >
      {data && (
        <PreviewPlayer
          preview={data}
          versionId={versionId}
          versionLabel={versionLabel}
          exitHref={exitHref}
        />
      )}
    </LoadState>
  );
}

function PreviewPlayer({
  preview,
  versionId,
  versionLabel,
  exitHref,
}: {
  preview: TrainingPreviewData;
  versionId: number;
  versionLabel: string;
  exitHref: string;
}) {
  const session = useMemo(
    () =>
      createPreviewSession(preview, {
        versionLabel,
        exitHref,
        refetch: () => trainingAdminAPI.getPreview(versionId),
      }),
    [preview, versionId, versionLabel, exitHref],
  );

  return (
    <TrainingRuntimeProvider api={session.api} preview={session.controls}>
      <div className="mx-auto w-full max-w-3xl">
        <TrainingPlayer attemptId={preview.attempt.attemptId} />
      </div>
    </TrainingRuntimeProvider>
  );
}
