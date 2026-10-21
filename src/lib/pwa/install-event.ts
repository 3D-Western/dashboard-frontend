// Chrome fires `beforeinstallprompt` once, early (often before the screen that wants it has
// rendered). We keep the event here from app start so any screen can use it later.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeToInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Drop the held event (it can only be used once). */
export function clearDeferredInstallPrompt() {
  if (deferred === null) return;
  deferred = null;
  notify();
}

/** Start holding the browser's install prompt. Returns a function that stops. */
export function startCapturingInstallPrompt(target: Window = window): () => void {
  const onBeforeInstallPrompt = (event: Event) => {
    // Stop Chrome's own mini-infobar: we show our own card at a moment of value
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  };
  // Installed (from our card or from the browser menu): nothing left to offer
  const onInstalled = () => clearDeferredInstallPrompt();

  target.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  target.addEventListener('appinstalled', onInstalled);
  return () => {
    target.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    target.removeEventListener('appinstalled', onInstalled);
  };
}
