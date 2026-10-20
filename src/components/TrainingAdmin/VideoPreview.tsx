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
}

/**
 * Lets staff watch the video that is stored for a step. The link comes from the server when asked
 * for and lasts a short while; asking again gives a fresh one.
 */
export function VideoPreview({ versionId, stepId }: VideoPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUrl((await trainingAdminAPI.getStepPlaybackUrl(versionId, stepId)).url);
    } catch (err) {
      setUrl(null);
      setError(adminErrorMessage(err, "We couldn't load the video."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {url ? (
        <>
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            aria-label="Video preview"
            className="aspect-video w-full rounded-lg bg-black"
            onError={() => setError('The video could not be played. The link may have expired.')}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>
            Load a fresh link
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
          <Play /> {loading ? 'Loading...' : 'Preview the uploaded video'}
        </Button>
      )}
      <ErrorNote message={error} />
    </div>
  );
}
