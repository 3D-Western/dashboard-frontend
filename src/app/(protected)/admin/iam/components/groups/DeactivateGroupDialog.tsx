'use client';

import { useState } from 'react';
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
import { iamApi } from '@/api/client/iam';
import type { IamGroup } from '@/types/iam';
import { toast } from 'sonner';

interface DeactivateGroupDialogProps {
  group: IamGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedGroup: IamGroup) => void;
}

export function DeactivateGroupDialog({
  group,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateGroupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isDeactivating = group.isActive;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (isDeactivating) {
        await iamApi.deactivateGroup(group.id);
        const updated = { ...group, isActive: false };
        onSuccess?.(updated);
        toast.success(`Group "${group.name}" deactivated.`);
      } else {
        const updated = await iamApi.updateGroup(group.id, { isActive: true });
        onSuccess?.(updated);
        toast.success(`Group "${group.name}" reactivated.`);
      }
      onOpenChange(false);
    } catch {
      toast.error(
        `Failed to ${isDeactivating ? 'deactivate' : 'reactivate'} group. Please try again.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeactivating ? 'Deactivate' : 'Reactivate'} Group
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDeactivating ? (
              <>
                Are you sure you want to deactivate <strong>{group.name}</strong>? Users in this
                group will lose the permissions inherited from its roles.
              </>
            ) : (
              <>
                Reactivate <strong>{group.name}</strong>? Users in this group will regain the
                permissions inherited from its roles.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={isDeactivating ? 'bg-destructive' : ''}
          >
            {isLoading
              ? isDeactivating
                ? 'Deactivating...'
                : 'Reactivating...'
              : isDeactivating
                ? 'Deactivate'
                : 'Reactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
