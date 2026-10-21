'use client';

import { useEffect } from 'react';
import { startCapturingInstallPrompt } from '@/lib/pwa/install-event';
import { registerServiceWorker } from '@/lib/pwa/register-service-worker';

/**
 * Renders nothing. From app start it registers the service worker (production only) and holds on
 * to the browser's install prompt, so the install card can use it whenever it is shown.
 */
export function PwaSetup() {
  useEffect(() => {
    const stopCapturing = startCapturingInstallPrompt();
    void registerServiceWorker();
    return stopCapturing;
  }, []);
  return null;
}
