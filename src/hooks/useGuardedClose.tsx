import { useState, type ReactNode } from 'react';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';

/**
 * Guards closing a dialog that has unsaved edits. Call `requestClose` for Cancel, Escape, the
 * close button and a click outside; it asks first when [values] differ from what the dialog
 * opened with. Render `guard` once inside the dialog. After a successful save, call [onClose]
 * directly; if the dialog stays open after a save, call `markSaved` so it is clean again.
 */
export function useGuardedClose(values: unknown, onClose: () => void) {
  const [initial, setInitial] = useState(() => JSON.stringify(values));
  const isDirty = JSON.stringify(values) !== initial;
  const [asking, setAsking] = useState(false);

  const requestClose = () => (isDirty ? setAsking(true) : onClose());
  const markSaved = () => {
    setInitial(JSON.stringify(values));
  };

  const guard: ReactNode = (
    <UnsavedChangesDialog
      isDirty={isDirty}
      open={asking}
      onStay={() => setAsking(false)}
      onLeave={() => {
        setAsking(false);
        onClose();
      }}
      title="Discard your changes?"
      description="You have changes that are not saved. If you close now, they will be lost."
      leaveLabel="Discard changes"
    />
  );

  return { requestClose, guard, isDirty, markSaved };
}
