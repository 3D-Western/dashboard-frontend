'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * The summary's list (P-202): it scrolls inside itself, never the page. The bottom edge fades while
 * there is more below, and a small "N more" pill (also a button) says how much; both go at the end.
 * Wheel and touch scroll the list and stop at its ends (no scroll chaining to the page).
 * Direct children marked `data-row` are what the count is made of.
 */
export function SummaryList({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    if (atEnd || el.scrollHeight <= el.clientHeight + 1) {
      setMore(0);
      return;
    }
    const bottom = el.getBoundingClientRect().bottom;
    let hidden = 0;
    for (const child of Array.from(el.children)) {
      if (!(child as HTMLElement).hasAttribute('data-row')) continue;
      if (child.getBoundingClientRect().bottom > bottom + 2) hidden += 1;
    }
    setMore(Math.max(1, hidden));
  }, []);

  // Every render may have changed the rows; the box itself may change size too.
  useLayoutEffect(() => {
    measure();
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="sf-scrollwrap" data-more={more > 0 || undefined} data-testid="summary-scroll">
      <div ref={ref} className="sf-scroller sf-rows" onScroll={measure} tabIndex={-1}>
        {children}
      </div>
      {more > 0 && (
        <button
          type="button"
          className="sf-morehint"
          data-testid="summary-more"
          aria-label={`${more} more, scroll down`}
          onClick={() =>
            ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: 'smooth' })
          }
        >
          {more} more
          <ChevronDown aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
