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
import { PERMISSION_CATALOG, PERMISSIONS } from '@/constants/permissions';
import { useUser } from '@/providers/user-provider';
import type { IamPermission, IamRole } from '@/types/iam';
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

export function RolePermissionsSheet({ role, open, onOpenChange }: RolePermissionsSheetProps) {
  const user = useUser();
  const canEdit = hasPermission(user, PERMISSIONS.IAM_ASSIGN_PERMISSIONS);

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assignedKeys, setAssignedKeys] = useState<Set<string>>(new Set());
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const perms = await iamApi.listRolePermissions(role.id);
        if (cancelled) return;
        const keys = new Set(perms.map((p) => p.key));
        setAssignedKeys(keys);
        setEditingKeys(new Set(keys));
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
    setEditingKeys(new Set(assignedKeys));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingKeys(new Set(assignedKeys));
    setIsEditing(false);
  };

  const handleToggle = (key: string, checked: boolean) => {
    setEditingKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await iamApi.replaceRolePermissions(role.id, {
        permissions: Array.from(editingKeys).map((key) => ({
          permissionKey: key as IamPermission['key'],
          scopeKey: 'global',
        })),
      });
      setAssignedKeys(new Set(editingKeys));
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

  const activeKeys = isEditing ? editingKeys : assignedKeys;

  const handleOpenChange = (next: boolean) => {
    if (!next) setIsEditing(false);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Permissions — {role.name}</SheetTitle>
          <SheetDescription>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{role.roleKey}</code>
            {role.isSystem && (
              <span className="ml-2 text-xs text-muted-foreground">(system role)</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
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
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {RESOURCE_LABELS[resource] ?? resource}
                  </h3>
                  <div className="space-y-2">
                    {perms.map((perm) => {
                      const isChecked = activeKeys.has(perm.key);
                      return (
                        <div key={perm.key} className="flex items-start gap-3">
                          {isEditing ? (
                            <Checkbox
                              id={perm.key}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleToggle(perm.key, !!checked)}
                              className="mt-0.5"
                            />
                          ) : (
                            <div
                              className={`mt-0.5 h-4 w-4 rounded-sm border ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/40'} flex items-center justify-center`}
                              aria-hidden="true"
                            >
                              {isChecked && (
                                <svg
                                  className="h-3 w-3 text-primary-foreground"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                >
                                  <path
                                    d="M2 6l3 3 5-5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                          )}
                          <label
                            htmlFor={isEditing ? perm.key : undefined}
                            className={`flex flex-col gap-0.5 ${isEditing ? 'cursor-pointer' : ''}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{perm.description}</span>
                              {perm.isDangerous && (
                                <AlertTriangle
                                  className="h-3.5 w-3.5 text-amber-500"
                                  aria-label="Dangerous permission"
                                />
                              )}
                            </div>
                            <code className="text-xs text-muted-foreground">{perm.key}</code>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
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
