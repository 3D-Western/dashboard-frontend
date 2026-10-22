'use client';

import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { accessAdminAPI } from '@/api/client/access-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextAreaField } from '@/components/TrainingAdmin/fields';
import { ErrorNote, LoadState } from '@/components/TrainingAdmin/feedback';
import { useAdminResource } from '@/hooks/useAdminResource';
import { validateUnlinkReason } from '@/lib/access-admin-forms';
import { cardSourceLabel, formatWhen, personName } from '@/lib/access-admin-format';
import { adminErrorMessage } from '@/lib/training-admin-errors';
import type { AccessStudent, CardLink } from '@/types/access-admin';

/** /admin/access/card-links: find a student and see (and close) the cards linked to them. */
export function CardLinks() {
  const [text, setText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<AccessStudent[] | null>(null);
  const [student, setStudent] = useState<AccessStudent | null>(null);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = text.trim();
    if (query.length < 2) {
      setSearchError('Type at least 2 characters: a student number, a name or part of an email.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setStudent(null);
    try {
      setResults(await accessAdminAPI.searchStudents(query));
    } catch (error) {
      setResults(null);
      setSearchError(adminErrorMessage(error, "We couldn't search for students."));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        A card links to a student automatically the first time they tap at the kiosk. Unlink a card
        that was lost or stolen so nobody else can use it; the student can link a new one at the
        kiosk.
      </p>

      <form
        onSubmit={(event) => void search(event)}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="card-student-search">Find a student</Label>
          <Input
            id="card-student-search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Student number, name or email"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={searching}>
          <Search /> {searching ? 'Searching...' : 'Search'}
        </Button>
      </form>
      <ErrorNote message={searchError} />

      {results && results.length === 0 && (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          No student matches &ldquo;{text.trim()}&rdquo;.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card" aria-label="Students found">
          {results.map((found) => (
            <li key={found.studentNumber}>
              <button
                type="button"
                onClick={() => setStudent(found)}
                aria-pressed={student?.studentNumber === found.studentNumber}
                className="flex min-h-12 w-full flex-col items-start gap-0.5 p-3 text-left hover:bg-muted aria-pressed:bg-primary/10"
              >
                <span className="font-medium">
                  {personName(found.firstName, found.lastName, found.studentNumber)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {found.studentNumber} · {found.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {student && <StudentCards key={student.studentNumber} student={student} />}
    </div>
  );
}

function StudentCards({ student }: { student: AccessStudent }) {
  const studentNumber = student.studentNumber;
  const load = useCallback(
    () => accessAdminAPI.listCardLinks(studentNumber).then((page) => page.data),
    [studentNumber],
  );
  const links = useAdminResource(load);
  const [unlinking, setUnlinking] = useState<CardLink | null>(null);

  const name = personName(student.firstName, student.lastName, student.studentNumber);
  const active = (links.data ?? []).filter((link) => link.active);
  const closed = (links.data ?? []).filter((link) => !link.active);

  return (
    <section aria-label={`Cards linked to ${name}`} className="space-y-3">
      <h2 className="text-lg font-semibold">Cards of {name}</h2>
      <LoadState
        isLoading={links.isLoading}
        error={links.error}
        hasData={!!links.data}
        onRetry={() => void links.reload()}
        what="the cards"
      >
        {links.data?.length === 0 && (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No card is linked to this student yet. It links at their first tap at the kiosk.
          </p>
        )}
        {active.length > 0 && (
          <ul className="space-y-2">
            {active.map((link) => (
              <CardRow key={link.id} link={link} onUnlink={() => setUnlinking(link)} />
            ))}
          </ul>
        )}
        {closed.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Unlinked earlier</h3>
            <ul className="space-y-2">
              {closed.map((link) => (
                <CardRow key={link.id} link={link} />
              ))}
            </ul>
          </div>
        )}
      </LoadState>

      {unlinking && (
        <UnlinkDialog
          link={unlinking}
          studentName={name}
          onClose={() => setUnlinking(null)}
          onDone={async () => {
            setUnlinking(null);
            toast.success('Card unlinked.');
            await links.reload();
          }}
        />
      )}
    </section>
  );
}

function CardRow({ link, onUnlink }: { link: CardLink; onUnlink?: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{link.uid}</span>
          <Badge variant={link.active ? 'secondary' : 'outline'}>
            {link.active ? 'Active' : 'Unlinked'}
          </Badge>
        </p>
        <p className="text-xs text-muted-foreground">
          {cardSourceLabel(link.source)} · {formatWhen(link.linkedAt)}
        </p>
        {!link.active && (
          <p className="text-xs text-muted-foreground">
            Unlinked {formatWhen(link.deactivatedAt)}
            {link.deactivatedReason ? `: ${link.deactivatedReason}` : ''}
          </p>
        )}
      </div>
      {onUnlink && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Unlink card ${link.uid}`}
          onClick={onUnlink}
        >
          Unlink
        </Button>
      )}
    </li>
  );
}

function UnlinkDialog({
  link,
  studentName,
  onClose,
  onDone,
}: {
  link: CardLink;
  studentName: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const reasonError = showError ? validateUnlinkReason(reason) : null;

  const confirm = async () => {
    if (validateUnlinkReason(reason)) {
      setShowError(true);
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      await accessAdminAPI.deactivateCardLink(link.id, reason.trim());
      await onDone();
    } catch (error) {
      setFailure(adminErrorMessage(error, "We couldn't unlink that card."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlink card {link.uid}?</DialogTitle>
          <DialogDescription>
            {studentName} will no longer be able to use this card at the kiosk or any machine. They
            can link a card again with a tap at the kiosk. The change and your reason are recorded.
          </DialogDescription>
        </DialogHeader>
        <TextAreaField
          label="Why are you unlinking it?"
          value={reason}
          onValueChange={setReason}
          rows={3}
          placeholder="Lost card"
          error={reasonError}
        />
        <ErrorNote message={failure} />
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Keep the card linked
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={saving}
            onClick={() => void confirm()}
          >
            {saving ? 'Unlinking...' : 'Unlink card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
