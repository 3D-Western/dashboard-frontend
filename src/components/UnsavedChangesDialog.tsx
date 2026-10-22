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

interface UnsavedChangesDialogProps {
  isDirty: boolean;
  /**
   * Controlled mode, for guarding the close of a modal dialog: the caller says when to ask
   * (`open`) and hears the answer. Without it the dialog asks when a link is followed.
   */
  open?: boolean;
  onLeave?: () => void;
  onStay?: () => void;
  title?: string;
  description?: string;
  leaveLabel?: string;
}

export function UnsavedChangesDialog({
  isDirty,
  open: controlledOpen,
  onLeave,
  onStay,
  title = 'Leave this page?',
  description = "Your changes haven't been saved. If you leave now, they'll be lost.",
  leaveLabel = 'Leave page',
}: UnsavedChangesDialogProps) {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const nextUrl = useRef<string | null>(null);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : linkOpen;

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
    if (!isDirty || controlled) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      e.preventDefault();

      nextUrl.current = href;
      setLinkOpen(true);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty, controlled]);

  const closeDialog = (url: string | null = null) => {
    nextUrl.current = null;
    setLinkOpen(false);
    if (url) router.push(url);
  };

  const stay = () => (controlled ? onStay?.() : closeDialog());
  const leave = () => (controlled ? onLeave?.() : closeDialog(nextUrl.current));

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && stay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Two equal, full-width buttons, with staying (the safe choice) as the main one */}
        <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:grid sm:gap-3">
          <AlertDialogAction variant="outline" size="pill" className="w-full" onClick={leave}>
            {leaveLabel}
          </AlertDialogAction>
          <AlertDialogCancel variant="default" size="pill" className="w-full">
            Keep editing
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
