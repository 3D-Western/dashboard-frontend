'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Button } from '@/components/ui/button';
import { adminErrorMessage } from '@/lib/training-admin-errors';
import { ErrorNote } from './feedback';

interface VideoPreviewProps {
  versionId: number;
  stepId: number;
  /** Receives the short-lived link to the stored video. */
  onUrl: (url: string) => void;
  /** True once a link has been loaded; the button then offers a fresh one. */
  loaded?: boolean;
}

/**
 * Asks the server for a link to watch the video that is already stored for a step. The link lasts
 * a short while; asking again gives a fresh one. Playing it is up to the caller.
 */
export function VideoPreview({ versionId, stepId, onUrl, loaded = false }: VideoPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      onUrl((await trainingAdminAPI.getStepPlaybackUrl(versionId, stepId)).url);
    } catch (err) {
      setError(adminErrorMessage(err, "We couldn't load the video."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={loaded ? 'ghost' : 'outline'}
        size={loaded ? 'sm' : 'default'}
        disabled={loading}
        onClick={() => void load()}
      >
        {!loaded && <Play />}{' '}
        {loading ? 'Loading...' : loaded ? 'Load a fresh link' : 'Preview the uploaded video'}
      </Button>
      <ErrorNote message={error} />
    </div>
  );
}
