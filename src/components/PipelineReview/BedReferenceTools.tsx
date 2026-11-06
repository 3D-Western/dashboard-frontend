'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BED_NOTE_MAX, buildReferenceRequest, validateBedNote } from '@/lib/pipeline-farm';
import { reviewErrorMessage } from './ReviewBits';

/** The preview of a printer's saved empty-bed reference picture. */
type Preview =
  | { state: 'hidden' }
  | { state: 'loading' }
  | { state: 'shown'; url: string }
  | { state: 'none' }
  | { state: 'unavailable'; message: string };

/**
 * The two things staff do with a printer's empty-bed reference (P-106): look at the picture the
 * check compares the bed with, and save a new one. Saving takes the camera's picture at that
 * moment, so it asks the person to say the bed is empty and the chamber light is on first (a
 * reference of a bed with a part on it would pass every dirty bed). A save also lifts a block on
 * the printer. Staff only.
 */
export function BedReferenceTools({
  printerId,
  onSaved,
}: {
  printerId: string;
  /** Told after the pipeline took the picture, so the page can reload the list of blocks. */
  onSaved?: () => void;
}) {
  const [preview, setPreview] = useState<Preview>({ state: 'hidden' });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);
  const loadId = useRef(0);

  const revoke = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);
  useEffect(
    () => () => {
      loadId.current += 1;
      revoke();
    },
    [revoke],
  );

  // A different printer is a different picture.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- forgets the picture of the printer before
    setPreview({ state: 'hidden' });
    setDone(null);
    setFailure(null);
    return revoke;
  }, [printerId, revoke]);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setPreview({ state: 'loading' });
    try {
      const blob = await pipelineFarmApi.bedReference(printerId);
      if (loadId.current !== id) return;
      revoke();
      if (!blob) {
        setPreview({ state: 'none' });
        return;
      }
      objectUrl.current = URL.createObjectURL(blob);
      setPreview({ state: 'shown', url: objectUrl.current });
    } catch (err) {
      if (loadId.current !== id) return;
      setPreview({
        state: 'unavailable',
        message: reviewErrorMessage(
          err,
          'The reference picture cannot be shown right now. Saving a new one still works.',
        ),
      });
    }
  }, [printerId, revoke]);

  function togglePreview() {
    if (preview.state === 'hidden') void load();
    else {
      loadId.current += 1;
      revoke();
      setPreview({ state: 'hidden' });
    }
  }

  function openDialog() {
    setConfirmed(false);
    setNote('');
    setNoteError(null);
    setFailure(null);
    setDone(null);
    setDialogOpen(true);
  }

  async function save() {
    const problem = validateBedNote(note);
    setNoteError(problem);
    if (problem || !confirmed) return;
    setSaving(true);
    setFailure(null);
    try {
      const result = await pipelineFarmApi.setBedReference(printerId, buildReferenceRequest(note));
      setDialogOpen(false);
      setDone(result?.message || 'The camera’s picture is now this printer’s empty-bed reference.');
      if (preview.state !== 'hidden') void load();
      onSaved?.();
    } catch (err) {
      setDialogOpen(false);
      setFailure(
        reviewErrorMessage(
          err,
          'The reference was not saved. Check the printer’s camera and light, then try again.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const idBase = `bed-ref-${printerId.replace(/[^A-Za-z0-9_-]/g, '_')}`;

  return (
    <div className="space-y-3" data-testid="bed-reference-tools">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 fine:h-9"
          onClick={togglePreview}
          aria-expanded={preview.state !== 'hidden'}
        >
          <ImageIcon aria-hidden="true" />
          {preview.state === 'hidden' ? 'Show reference' : 'Hide reference'}
        </Button>
        <Button type="button" variant="outline" className="h-11 fine:h-9" onClick={openDialog}>
          Save empty-bed reference…
        </Button>
      </div>

      {preview.state === 'loading' && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading the reference picture…
        </p>
      )}
      {preview.state === 'shown' && (
        // A picture from our own backend, held as an object URL: next/image does not apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.url}
          alt={`Empty-bed reference picture of printer ${printerId}`}
          className="aspect-video w-full max-w-md rounded-md border object-contain"
        />
      )}
      {preview.state === 'none' && (
        <p className="text-sm text-muted-foreground">
          No reference picture is saved for this printer yet. Without one the check cannot tell
          whether the bed is clear.
        </p>
      )}
      {preview.state === 'unavailable' && (
        <p className="text-sm text-muted-foreground">{preview.message}</p>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      {done && (
        <Alert role="status">
          <AlertDescription>{done}</AlertDescription>
        </Alert>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save printer {printerId}’s empty-bed reference?</AlertDialogTitle>
            <AlertDialogDescription>
              The camera takes a picture when you confirm, and the check will compare this printer’s
              bed with it from now on. Do it only while you are looking at the printer and the bed
              is empty and the chamber light is on. A block on this printer is lifted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`${idBase}-confirm`}
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(value === true)}
              />
              <Label htmlFor={`${idBase}-confirm`} className="leading-snug">
                I am looking at the printer: the bed is empty and the chamber light is on.
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idBase}-note`}>Note (optional)</Label>
              <Textarea
                id={`${idBase}-note`}
                value={note}
                maxLength={BED_NOTE_MAX}
                aria-invalid={noteError ? true : undefined}
                onChange={(event) => setNote(event.target.value)}
              />
              {noteError && (
                <p role="alert" className="text-sm text-destructive">
                  {noteError}
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !confirmed}
              onClick={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save the reference
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
