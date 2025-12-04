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

export function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nextUrl = useRef<string | null>(null);

  // ✔ 1) Correct browser unload/back protection
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // 2) Intercept <Link> clicks BEFORE navigation
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      e.preventDefault();
      e.stopPropagation();

      nextUrl.current = href;
      setOpen(true);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  const confirmLeave = () => {
    if (nextUrl.current) {
      const go = nextUrl.current;
      nextUrl.current = null;
      router.push(go);
    }
    setOpen(false);
  };

  const cancelLeave = () => {
    nextUrl.current = null;
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && cancelLeave()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this page?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Leaving will discard them.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelLeave}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={confirmLeave}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
