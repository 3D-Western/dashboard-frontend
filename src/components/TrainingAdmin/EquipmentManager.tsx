'use client';

import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
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
import { useAdminResource } from '@/hooks/useAdminResource';
import { adminErrorMessage, issuesFor, issuesFromError } from '@/lib/training-admin-errors';
import { SLUG_HELP, SLUG_PATTERN, slugify } from '@/lib/training-admin-format';
import type { EquipmentGroup, Machine } from '@/types/training-admin';
import { CheckField, SelectField, TextAreaField, TextField } from './fields';
import { ErrorNote, LoadState, ServerProblems } from './feedback';

type Editing =
  | { kind: 'group'; group: EquipmentGroup | null }
  | { kind: 'machine'; machine: Machine | null; groupId?: number };

/** /admin/training/equipment: groups of machines, and the machines in them. */
export function EquipmentManager() {
  const loadGroups = useCallback(() => trainingAdminAPI.listGroups(), []);
  const loadMachines = useCallback(() => trainingAdminAPI.listMachines(), []);
  const groups = useAdminResource(loadGroups);
  const machines = useAdminResource(loadMachines);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reloadAll = async () => {
    await Promise.all([groups.reload(), machines.reload()]);
  };

  const toggleGroup = async (group: EquipmentGroup) => {
    setActionError(null);
    try {
      await trainingAdminAPI.updateGroup(group.id, {
        slug: group.slug,
        name: group.name,
        description: group.description,
        active: !group.active,
      });
      await reloadAll();
    } catch (error) {
      setActionError(adminErrorMessage(error, "We couldn't change that group."));
    }
  };

  const toggleMachine = async (machine: Machine) => {
    setActionError(null);
    try {
      await trainingAdminAPI.updateMachine(machine.id, {
        slug: machine.slug,
        name: machine.name,
        equipmentGroupId: machine.equipmentGroupId,
        location: machine.location,
        active: !machine.active,
      });
      await reloadAll();
    } catch (error) {
      setActionError(adminErrorMessage(error, "We couldn't change that machine."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          A group is a kind of equipment (for example, laser cutters). An equipment training belongs
          to one group, and the machines in it are covered by that training. Deactivating hides a
          group or machine from new trainings without deleting its history.
        </p>
        <Button type="button" onClick={() => setEditing({ kind: 'group', group: null })}>
          <Plus /> Add a group
        </Button>
      </div>

      <ErrorNote message={actionError} />

      <LoadState
        isLoading={groups.isLoading || machines.isLoading}
        error={groups.error ?? machines.error}
        hasData={!!groups.data && !!machines.data}
        onRetry={() => void reloadAll()}
        what="the equipment"
      >
        {groups.data && machines.data && groups.data.length === 0 && (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            There are no equipment groups yet. Add one, then add its machines.
          </p>
        )}
        <ul className="space-y-4">
          {groups.data?.map((group) => {
            const inGroup = (machines.data ?? []).filter((m) => m.equipmentGroupId === group.id);
            return (
              <li key={group.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                      {group.name}
                      {!group.active && <Badge variant="outline">Inactive</Badge>}
                    </h2>
                    <p className="font-mono text-xs text-muted-foreground">{group.slug}</p>
                    {group.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing({ kind: 'group', group })}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void toggleGroup(group)}
                    >
                      {group.active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {inGroup.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No machines in this group yet.</p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {inGroup.map((machine) => (
                        <li
                          key={machine.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-3"
                        >
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-medium">
                              {machine.name}
                              {!machine.active && <Badge variant="outline">Inactive</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {machine.location ? `${machine.location} · ` : ''}
                              <span className="font-mono">{machine.slug}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`Edit ${machine.name}`}
                              onClick={() => setEditing({ kind: 'machine', machine })}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`${machine.active ? 'Deactivate' : 'Reactivate'} ${machine.name}`}
                              onClick={() => void toggleMachine(machine)}
                            >
                              {machine.active ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing({ kind: 'machine', machine: null, groupId: group.id })
                    }
                  >
                    <Plus /> Add a machine to {group.name}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </LoadState>

      {editing?.kind === 'group' && (
        <GroupDialog
          group={editing.group}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reloadAll();
          }}
        />
      )}
      {editing?.kind === 'machine' && (
        <MachineDialog
          machine={editing.machine}
          groups={groups.data ?? []}
          defaultGroupId={editing.groupId}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reloadAll();
          }}
        />
      )}
    </div>
  );
}

function GroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group: EquipmentGroup | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [slug, setSlug] = useState(group?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!group);
  const [description, setDescription] = useState(group?.description ?? '');
  const [active, setActive] = useState(group?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const slugError = slug && !SLUG_PATTERN.test(slug) ? SLUG_HELP : null;
  const canSave = name.trim() !== '' && slug !== '' && !slugError && !saving;

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setProblems([]);
    const body = {
      slug,
      name: name.trim(),
      description: description.trim() || null,
      active,
    };
    try {
      if (group) await trainingAdminAPI.updateGroup(group.id, body);
      else await trainingAdminAPI.createGroup(body);
      toast.success(group ? 'Group saved.' : 'Group added.');
      await onSaved();
    } catch (error) {
      setProblems(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save that group."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit group' : 'Add an equipment group'}</DialogTitle>
          <DialogDescription>
            A kind of equipment, such as laser cutters or 3D printers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            label="Name"
            value={name}
            onValueChange={(value) => {
              setName(value);
              if (!slugTouched) setSlug(slugify(value));
            }}
            error={issuesFor(problems, 'name').map((p) => p.message)}
          />
          <TextField
            label="Short name for links (slug)"
            value={slug}
            onValueChange={(value) => {
              setSlugTouched(true);
              setSlug(value);
            }}
            help={SLUG_HELP}
            error={[slugError, ...issuesFor(problems, 'slug').map((p) => p.message)].filter(
              (m): m is string => !!m,
            )}
          />
          <TextAreaField
            label="Description (optional)"
            value={description}
            onValueChange={setDescription}
            rows={3}
          />
          <CheckField
            label="Active"
            checked={active}
            onCheckedChange={setActive}
            help="Inactive groups are hidden when creating new trainings."
          />
          <ServerProblems issues={problems} failure={failure} claimedFields={['name', 'slug']} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MachineDialog({
  machine,
  groups,
  defaultGroupId,
  onClose,
  onSaved,
}: {
  machine: Machine | null;
  groups: EquipmentGroup[];
  defaultGroupId?: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(machine?.name ?? '');
  const [slug, setSlug] = useState(machine?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!machine);
  const [groupId, setGroupId] = useState(
    String(machine?.equipmentGroupId ?? defaultGroupId ?? groups[0]?.id ?? ''),
  );
  const [location, setLocation] = useState(machine?.location ?? '');
  const [active, setActive] = useState(machine?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const slugError = slug && !SLUG_PATTERN.test(slug) ? SLUG_HELP : null;
  const canSave = name.trim() !== '' && slug !== '' && !slugError && groupId !== '' && !saving;

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setProblems([]);
    const body = {
      slug,
      name: name.trim(),
      equipmentGroupId: Number(groupId),
      location: location.trim() || null,
      active,
    };
    try {
      if (machine) await trainingAdminAPI.updateMachine(machine.id, body);
      else await trainingAdminAPI.createMachine(body);
      toast.success(machine ? 'Machine saved.' : 'Machine added.');
      await onSaved();
    } catch (error) {
      setProblems(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save that machine."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{machine ? 'Edit machine' : 'Add a machine'}</DialogTitle>
          <DialogDescription>One physical machine, belonging to a group.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            label="Name"
            value={name}
            onValueChange={(value) => {
              setName(value);
              if (!slugTouched) setSlug(slugify(value));
            }}
            error={issuesFor(problems, 'name').map((p) => p.message)}
          />
          <TextField
            label="Short name for links (slug)"
            value={slug}
            onValueChange={(value) => {
              setSlugTouched(true);
              setSlug(value);
            }}
            help={SLUG_HELP}
            error={[slugError, ...issuesFor(problems, 'slug').map((p) => p.message)].filter(
              (m): m is string => !!m,
            )}
          />
          <SelectField
            label="Group"
            value={groupId}
            onValueChange={setGroupId}
            options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
            placeholder="Choose a group"
            error={issuesFor(problems, 'equipmentGroupId').map((p) => p.message)}
          />
          <TextField
            label="Location (optional)"
            value={location}
            onValueChange={setLocation}
            help="For example, Sabourin."
          />
          <CheckField
            label="Active"
            checked={active}
            onCheckedChange={setActive}
            help="Inactive machines are hidden, but their history is kept."
          />
          <ServerProblems
            issues={problems}
            failure={failure}
            claimedFields={['name', 'slug', 'equipmentGroupId']}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save machine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
