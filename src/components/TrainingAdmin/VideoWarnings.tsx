'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { VideoWarning } from '@/lib/video-warnings';

const TITLES: Record<VideoWarning['id'], string> = {
  long: 'This video is long',
  resolution: 'This video is larger than it needs to be',
  bitrate: 'This video file is heavy',
  format: 'This is not an MP4',
};

/** Warnings about a video file. They advise; none of them stops an upload or a publish. */
export function VideoWarnings({ warnings }: { warnings: VideoWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2" aria-label="Video warnings">
      {warnings.map((warning) => (
        <Alert
          key={warning.id}
          variant={warning.severity === 'strong' ? 'destructive' : 'warning'}
          role="note"
        >
          <AlertTitle>{TITLES[warning.id]}</AlertTitle>
          <AlertDescription>
            <p>{warning.message}</p>
            <p className="font-medium">{warning.action}</p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
