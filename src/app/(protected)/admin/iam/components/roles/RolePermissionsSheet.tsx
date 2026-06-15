'use client';

import { iamApi } from '@/api/client/iam';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { LOCKED_ROLE_KEYS, PERMISSION_CATALOG, PERMISSIONS } from '@/constants/permissions';
import { useUser } from '@/providers/user-provider';
import type { IamRole } from '@/types/iam';
import { hasPermission } from '@/types/user';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface RolePermissionsSheetProps {
  role: IamRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RESOURCE_LABELS: Record<string, string> = {
  users: 'Users',
  jobs: 'Jobs',
  files: 'Files',
  invitations: 'Invitations',
  sessions: 'Sessions',
  iam: 'IAM',
  audit: 'Audit',
};

type ScopeKey = 'own' | 'any';

export function RolePermissionsSheet({ role, open, onOpenChange }: RolePermissionsSheetProps) {
  const user = useUser();
  const isLocked = (LOCKED_ROLE_KEYS as readonly string[]).includes(role.roleKey);
  const canEdit = hasPermission(user, PERMISSIONS.IAM_ASSIGN_PERMISSIONS) && !isLocked;

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Map of permissionKey → scopeKey for currently saved permissions
  const [assignedPerms, setAssignedPerms] = useState<Map<string, ScopeKey>>(new Map());
  // Map of permissionKey → scopeKey being edited
  const [editingPerms, setEditingPerms] = useState<Map<string, ScopeKey>>(new Map());

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const perms = await iamApi.listRolePermissions(role.id);
        if (cancelled) return;
        const map = new Map(perms.map((p) => [p.key, p.scopeKey as ScopeKey]));
        setAssignedPerms(map);
        setEditingPerms(new Map(map));
      } catch {
        if (!cancelled) toast.error('Failed to load permissions.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, role.id]);

  const handleEdit = () => {
    setEditingPerms(new Map(assignedPerms));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingPerms(new Map(assignedPerms));
    setIsEditing(false);
  };

  const handleToggle = (key: string, checked: boolean) => {
    setEditingPerms((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(key, 'any');
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleScopeChange = (key: string, scope: ScopeKey) => {
    setEditingPerms((prev) => {
      const next = new Map(prev);
      next.set(key, scope);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await iamApi.replaceRolePermissions(role.id, {
        permissions: Array.from(editingPerms.entries()).map(([permissionKey, scopeKey]) => ({
          permissionKey: permissionKey as (typeof PERMISSION_CATALOG)[number]['key'],
          scopeKey,
        })),
      });
      setAssignedPerms(new Map(editingPerms));
      setIsEditing(false);
      toast.success('Permissions updated.');
    } catch {
      toast.error('Failed to save permissions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const groupedPermissions = PERMISSION_CATALOG.reduce<Record<string, typeof PERMISSION_CATALOG>>(
    (acc, perm) => {
      const group = acc[perm.resource] ?? [];
      group.push(perm);
      acc[perm.resource] = group;
      return acc;
    },
    {},
  );

  const activePerms = isEditing ? editingPerms : assignedPerms;

  const handleOpenChange = (next: boolean) => {
    if (!next) setIsEditing(false);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Permissions — {role.name}</SheetTitle>
          <SheetDescription>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{role.roleKey}</code>
            {role.isSystem && (
              <span className="ml-2 text-xs text-muted-foreground">(system role)</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource}>
                  <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {RESOURCE_LABELS[resource] ?? resource}
                  </h3>
                  <div className="space-y-2">
                    {perms.map((perm) => {
                      const scopeKey = activePerms.get(perm.key);
                      const isChecked = scopeKey !== undefined;
                      return (
                        <div key={perm.key} className="flex items-start gap-3">
                          <Checkbox
                            id={perm.key}
                            checked={isChecked}
                            disabled={!isEditing}
                            onCheckedChange={
                              isEditing ? (checked) => handleToggle(perm.key, !!checked) : undefined
                            }
                            className="mt-0.5"
                          />
                          <div className="flex flex-1 flex-col gap-0.5">
                            <label
                              htmlFor={perm.key}
                              className={`flex items-center gap-1.5 text-sm ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <span>{perm.description}</span>
                              {perm.isDangerous && (
                                <AlertTriangle
                                  className="h-3.5 w-3.5 text-amber-500"
                                  aria-label="Dangerous permission"
                                />
                              )}
                            </label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-muted-foreground">{perm.key}</code>
                              {isChecked && (
                                <span className="flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleScopeChange(perm.key, 'own')}
                                        className={`rounded px-1 transition-colors ${
                                          scopeKey === 'own'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        own
                                      </button>
                                      <span className="text-muted-foreground">/</span>
                                      <button
                                        type="button"
                                        onClick={() => handleScopeChange(perm.key, 'any')}
                                        className={`rounded px-1 transition-colors ${
                                          scopeKey === 'any'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        any
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">{scopeKey}</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : isLocked ? (
            <p className="text-xs text-muted-foreground">
              This is a system role. Permissions can only be changed at the database level.
            </p>
          ) : (
            canEdit && (
              <Button onClick={handleEdit} disabled={isLoading}>
                Edit Permissions
              </Button>
            )
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
