'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export function UnsavedChangesDialog({ isDirty }: { isDirty: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nextUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      e.preventDefault();

      nextUrl.current = href;
      setOpen(true);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  const closeDialog = (url: string | null = null) => {
    nextUrl.current = null;
    setOpen(false);
    if (url) router.push(url);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && closeDialog()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this page?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes haven&apos;t been saved. If you leave now, they&apos;ll be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Two equal, full-width buttons, with staying (the safe choice) as the main one */}
        <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:grid sm:gap-3">
          <AlertDialogAction
            variant="outline"
            size="pill"
            className="w-full"
            onClick={() => closeDialog(nextUrl.current)}
          >
            Leave page
          </AlertDialogAction>
          <AlertDialogCancel variant="default" size="pill" className="w-full">
            Keep editing
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
