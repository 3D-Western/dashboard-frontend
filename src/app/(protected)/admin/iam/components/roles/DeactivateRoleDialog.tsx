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
import type { IamRole } from '@/types/iam';
import { toast } from 'sonner';

interface DeactivateRoleDialogProps {
  role: IamRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedRole: IamRole) => void;
}

export function DeactivateRoleDialog({
  role,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateRoleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isDeactivating = role.isActive;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (isDeactivating) {
        await iamApi.deactivateRole(role.id);
        const updated = { ...role, isActive: false };
        onSuccess?.(updated);
        toast.success(`Role "${role.name}" deactivated.`);
      } else {
        const updated = await iamApi.updateRole(role.id, { isActive: true });
        onSuccess?.(updated);
        toast.success(`Role "${role.name}" reactivated.`);
      }
      onOpenChange(false);
    } catch {
      toast.error(
        `Failed to ${isDeactivating ? 'deactivate' : 'reactivate'} role. Please try again.`,
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
            {isDeactivating ? 'Deactivate' : 'Reactivate'} Role
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDeactivating ? (
              <>
                Are you sure you want to deactivate <strong>{role.name}</strong>? Users and groups
                assigned to this role will lose its permissions.
              </>
            ) : (
              <>
                Reactivate <strong>{role.name}</strong>? Users and groups assigned to this role will
                regain its permissions.
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
