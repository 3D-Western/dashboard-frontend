'use client';

import { Suspense, lazy, useState, useSyncExternalStore } from 'react';
import { isWebGLAvailable } from '@/lib/part-viewer';

const PreparingPartCanvas = lazy(() => import('../PartViewer/PreparingPartCanvas'));

const subscribeNever = () => () => {};
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  query?.addEventListener?.('change', notify);
  return () => query?.removeEventListener?.('change', notify);
};
const reducedMotionNow = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The student's own part from the file still in memory, greyed and slowly turning. On the intake it
 * is the full-bleed backdrop behind the frosted card (the page blurs and dims it) and the small
 * preview beside the file name. Without WebGL it is a soft shape.
 */
export function PartBackdrop({ file }: { file: File | null }) {
  const webgl = useSyncExternalStore(subscribeNever, isWebGLAvailable, () => false);
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotionNow, () => false);
  const [failed, setFailed] = useState(false);
  if (!webgl || failed) return <div className="sf-plain" aria-hidden="true" />;
  return (
    <Suspense fallback={<div className="sf-plain" aria-hidden="true" />}>
      <PreparingPartCanvas
        file={file}
        reducedMotion={reduced}
        onDims={() => {}}
        onUnavailable={() => setFailed(true)}
      />
    </Suspense>
  );
}
