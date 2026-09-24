'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AccountStatus, AdminUserProfile } from '@/types/user';
import { userApi } from '@/api/client/user';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { AccountStatusBadge } from '@/components/AccountStatusBadge';
import { Loader2 } from 'lucide-react';

const ACCOUNT_STATUSES: AccountStatus[] = ['Active', 'Locked', 'Suspended', 'Banned'];

interface ChangeAccountStatusDialogProps {
  user: AdminUserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged?: (studentId: number, updated: AdminUserProfile) => void;
}

export function ChangeAccountStatusDialog({
  user,
  open,
  onOpenChange,
  onStatusChanged,
}: ChangeAccountStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ChangeAccountStatusDialogContent
          user={user}
          onOpenChange={onOpenChange}
          onStatusChanged={onStatusChanged}
        />
      ) : null}
    </Dialog>
  );
}

type ChangeAccountStatusDialogContentProps = Omit<ChangeAccountStatusDialogProps, 'open'>;

function ChangeAccountStatusDialogContent({
  user,
  onOpenChange,
  onStatusChanged,
}: ChangeAccountStatusDialogContentProps) {
  const [selectedStatus, setSelectedStatus] = useState<AccountStatus>(user.accountStatus);
  const [reason, setReason] = useState(user.accountStatusReason ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBannedConfirm, setShowBannedConfirm] = useState(false);

  const fullName = `${user.firstName} ${user.lastName}`;

  const submit = async () => {
    setIsUpdating(true);
    try {
      const updated = await userApi.updateAccountStatus(
        user.studentId,
        selectedStatus,
        selectedStatus === 'Active' ? undefined : reason,
      );

      toast.success('Account status updated', {
        description: `${fullName}'s account status changed to ${selectedStatus}.`,
      });

      onStatusChanged?.(user.studentId, updated);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update account status:', error);
      toast.error('Failed to update account status', {
        description:
          error instanceof Error ? error.message : 'An error occurred while updating the status',
      });
    } finally {
      setIsUpdating(false);
      setShowBannedConfirm(false);
    }
  };

  const handleConfirm = () => {
    if (selectedStatus === user.accountStatus) {
      onOpenChange(false);
      return;
    }

    if (selectedStatus === 'Banned') {
      setShowBannedConfirm(true);
      return;
    }

    void submit();
  };

  const handleCancel = () => {
    setSelectedStatus(user.accountStatus);
    setReason(user.accountStatusReason ?? '');
    onOpenChange(false);
  };

  return (
    <>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Account Status</DialogTitle>
          <DialogDescription>
            Update the account status for <strong>{fullName}</strong> (Student ID:{' '}
            {user.studentId})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div>
              <AccountStatusBadge status={user.accountStatus} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-status-select">New Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as AccountStatus)}
            >
              <SelectTrigger id="account-status-select">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStatus !== 'Active' && (
              <p className="text-muted-foreground text-sm">
                This will immediately sign the user out of all active sessions.
              </p>
            )}
          </div>

          {selectedStatus !== 'Active' && (
            <div className="space-y-2">
              <Label htmlFor="account-status-reason">Reason (optional)</Label>
              <Textarea
                id="account-status-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this account's status changing?"
                maxLength={1000}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isUpdating || selectedStatus === user.accountStatus}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showBannedConfirm} onOpenChange={setShowBannedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will blacklist <strong>{fullName}</strong>&apos;s account and immediately sign
              them out of all active sessions. This is the most severe account status and should
              be used carefully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={submit}
              disabled={isUpdating}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {isUpdating ? 'Banning...' : 'Ban Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
