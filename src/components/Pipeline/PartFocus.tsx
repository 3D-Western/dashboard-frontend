'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/** Who asked: a student tapping a lesson card, or tapping a region on the part. */
export type FocusSource = 'card' | 'viewer';

export interface PartFocus {
  /** The lesson code whose region is focused, or null. */
  code: string | null;
  /** Counts every request, so tapping the same card again pulses the region again. */
  nonce: number;
  source: FocusSource | null;
  /** Codes the 3D view can point at right now; cards for other codes stay plain. */
  linked: ReadonlySet<string>;
  /** Focuses a region; `null` clears the focus. */
  focus: (code: string | null, source: FocusSource) => void;
  /** The viewer reports the codes it drew (an empty list when it goes away). */
  setLinked: (codes: string[]) => void;
}

const PartFocusContext = createContext<PartFocus | null>(null);

function usePartFocusState(): PartFocus {
  const [state, setState] = useState<{
    code: string | null;
    nonce: number;
    source: FocusSource | null;
  }>({
    code: null,
    nonce: 0,
    source: null,
  });
  const [linked, setLinkedState] = useState<ReadonlySet<string>>(() => new Set());
  const lastLinked = useRef('');

  const focus = useCallback((code: string | null, source: FocusSource) => {
    setState((previous) => ({ code, nonce: previous.nonce + 1, source }));
  }, []);

  const setLinked = useCallback((codes: string[]) => {
    const key = [...codes].sort().join('\u0000');
    if (key === lastLinked.current) return;
    lastLinked.current = key;
    setLinkedState(new Set(codes));
  }, []);

  return useMemo(() => ({ ...state, linked, focus, setLinked }), [state, linked, focus, setLinked]);
}

/** Lets the 3D view and the lesson cards on a screen point at each other (matched by `code`). */
export function PartFocusProvider({ children }: { children: React.ReactNode }) {
  const value = usePartFocusState();
  return <PartFocusContext.Provider value={value}>{children}</PartFocusContext.Provider>;
}

/** Whether a provider is above (the viewer adds its own when a screen has no cards to link). */
export function useHasPartFocus() {
  return useContext(PartFocusContext) !== null;
}

/** The shared focus; must be inside a PartFocusProvider. */
export function usePartFocus(): PartFocus {
  const shared = useContext(PartFocusContext);
  if (!shared) throw new Error('usePartFocus must be used inside a PartFocusProvider');
  return shared;
}

/** For a lesson card: whether the viewer can show it, and whether it is the one being shown. */
export function useCardFocus(code: string) {
  const shared = useContext(PartFocusContext);
  return {
    linked: Boolean(shared?.linked.has(code)),
    active: shared?.code === code,
    select: () => shared?.focus(code, 'card'),
    focusState: shared,
  };
}
