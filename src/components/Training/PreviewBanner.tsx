'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { PreviewControls } from '@/types/training-preview';

/**
 * Shown above the player in staff preview. It stays in view while scrolling (a phone screen is
 * short, and this must never be mistaken for a real attempt).
 */
export function PreviewBanner({ preview }: { preview: PreviewControls }) {
  return (
    <div
      role="status"
      className="sticky top-0 z-20 -mx-4 border-b border-status-yellow/40 bg-status-yellow/15 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Eye className="size-4 shrink-0" aria-hidden="true" />
        <p className="font-semibold">Preview: nothing is saved</p>
        <p className="text-sm text-muted-foreground">
          {preview.versionLabel}, as a student sees it. Your answers and progress stay in this
          browser tab.
        </p>
        <Link
          href={preview.exitHref}
          className="ml-auto inline-flex min-h-11 items-center text-sm underline sm:min-h-0"
        >
          Back to the editor
        </Link>
      </div>
    </div>
  );
}
