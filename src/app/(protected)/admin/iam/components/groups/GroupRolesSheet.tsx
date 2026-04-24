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
import { PERMISSIONS } from '@/constants/permissions';
import { useUser } from '@/providers/user-provider';
import type { IamGroup, IamRole } from '@/types/iam';
import { hasPermission } from '@/types/user';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface GroupRolesSheetProps {
  group: IamGroup;
  allRoles: IamRole[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupRolesSheet({ group, allRoles, open, onOpenChange }: GroupRolesSheetProps) {
  const user = useUser();
  const canEdit = hasPermission(user, PERMISSIONS.IAM_MANAGE_GROUPS) && !group.isSystem;

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assignedRoleIds, setAssignedRoleIds] = useState<Set<number>>(new Set());
  const [editingRoleIds, setEditingRoleIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const loadedRoles = await iamApi.listGroupRoles(group.id);
        if (cancelled) return;
        const ids = new Set(loadedRoles.map((r) => r.id));
        setAssignedRoleIds(ids);
        setEditingRoleIds(new Set(ids));
      } catch {
        if (!cancelled) toast.error('Failed to load group roles.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, group.id]);

  const handleEdit = () => {
    setEditingRoleIds(new Set(assignedRoleIds));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingRoleIds(new Set(assignedRoleIds));
    setIsEditing(false);
  };

  const handleToggle = (roleId: number, checked: boolean) => {
    setEditingRoleIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toAssign = [...editingRoleIds].filter((id) => !assignedRoleIds.has(id));
      const toRevoke = [...assignedRoleIds].filter((id) => !editingRoleIds.has(id));

      await Promise.all([
        ...toAssign.map((id) => iamApi.assignGroupRole(group.id, id)),
        ...toRevoke.map((id) => iamApi.revokeGroupRole(group.id, id)),
      ]);

      setAssignedRoleIds(new Set(editingRoleIds));
      setIsEditing(false);
      toast.success('Group roles updated.');
    } catch {
      toast.error('Failed to save group roles. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setIsEditing(false);
    onOpenChange(next);
  };

  const activeIds = isEditing ? editingRoleIds : assignedRoleIds;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Roles — {group.name}</SheetTitle>
          <SheetDescription>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{group.groupKey}</code>
            {group.isSystem && (
              <span className="ml-2 text-xs text-muted-foreground">(system group)</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : allRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles available.</p>
          ) : (
            <div className="space-y-2">
              {allRoles.map((role) => {
                const isChecked = activeIds.has(role.id);
                return (
                  <div key={role.id} className="flex items-start gap-3 rounded-md border p-3">
                    {isEditing ? (
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleToggle(role.id, !!checked)}
                        className="mt-0.5"
                      />
                    ) : (
                      <div
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/40'} flex items-center justify-center`}
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
                      htmlFor={isEditing ? `role-${role.id}` : undefined}
                      className={`flex flex-col gap-0.5 ${isEditing ? 'cursor-pointer' : ''}`}
                    >
                      <span className="text-sm font-medium">{role.name}</span>
                      <code className="text-xs text-muted-foreground">{role.roleKey}</code>
                      {role.description && (
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      )}
                    </label>
                  </div>
                );
              })}
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
                Edit Roles
              </Button>
            )
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
