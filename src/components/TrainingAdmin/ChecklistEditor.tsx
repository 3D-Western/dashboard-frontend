'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Button } from '@/components/ui/button';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';

import { adminErrorMessage, issuesFromError } from '@/lib/training-admin-errors';
import { CHECKLIST_KEY_PATTERN, checklistKey } from '@/lib/training-admin-format';
import type { ChecklistItem, ValidationIssue } from '@/types/training-admin';
import { ErrorNote } from './feedback';

interface Row {
  uid: number;
  label: string;
  key: string;
  /** The author edited the key by hand, so it no longer follows the label. */
  keyTouched: boolean;
  /** The label was edited, so a blank one is worth complaining about. */
  labelTouched?: boolean;
}

let nextUid = 1;

const toRows = (items: ChecklistItem[]): Row[] =>
  items.map((item) => ({ uid: nextUid++, label: item.label, key: item.key, keyTouched: true }));

interface ChecklistEditorProps {
  versionId: number;
  items: ChecklistItem[];
  onSaved: (items: ChecklistItem[]) => void;
}

/**
 * The in-person items a supervisor ticks with the member present. They are frozen with the
 * version when it is published, and machine trainings cannot be published without them.
 */
export function ChecklistEditor({ versionId, items, onSaved }: ChecklistEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => toRows(items));
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const update = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };

  const setLabel = (uid: number, label: string) => {
    update(
      rows.map((row) => {
        if (row.uid !== uid) return row;
        if (row.keyTouched) return { ...row, label, labelTouched: true };
        const taken = new Set(rows.filter((r) => r.uid !== uid).map((r) => r.key));
        return { ...row, label, labelTouched: true, key: checklistKey(label, taken) };
      }),
    );
  };

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const keyProblem = (row: Row, index: number): string | undefined => {
    const server = issues.find((issue) => issue.path === `items[${index}].key`)?.message;
    if (server) return server;
    if (!CHECKLIST_KEY_PATTERN.test(row.key)) {
      return 'Use lowercase letters, digits, - or _ (for example estop).';
    }
    if (rows.some((other, i) => i !== index && other.key === row.key)) {
      return 'Each item needs its own key.';
    }
    return undefined;
  };

  const labelProblem = (row: Row, index: number): string | undefined => {
    const server = issues.find((issue) => issue.path === `items[${index}].label`)?.message;
    if (server) return server;
    return row.label.trim() === '' && (row.labelTouched || attempted)
      ? 'Describe what the supervisor confirms.'
      : undefined;
  };

  const hasProblems = rows.some(
    (row, i) => keyProblem(row, i) || row.label.trim() === '' || labelProblem(row, i),
  );

  const save = async () => {
    setFailure(null);
    setIssues([]);
    setAttempted(true);
    if (hasProblems) return;
    setSaving(true);
    try {
      const result = await trainingAdminAPI.setChecklist(
        versionId,
        rows.map((row) => ({ key: row.key, label: row.label.trim() })),
      );
      toast.success('Checklist saved.');
      setDirty(false);
      onSaved(result.signoffChecklist);
    } catch (error) {
      setIssues(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save the checklist."));
    } finally {
      setSaving(false);
    }
  };

  const generalIssues = issues.filter((issue) => !/^items\[\d+\]/.test(issue.path ?? ''));

  return (
    <section
      className="space-y-3 rounded-xl border bg-card p-4"
      aria-labelledby="checklist-heading"
    >
      <UnsavedChangesDialog isDirty={dirty} />
      <div>
        <h3 id="checklist-heading" className="text-lg font-semibold">
          In-person sign-off checklist
        </h3>
        <p className="text-sm text-muted-foreground">
          After the online part, a supervisor ticks each item with the member present. Machine
          trainings need at least one item before they can be published.
        </p>
      </div>

      {rows.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}

      <ol className="space-y-3">
        {rows.map((row, index) => {
          const labelError = labelProblem(row, index);
          const keyError = keyProblem(row, index);
          return (
            <li key={row.uid} className="space-y-2 rounded-lg bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* On phones the text box takes a full line; the buttons wrap onto the next one */}
                <div className="flex min-w-0 basis-full items-center gap-2 md:flex-1 md:basis-auto">
                  <span className="w-6 shrink-0 text-sm text-muted-foreground">{index + 1}.</span>
                  <input
                    type="text"
                    value={row.label}
                    onChange={(event) => setLabel(row.uid, event.target.value)}
                    aria-label={`Checklist item ${index + 1}`}
                    placeholder="Shows where the emergency stop is"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-base md:h-8 md:text-sm"
                  />
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 md:size-8"
                    aria-label={`Move item ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 md:size-8"
                    aria-label={`Move item ${index + 1} down`}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 md:size-8"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => update(rows.filter((r) => r.uid !== row.uid))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-8 text-sm text-muted-foreground md:text-xs">
                <label htmlFor={`checklist-key-${row.uid}`}>Key</label>
                <input
                  id={`checklist-key-${row.uid}`}
                  type="text"
                  value={row.key}
                  onChange={(event) =>
                    update(
                      rows.map((r) =>
                        r.uid === row.uid ? { ...r, key: event.target.value, keyTouched: true } : r,
                      ),
                    )
                  }
                  className="h-11 w-40 max-w-full rounded-md border border-input bg-transparent px-2 font-mono text-base md:h-7 md:text-xs"
                />
              </div>
              {(labelError || keyError) && (
                <p role="alert" className="pl-8 text-xs text-destructive">
                  {labelError ?? keyError}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <ErrorNote
        message={
          generalIssues.length > 0
            ? generalIssues.map((issue) => issue.message).join(' ')
            : issues.length === 0
              ? failure
              : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-0"
          disabled={rows.length >= 50}
          onClick={() => {
            const taken = new Set(rows.map((r) => r.key));
            update([
              ...rows,
              { uid: nextUid++, label: '', key: checklistKey('', taken), keyTouched: false },
            ]);
          }}
        >
          <Plus /> Add an item
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-h-11 md:min-h-0"
          disabled={!dirty || saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving...' : 'Save checklist'}
        </Button>
      </div>
    </section>
  );
}
